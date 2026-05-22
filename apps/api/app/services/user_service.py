"""User CRUD service with RBAC and audit logging."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.audit_log import AuditLog
from app.models.enums import UserRole, UserStatus
from app.models.user import User
from app.models.account_invitation import AccountInvitation
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.email_service import EmailService


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Read helpers
    # ------------------------------------------------------------------

    def get_by_id(self, user_id: uuid.UUID) -> User:
        user = self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    def list_users(
        self,
        *,
        role: UserRole | None = None,
        manager_id: uuid.UUID | None = None,
        status_filter: UserStatus | None = None,
        department: str | None = None,
        actor: User | None = None,
    ) -> list[User]:
        q = self.db.query(User)

        # Access Control:
        if actor:
            if actor.role == UserRole.MANAGER:
                # Managers only see their direct reports + themselves
                from sqlalchemy import or_
                q = q.filter(or_(User.manager_id == actor.id, User.id == actor.id))
            elif actor.role in (UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE):
                # Non-management roles only see themselves
                q = q.filter(User.id == actor.id)
            # ADMIN and HR_OPERATIONS see everyone (no filter applied)

        if role:
            q = q.filter(User.role == role)
        if manager_id:
            q = q.filter(User.manager_id == manager_id)
        if status_filter:
            q = q.filter(User.status == status_filter)
        if department:
            q = q.filter(User.department == department)

        return q.order_by(User.full_name).all()

    # ------------------------------------------------------------------
    # Write helpers
    # ------------------------------------------------------------------

    def create_user(self, payload: UserCreate, actor: User) -> tuple[User, str | None, bool, str | None]:
        # Define role hierarchy — who can create whom
        ROLE_CREATION_RULES: dict[UserRole, list[UserRole]] = {
            UserRole.ADMIN: list(UserRole),  # Admin can create any role
            UserRole.HR_OPERATIONS: [
                UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE, UserRole.TEAM_LEAD
            ],
            UserRole.MANAGER: [UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE],
        }
        allowed_roles = ROLE_CREATION_RULES.get(actor.role, [])
        if payload.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your role ({actor.role.value}) cannot create users with role '{payload.role.value}'",
            )

        existing = self.db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )

        # Validate manager_id if provided
        if payload.manager_id:
            manager = self.db.get(User, payload.manager_id)
            if not manager or manager.role not in (
                UserRole.MANAGER, UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.HR_OPERATIONS
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid manager_id — user does not exist or lacks a management role",
                )

        is_invite = payload.password is None
        status_val = UserStatus.INVITED if is_invite else UserStatus.ACTIVE

        user = User(
            full_name=payload.full_name,
            email=payload.email,
            password_hash=hash_password(payload.password) if payload.password else "!",
            role=payload.role,
            department=payload.department,
            department_id=payload.department_id,
            shift_id=payload.shift_id,
            designation=payload.designation,
            manager_id=payload.manager_id,
            status=status_val,
            created_by=actor.id,
        )
        self.db.add(user)
        self.db.flush()  # populate user.id before audit log

        self._write_audit(
            actor=actor,
            action="USER_INVITED" if is_invite else "USER_CREATED",
            entity_id=user.id,
            new_value={"email": user.email, "role": user.role.value},
        )

        token = None
        email_sent = True
        email_error = None
        if is_invite:
            token, email_sent, email_error = self.send_invitation(user, actor)

        self.db.commit()
        self.db.refresh(user)
        return user, token, email_sent, email_error

    def send_invitation(self, user: User, actor: User) -> tuple[str, bool, str | None]:
        """Generate an invitation token and send the email."""
        import secrets
        import hashlib
        import logging
        from datetime import datetime, timedelta, timezone
        from app.core.config import settings

        logger = logging.getLogger(__name__)

        # Invalidate old tokens
        self.db.query(AccountInvitation).filter(
            AccountInvitation.user_id == user.id,
            AccountInvitation.is_used == False
        ).update({"is_used": True})

        # Create new token
        raw_token = secrets.token_urlsafe(48)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        
        # Enforce 24-hour expiry limit
        invitation = AccountInvitation(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
        )
        self.db.add(invitation)
        self.db.flush()

        email_sent = True
        email_error = None

        if not settings.smtp_host:
            logger.warning("SMTP_HOST not configured. invitation email was mocked (not actually sent).")
            email_sent = False
            email_error = "SMTP not configured"
            self._write_audit(
                actor=actor,
                action="INVITE_EMAIL_FAILED",
                entity_id=user.id,
                new_value={"email": user.email, "error": "SMTP not configured"}
            )
        else:
            try:
                EmailService.send_account_invitation(
                    user=user,
                    token=raw_token,
                    created_by_name=actor.full_name
                )
                self._write_audit(
                    actor=actor,
                    action="INVITE_EMAIL_SENT",
                    entity_id=user.id,
                    new_value={"email": user.email}
                )
            except Exception as e:
                logger.error(f"Failed to send invitation email: {e}", exc_info=True)
                self._write_audit(
                    actor=actor,
                    action="INVITE_EMAIL_FAILED",
                    entity_id=user.id,
                    new_value={"email": user.email, "error": str(e)}
                )
                email_sent = False
                email_error = str(e)

        return raw_token, email_sent, email_error

    def resend_invitation(self, user_id: uuid.UUID, actor: User) -> tuple[str, bool, str | None]:
        """Resend an invitation to a user. Only if status is INVITED."""
        user = self.get_by_id(user_id)
        if user.status != UserStatus.INVITED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only resend invitations to users in 'INVITED' status"
            )
        
        # Check permissions: only admins or the person who created the user (or manager)
        if actor.role != UserRole.ADMIN and actor.id != user.created_by:
             # Managers can resend for their reports, but only if they are allowed to create that role
             ROLE_CREATION_RULES = {
                 UserRole.HR_OPERATIONS: [UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE, UserRole.TEAM_LEAD],
                 UserRole.MANAGER: [UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE],
             }
             allowed_roles = ROLE_CREATION_RULES.get(actor.role, [])
             
             if actor.role == UserRole.MANAGER and user.manager_id == actor.id and user.role in allowed_roles:
                 pass
             elif actor.role == UserRole.HR_OPERATIONS and user.role in allowed_roles:
                 pass
             else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to resend this invitation"
                )

        token, email_sent, email_error = self.send_invitation(user, actor)
        self.db.commit()
        return token, email_sent, email_error

    def update_user(self, user_id: uuid.UUID, payload: UserUpdate, actor: User) -> User:
        user = self.get_by_id(user_id)

        # Employees can only update their own profile (limited fields)
        if actor.role == UserRole.EMPLOYEE and actor.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employees can only update their own profile",
            )

        # Only admin/HR can change roles
        if payload.role is not None and actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and HR can change user roles",
            )

        # Prevent privilege escalation: no one can assign a role higher than their own
        ROLE_HIERARCHY = [
            UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE, UserRole.EMPLOYEE,
            UserRole.TEAM_LEAD, UserRole.MANAGER, UserRole.HR_OPERATIONS, UserRole.ADMIN
        ]
        if payload.role is not None and actor.role != UserRole.ADMIN:
            actor_level = ROLE_HIERARCHY.index(actor.role) if actor.role in ROLE_HIERARCHY else -1
            target_level = ROLE_HIERARCHY.index(payload.role) if payload.role in ROLE_HIERARCHY else -1
            if target_level >= actor_level:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot assign a role equal to or higher than your own",
                )

        old_snapshot = {"role": user.role.value, "status": user.status.value, "manager_id": str(user.manager_id)}

        changed = payload.model_dump(exclude_unset=True)
        for field, value in changed.items():
            setattr(user, field, value)

        self._write_audit(
            actor=actor,
            action="USER_UPDATED",
            entity_id=user.id,
            old_value=old_snapshot,
            new_value=changed,
        )

        self.db.commit()
        self.db.refresh(user)
        return user

    def deactivate_user(self, user_id: uuid.UUID, actor: User) -> User:
        user = self.get_by_id(user_id)
        if user.status == UserStatus.INACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="User is already inactive"
            )
        user.status = UserStatus.INACTIVE
        self._write_audit(
            actor=actor,
            action="USER_DEACTIVATED",
            entity_id=user.id,
            old_value={"status": user.status.value},
            new_value={"status": "inactive"},
        )
        self.db.commit()
        self.db.refresh(user)
        return user

    def suspend_user(self, user_id: uuid.UUID, actor: User, reason: str | None = None) -> User:
        """Suspend a user account. Only admin can suspend."""
        if actor.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can suspend users"
            )
        user = self.get_by_id(user_id)
        old_status = user.status.value
        user.status = UserStatus.SUSPENDED
        self._write_audit(
            actor=actor,
            action="USER_SUSPENDED",
            entity_id=user.id,
            old_value={"status": old_status},
            new_value={"status": "suspended", "reason": reason},
        )
        self.db.commit()
        self.db.refresh(user)
        return user

    def activate_user(self, user_id: uuid.UUID, actor: User) -> User:
        """Reactivate an inactive or suspended user."""
        if actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and HR can activate users"
            )
        user = self.get_by_id(user_id)
        old_status = user.status.value
        user.status = UserStatus.ACTIVE
        self._write_audit(
            actor=actor,
            action="USER_ACTIVATED",
            entity_id=user.id,
            old_value={"status": old_status},
            new_value={"status": "active"},
        )
        self.db.commit()
        self.db.refresh(user)
        return user

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _write_audit(
        self,
        *,
        actor: User,
        action: str,
        entity_id: uuid.UUID,
        old_value: dict | None = None,
        new_value: dict | None = None,
    ) -> None:
        log = AuditLog(
            actor_user_id=actor.id,
            action_type=action,
            entity_type="user",
            entity_id=entity_id,
            old_value=old_value,
            new_value=new_value,
        )
        self.db.add(log)

    def get_admin_user_profile(
        self,
        user_id: uuid.UUID,
        actor: User,
        start_date: str | None = None,
        end_date: str | None = None,
        limit: int = 50,
    ) -> dict:
        if actor.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can view full profile")

        user = self.get_by_id(user_id)
        from datetime import datetime, timedelta, timezone
        
        now = datetime.now(timezone.utc)
        if start_date:
            try:
                s_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except:
                s_date = now - timedelta(days=30)
        else:
            s_date = now - timedelta(days=30)
            
        if end_date:
            try:
                e_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except:
                e_date = now
        else:
            e_date = now

        if s_date.tzinfo is None: s_date = s_date.replace(tzinfo=timezone.utc)
        if e_date.tzinfo is None: e_date = e_date.replace(tzinfo=timezone.utc)

        from app.models.attendance_session import AttendanceSession
        from app.models.attendance_break import AttendanceBreak
        from app.models.leave_request import LeaveRequest
        from app.models.eod_report import EODReport
        from app.models.task import Task
        from app.models.time_log import TimeLog
        from app.models.project import Project
        from app.models.goal import Goal
        from app.models.personal_note import PersonalNote
        
        # Attendance
        att_sessions = self.db.query(AttendanceSession).filter(
            AttendanceSession.user_id == user_id,
            AttendanceSession.check_in_at >= s_date,
            AttendanceSession.check_in_at <= e_date
        ).order_by(AttendanceSession.check_in_at.desc()).all()
        
        att_session_ids = [s.id for s in att_sessions]
        breaks = []
        if att_session_ids:
            breaks = self.db.query(AttendanceBreak).filter(
                AttendanceBreak.attendance_session_id.in_(att_session_ids)
            ).order_by(AttendanceBreak.started_at.desc()).all()
        
        summary = {
            "total_check_ins": len(att_sessions),
            "late_check_ins": sum(1 for s in att_sessions if s.is_late_login),
            "early_checkouts": sum(1 for s in att_sessions if s.is_early_logout),
            "absences": 0,
            "total_worked_hours": sum((s.worked_minutes or 0) for s in att_sessions) / 60.0,
            "current_attendance_status": att_sessions[0].session_status.value if att_sessions else "inactive"
        }

        # Leaves
        leaves = self.db.query(LeaveRequest).filter(
            LeaveRequest.user_id == user_id,
            LeaveRequest.start_date >= s_date.date()
        ).order_by(LeaveRequest.start_date.desc()).all()

        # EODs
        eods = self.db.query(EODReport).filter(
            EODReport.user_id == user_id,
            EODReport.report_date >= s_date.date()
        ).order_by(EODReport.report_date.desc()).all()

        # Tasks
        tasks = self.db.query(Task).filter(Task.assigned_to == user_id).order_by(Task.created_at.desc()).limit(limit).all()

        # Time Logs
        time_logs = self.db.query(TimeLog).filter(
            TimeLog.user_id == user_id,
            TimeLog.started_at >= s_date
        ).order_by(TimeLog.started_at.desc()).limit(limit).all()

        # Projects
        from sqlalchemy import or_
        project_ids_from_tasks = list({t.project_id for t in tasks if t.project_id})
        if project_ids_from_tasks:
            projects = self.db.query(Project).filter(or_(Project.owner_id == user_id, Project.id.in_(project_ids_from_tasks))).order_by(Project.created_at.desc()).limit(limit).all()
        else:
            projects = self.db.query(Project).filter(Project.owner_id == user_id).order_by(Project.created_at.desc()).limit(limit).all()

        # Goals & Notes
        goals = self.db.query(Goal).filter(Goal.user_id == user_id).order_by(Goal.created_at.desc()).limit(limit).all()
        notes = self.db.query(PersonalNote).filter(PersonalNote.user_id == user_id).order_by(PersonalNote.note_date.desc()).limit(limit).all()
        
        timeline = []
        for a in att_sessions[:10]:
            timeline.append({"type": "attendance", "date": a.check_in_at.isoformat(), "title": f"Checked in ({a.work_mode.value})"})
            if a.check_out_at:
                timeline.append({"type": "attendance", "date": a.check_out_at.isoformat(), "title": "Checked out"})
        for b in breaks[:5]:
            timeline.append({"type": "break", "date": b.started_at.isoformat(), "title": f"Started break ({b.break_type.value})"})
        for l in leaves[:5]:
            timeline.append({"type": "leave", "date": l.created_at.isoformat(), "title": f"Leave requested ({l.leave_type.value})"})
        for e in eods[:5]:
            timeline.append({"type": "eod", "date": e.created_at.isoformat(), "title": "EOD Submitted"})
        for t in tasks[:5]:
            timeline.append({"type": "task", "date": t.created_at.isoformat(), "title": f"Assigned task: {t.title}"})
        for tl in time_logs[:5]:
            timeline.append({"type": "time_log", "date": tl.started_at.isoformat(), "title": f"Logged {tl.duration_minutes}m time"})
            
        timeline.sort(key=lambda x: x["date"], reverse=True)

        return {
            "profile": user,
            "attendance_summary": summary,
            "attendance_sessions": att_sessions,
            "breaks": breaks,
            "leave_requests": leaves,
            "eod_submissions": eods,
            "tasks": tasks,
            "time_logs": time_logs,
            "projects": projects,
            "goals": goals,
            "notes": notes,
            "activity_timeline": timeline[:limit]
        }
