"""Admin user lifecycle and access control service."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import check_permission, get_user_permissions
from app.core.permissions import ALL_PERMISSIONS
from app.models.audit_log import AuditLog
from app.models.department import Department
from app.models.enums import UserRole, UserStatus
from app.models.permission import RolePermission, UserPermissionOverride
from app.models.user import User
from app.schemas.admin_user import UserPermissionsUpdate

ADMIN_MANAGEMENT_ROLES = (UserRole.ADMIN, UserRole.HR_OPERATIONS)

PERMISSION_CATEGORIES: dict[str, str] = {
    "users.": "User Management",
    "attendance.": "Attendance",
    "leave.": "Leave",
    "projects.": "Projects & Tasks",
    "tasks.": "Projects & Tasks",
    "eod.": "EOD Reports",
    "reports.": "Analytics & Reports",
    "analytics.": "Analytics & Reports",
    "announcements.": "Organization",
    "holidays.": "Organization",
    "shifts.": "Organization",
    "departments.": "Organization",
    "audit.": "System",
    "permissions.": "System",
}

PERMISSION_LABELS: dict[str, str] = {key: desc for key, desc in ALL_PERMISSIONS}


def _permission_category(key: str) -> str:
    for prefix, category in PERMISSION_CATEGORIES.items():
        if key.startswith(prefix):
            return category
    return "System"


def _permission_item(key: str) -> dict:
    return {
        "key": key,
        "label": PERMISSION_LABELS.get(key, key.replace(".", " ").replace("_", " ").title()),
        "category": _permission_category(key),
        "description": PERMISSION_LABELS.get(key, ""),
    }


class AdminUserService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Access control
    # ------------------------------------------------------------------

    def assert_can_manage_users(self, actor: User) -> None:
        if actor.role in ADMIN_MANAGEMENT_ROLES:
            return
        if check_permission(actor, "users.edit", self.db):
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage users",
        )

    def assert_can_manage_roles(self, actor: User) -> None:
        if actor.role == UserRole.ADMIN:
            return
        if actor.role == UserRole.HR_OPERATIONS and check_permission(actor, "users.manage_roles", self.db):
            return
        if check_permission(actor, "users.manage_roles", self.db):
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to change user roles",
        )

    def assert_can_manage_permissions(self, actor: User) -> None:
        if actor.role == UserRole.ADMIN:
            return
        if not check_permission(actor, "permissions.manage", self.db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to manage user permissions",
            )

    def count_active_admins(self) -> int:
        return (
            self.db.query(User)
            .filter(
                User.role == UserRole.ADMIN,
                User.status.in_([UserStatus.ACTIVE, UserStatus.INVITED]),
            )
            .count()
        )

    def assert_last_admin_safe(
        self,
        actor: User,
        target: User,
        *,
        new_role: UserRole | None = None,
        new_status: UserStatus | None = None,
    ) -> None:
        if target.role != UserRole.ADMIN:
            return

        removing_admin = new_role is not None and new_role != UserRole.ADMIN
        deactivating = new_status in (UserStatus.INACTIVE, UserStatus.SUSPENDED)

        if not removing_admin and not deactivating:
            return

        active_admins = self.count_active_admins()
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove or deactivate the last administrator account",
            )

        if actor.id == target.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot downgrade or deactivate your own administrator account while you are the last admin",
            )

    def assert_self_lockout_safe(
        self,
        actor: User,
        target: User,
        *,
        new_role: UserRole | None = None,
        new_status: UserStatus | None = None,
    ) -> None:
        if actor.id != target.id:
            return

        if actor.role == UserRole.ADMIN:
            self.assert_last_admin_safe(actor, target, new_role=new_role, new_status=new_status)
            if new_role is not None and new_role != UserRole.ADMIN:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You cannot downgrade your own administrator role",
                )

        if new_status in (UserStatus.INACTIVE, UserStatus.SUSPENDED):
            if actor.role in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
                admin_like = (
                    self.db.query(User)
                    .filter(
                        User.role.in_([UserRole.ADMIN, UserRole.HR_OPERATIONS]),
                        User.status.in_([UserStatus.ACTIVE, UserStatus.INVITED]),
                        User.id != actor.id,
                    )
                    .count()
                )
                if admin_like == 0 and actor.role in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="You cannot deactivate your account while you are the only admin/HR operator",
                    )

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def get_user(self, user_id: uuid.UUID) -> User:
        user = self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    def get_user_with_relations(self, user_id: uuid.UUID) -> User:
        user = (
            self.db.query(User)
            .options(
                joinedload(User.dept),
                joinedload(User.shift),
                joinedload(User.manager),
            )
            .filter(User.id == user_id)
            .first()
        )
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    def validate_department(self, department_id: uuid.UUID | None) -> None:
        if department_id is None:
            return
        dept = self.db.get(Department, department_id)
        if not dept:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department not found")

    def validate_manager(self, user_id: uuid.UUID, manager_id: uuid.UUID | None) -> None:
        if manager_id is None:
            return
        if manager_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user cannot be their own reporting manager",
            )
        manager = self.db.get(User, manager_id)
        if not manager:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Manager not found")
        if manager.status not in (UserStatus.ACTIVE, UserStatus.INVITED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign an inactive manager",
            )
        if manager.role not in (
            UserRole.MANAGER,
            UserRole.ADMIN,
            UserRole.TEAM_LEAD,
            UserRole.HR_OPERATIONS,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected user does not have a management role",
            )
        self._assert_no_circular_reporting(user_id, manager_id)

    def _assert_no_circular_reporting(self, user_id: uuid.UUID, manager_id: uuid.UUID) -> None:
        visited: set[uuid.UUID] = set()
        current_id: uuid.UUID | None = manager_id
        while current_id is not None:
            if current_id == user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Circular reporting chain detected",
                )
            if current_id in visited:
                break
            visited.add(current_id)
            mgr = self.db.get(User, current_id)
            current_id = mgr.manager_id if mgr else None

    def _assert_role_assignment_allowed(self, actor: User, role: UserRole) -> None:
        ROLE_HIERARCHY = [
            UserRole.INTERN,
            UserRole.JUNIOR_EMPLOYEE,
            UserRole.EMPLOYEE,
            UserRole.TEAM_LEAD,
            UserRole.MANAGER,
            UserRole.HR_OPERATIONS,
            UserRole.ADMIN,
        ]
        if actor.role != UserRole.ADMIN:
            actor_level = ROLE_HIERARCHY.index(actor.role) if actor.role in ROLE_HIERARCHY else -1
            target_level = ROLE_HIERARCHY.index(role) if role in ROLE_HIERARCHY else -1
            if target_level >= actor_level:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot assign a role equal to or higher than your own",
                )

    # ------------------------------------------------------------------
    # Audit
    # ------------------------------------------------------------------

    def write_audit(
        self,
        *,
        actor: User,
        target_id: uuid.UUID,
        action: str,
        old_value: dict | None = None,
        new_value: dict | None = None,
    ) -> None:
        self.db.add(
            AuditLog(
                actor_user_id=actor.id,
                action_type=action,
                entity_type="user",
                entity_id=target_id,
                old_value=old_value,
                new_value=new_value,
            )
        )

    # ------------------------------------------------------------------
    # Mutations
    # ------------------------------------------------------------------

    def update_role(self, user_id: uuid.UUID, role: UserRole, actor: User) -> User:
        self.assert_can_manage_roles(actor)
        user = self.get_user(user_id)
        self.assert_last_admin_safe(actor, user, new_role=role)
        self.assert_self_lockout_safe(actor, user, new_role=role)
        self._assert_role_assignment_allowed(actor, role)

        old = {"role": user.role.value}
        user.role = role
        self.write_audit(actor=actor, target_id=user.id, action="user.role_changed", old_value=old, new_value={"role": role.value})
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_department(
        self,
        user_id: uuid.UUID,
        *,
        department_id: uuid.UUID | None = None,
        designation: str | None = None,
        clear_department: bool = False,
        actor: User,
    ) -> User:
        self.assert_can_manage_users(actor)
        user = self.get_user(user_id)

        old = {
            "department_id": str(user.department_id) if user.department_id else None,
            "designation": user.designation,
        }

        if clear_department:
            user.department_id = None
            user.department = None
        elif department_id is not None:
            self.validate_department(department_id)
            dept = self.db.get(Department, department_id)
            user.department_id = department_id
            user.department = dept.name if dept else user.department

        if designation is not None:
            user.designation = designation

        new = {
            "department_id": str(user.department_id) if user.department_id else None,
            "designation": user.designation,
        }
        self.write_audit(
            actor=actor,
            target_id=user.id,
            action="user.department_changed",
            old_value=old,
            new_value=new,
        )
        self.db.commit()
        return self.get_user_with_relations(user_id)

    def update_department_details(
        self,
        user_id: uuid.UUID,
        *,
        department_id: uuid.UUID | None,
        shift_id: uuid.UUID | None,
        manager_id: uuid.UUID | None,
        designation: str | None,
        actor: User,
    ) -> User:
        """Update department, shift, manager, and designation in one transaction."""
        self.assert_can_manage_users(actor)
        user = self.get_user(user_id)

        if department_id is not None:
            self.validate_department(department_id)
        if shift_id is not None:
            from app.models.shift import Shift

            shift = self.db.get(Shift, shift_id)
            if not shift:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shift not found")
        self.validate_manager(user_id, manager_id)

        old = {
            "department_id": str(user.department_id) if user.department_id else None,
            "shift_id": str(user.shift_id) if user.shift_id else None,
            "manager_id": str(user.manager_id) if user.manager_id else None,
            "designation": user.designation,
        }

        if department_id is not None:
            dept = self.db.get(Department, department_id)
            user.department_id = department_id
            user.department = dept.name if dept else user.department
        else:
            user.department_id = None
            user.department = None

        user.shift_id = shift_id
        user.manager_id = manager_id
        if designation is not None:
            user.designation = designation.strip() or None

        new = {
            "department_id": str(user.department_id) if user.department_id else None,
            "shift_id": str(user.shift_id) if user.shift_id else None,
            "manager_id": str(user.manager_id) if user.manager_id else None,
            "designation": user.designation,
        }
        self.write_audit(
            actor=actor,
            target_id=user.id,
            action="user.department_details_changed",
            old_value=old,
            new_value=new,
        )
        self.db.commit()
        return self.get_user_with_relations(user_id)

    def update_status(self, user_id: uuid.UUID, new_status: UserStatus, actor: User) -> User:
        self.assert_can_manage_users(actor)
        user = self.get_user(user_id)
        self.assert_last_admin_safe(actor, user, new_status=new_status)
        self.assert_self_lockout_safe(actor, user, new_status=new_status)

        if new_status == UserStatus.INACTIVE and actor.role not in (UserRole.ADMIN,) and not check_permission(
            actor, "users.deactivate", self.db
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can deactivate users")

        old = {"status": user.status.value}
        user.status = new_status
        self.write_audit(
            actor=actor,
            target_id=user.id,
            action="user.status_changed",
            old_value=old,
            new_value={"status": new_status.value},
        )
        self.db.commit()
        return self.get_user_with_relations(user_id)

    def update_reporting(
        self,
        user_id: uuid.UUID,
        *,
        manager_id: uuid.UUID | None = None,
        shift_id: uuid.UUID | None = None,
        designation: str | None = None,
        update_manager: bool = False,
        update_shift: bool = False,
        actor: User,
    ) -> User:
        self.assert_can_manage_users(actor)
        user = self.get_user(user_id)

        if update_manager:
            self.validate_manager(user_id, manager_id)

        if update_shift and shift_id is not None:
            from app.models.shift import Shift

            shift = self.db.get(Shift, shift_id)
            if not shift:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shift not found")

        old = {
            "manager_id": str(user.manager_id) if user.manager_id else None,
            "shift_id": str(user.shift_id) if user.shift_id else None,
            "designation": user.designation,
        }

        if update_manager:
            user.manager_id = manager_id
        if update_shift:
            user.shift_id = shift_id
        if designation is not None:
            user.designation = designation

        new = {
            "manager_id": str(user.manager_id) if user.manager_id else None,
            "shift_id": str(user.shift_id) if user.shift_id else None,
            "designation": user.designation,
        }
        self.write_audit(
            actor=actor,
            target_id=user.id,
            action="user.reporting_changed",
            old_value=old,
            new_value=new,
        )
        self.db.commit()
        return self.get_user_with_relations(user_id)

    def update_profile(
        self,
        user_id: uuid.UUID,
        *,
        full_name: str | None,
        email: str | None,
        phone: str | None,
        designation: str | None,
        actor: User,
    ) -> User:
        self.assert_can_manage_users(actor)
        user = self.get_user(user_id)

        old: dict = {}
        new: dict = {}

        if full_name is not None and full_name != user.full_name:
            old["full_name"] = user.full_name
            user.full_name = full_name
            new["full_name"] = full_name

        if email is not None and email.lower() != user.email.lower():
            existing = self.db.query(User).filter(User.email == email, User.id != user.id).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already in use")
            old["email"] = user.email
            user.email = email.lower()
            new["email"] = user.email

        if phone is not None and phone != user.phone:
            old["phone"] = user.phone
            user.phone = phone
            new["phone"] = phone

        if designation is not None and designation != user.designation:
            old["designation"] = user.designation
            user.designation = designation
            new["designation"] = designation

        if new:
            self.write_audit(
                actor=actor,
                target_id=user.id,
                action="user.profile_updated",
                old_value=old or None,
                new_value=new,
            )
            self.db.commit()
            self.db.refresh(user)
        return user

    # ------------------------------------------------------------------
    # Permissions
    # ------------------------------------------------------------------

    def get_permissions_detail(self, user_id: uuid.UUID, actor: User) -> dict:
        self.assert_can_manage_permissions(actor)
        user = self.get_user(user_id)

        role_perm_keys = {
            rp.permission_key
            for rp in self.db.query(RolePermission).filter(RolePermission.role == user.role.value).all()
        }
        overrides = (
            self.db.query(UserPermissionOverride)
            .filter(UserPermissionOverride.user_id == user.id)
            .all()
        )
        extra_grants = [o.permission_key for o in overrides if o.granted]
        extra_denies = [o.permission_key for o in overrides if not o.granted]
        resolved = get_user_permissions(user, self.db)

        return {
            "user_id": user.id,
            "role": user.role,
            "role_permissions": [_permission_item(k) for k in sorted(role_perm_keys)],
            "extra_permissions": [_permission_item(k) for k in sorted(extra_grants)],
            "denied_permissions": [_permission_item(k) for k in sorted(extra_denies)],
            "resolved_permissions": sorted(resolved),
        }

    def update_permissions(self, user_id: uuid.UUID, payload: UserPermissionsUpdate, actor: User) -> dict:
        self.assert_can_manage_permissions(actor)
        user = self.get_user(user_id)

        valid_keys = {k for k, _ in ALL_PERMISSIONS}
        for key in payload.extra_grants + payload.extra_denies:
            if key not in valid_keys:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unknown permission key: {key}",
                )

        high_risk = {"users.manage_roles", "users.manage_permissions", "permissions.manage"}
        if actor.role != UserRole.ADMIN:
            actor_perms = get_user_permissions(actor, self.db)
            for key in payload.extra_grants:
                if key in high_risk and key not in actor_perms:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"You cannot grant permission '{key}' that you do not have",
                    )

        old_overrides = (
            self.db.query(UserPermissionOverride)
            .filter(UserPermissionOverride.user_id == user.id)
            .all()
        )
        old_value = {
            "grants": sorted([o.permission_key for o in old_overrides if o.granted]),
            "denies": sorted([o.permission_key for o in old_overrides if not o.granted]),
        }

        self.db.query(UserPermissionOverride).filter(UserPermissionOverride.user_id == user.id).delete()

        for key in payload.extra_grants:
            self.db.add(
                UserPermissionOverride(user_id=user.id, permission_key=key, granted=True)
            )
        for key in payload.extra_denies:
            self.db.add(
                UserPermissionOverride(user_id=user.id, permission_key=key, granted=False)
            )

        new_value = {
            "grants": sorted(payload.extra_grants),
            "denies": sorted(payload.extra_denies),
        }
        self.write_audit(
            actor=actor,
            target_id=user.id,
            action="user.permissions_updated",
            old_value=old_value,
            new_value=new_value,
        )
        self.db.commit()
        return self.get_permissions_detail(user_id, actor)

    # ------------------------------------------------------------------
    # Security actions
    # ------------------------------------------------------------------

    def send_password_reset(self, user_id: uuid.UUID, actor: User) -> dict:
        self.assert_can_manage_users(actor)
        user = self.get_user(user_id)
        from app.services.auth_service import AuthService

        email_sent, email_error = AuthService(self.db).admin_send_password_reset(user, actor)
        self.write_audit(
            actor=actor,
            target_id=user.id,
            action="user.password_reset_sent",
            new_value={"email": user.email, "email_sent": email_sent},
        )
        self.db.commit()
        return {
            "message": "Password reset link sent to user's email"
            if email_sent
            else "Password reset token created but email could not be sent",
            "email_sent": email_sent,
            "email_error": email_error,
        }

    def force_password_reset(self, user_id: uuid.UUID, actor: User) -> dict:
        result = self.send_password_reset(user_id, actor)
        user = self.get_user(user_id)
        self.write_audit(
            actor=actor,
            target_id=user.id,
            action="user.force_password_reset",
            new_value={"email": user.email},
        )
        self.db.commit()
        result["message"] = (
            "User must reset password via the emailed link"
            if result["email_sent"]
            else result["message"]
        )
        return result

    def resend_invitation(self, user_id: uuid.UUID, actor: User) -> dict:
        from app.services.user_service import UserService

        token, email_sent, email_error = UserService(self.db).resend_invitation(user_id, actor=actor)
        user = self.get_user(user_id)
        self.write_audit(
            actor=actor,
            target_id=user.id,
            action="user.invitation_resent",
            new_value={"email": user.email, "email_sent": email_sent},
        )
        self.db.commit()
        return {
            "message": "Setup link sent to user's email"
            if email_sent
            else "Invitation could not be sent. Check SMTP configuration.",
            "email_sent": email_sent,
            "email_error": email_error,
        }

    # ------------------------------------------------------------------
    # Read-only summaries
    # ------------------------------------------------------------------

    def get_audit_logs(self, user_id: uuid.UUID, actor: User, limit: int = 100) -> list[AuditLog]:
        self.assert_can_manage_users(actor)
        self.get_user(user_id)
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.entity_type == "user", AuditLog.entity_id == user_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_admin_summary(self, user_id: uuid.UUID, actor: User) -> dict:
        self.assert_can_manage_users(actor)
        user = self.get_user(user_id)

        from app.models.attendance_session import AttendanceSession
        from app.models.enums import TaskStatus
        from app.models.leave_request import LeaveRequest
        from app.models.eod_report import EODReport
        from app.models.task import Task
        from app.models.time_log import TimeLog
        from app.models.project import Project
        from sqlalchemy import or_

        now = datetime.now(timezone.utc)
        since = now - timedelta(days=30)

        att_sessions = (
            self.db.query(AttendanceSession)
            .filter(
                AttendanceSession.user_id == user_id,
                AttendanceSession.check_in_at >= since,
            )
            .all()
        )

        tasks = self.db.query(Task).filter(Task.assigned_to == user_id).all()
        active_statuses = {TaskStatus.CREATED, TaskStatus.APPROVED, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.REOPENED}
        completed_statuses = {TaskStatus.COMPLETED, TaskStatus.REVIEWED}

        time_logs = (
            self.db.query(TimeLog)
            .filter(TimeLog.user_id == user_id, TimeLog.started_at >= since)
            .all()
        )
        logged_hours = sum((tl.duration_minutes or 0) for tl in time_logs) / 60.0

        leaves = (
            self.db.query(LeaveRequest)
            .filter(LeaveRequest.user_id == user_id, LeaveRequest.start_date >= since.date())
            .all()
        )

        eods = (
            self.db.query(EODReport)
            .filter(EODReport.user_id == user_id, EODReport.report_date >= since.date())
            .all()
        )

        project_ids = {t.project_id for t in tasks if t.project_id}
        if project_ids:
            projects = (
                self.db.query(Project)
                .filter(or_(Project.owner_id == user_id, Project.id.in_(project_ids)))
                .limit(10)
                .all()
            )
        else:
            projects = self.db.query(Project).filter(Project.owner_id == user_id).limit(10).all()

        last_login_log = (
            self.db.query(AuditLog)
            .filter(
                AuditLog.entity_type == "auth",
                AuditLog.entity_id == user_id,
                AuditLog.action_type == "LOGIN",
            )
            .order_by(AuditLog.created_at.desc())
            .first()
        )

        last_activity = None
        candidates: list[datetime] = []
        if att_sessions:
            candidates.append(max(s.check_in_at for s in att_sessions if s.check_in_at))
        if tasks:
            candidates.append(max(t.updated_at for t in tasks if t.updated_at))
        if candidates:
            last_activity = max(candidates).isoformat()

        eod_rate = round(len(eods) / max(len(att_sessions), 1) * 100, 1) if att_sessions else 0

        return {
            "user_id": user.id,
            "attendance": {
                "check_ins_30d": len(att_sessions),
                "late_check_ins": sum(1 for s in att_sessions if s.is_late_login),
                "total_worked_hours": round(sum((s.worked_minutes or 0) for s in att_sessions) / 60.0, 1),
            },
            "tasks": {
                "assigned": len(tasks),
                "completed": sum(1 for t in tasks if t.status in completed_statuses),
                "active": sum(1 for t in tasks if t.status in active_statuses),
                "overdue": sum(
                    1
                    for t in tasks
                    if t.due_date and t.due_date < now.date() and t.status in active_statuses
                ),
            },
            "time_logs": {"logged_hours_30d": round(logged_hours, 1)},
            "leave": {"requests_30d": len(leaves)},
            "projects": {
                "recent": [{"id": str(p.id), "name": p.name} for p in projects[:5]],
            },
            "eod": {"submissions_30d": len(eods), "completion_rate_pct": eod_rate},
            "last_activity": last_activity,
            "account_created_at": user.created_at,
            "last_login": last_login_log.created_at.isoformat() if last_login_log else None,
        }
