from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.time_utils import ensure_pk_datetime, pk_day_end, pk_day_start, pk_now, pk_today
from app.models.attendance_correction import AttendanceCorrection
from app.models.attendance_exception import AttendanceException
from app.models.attendance_session import AttendanceSession
from app.models.audit_log import AuditLog
from app.models.enums import AttendanceSessionStatus, CorrectionStatus, LeaveStatus, UserRole, UserStatus
from app.models.leave_request import LeaveRequest
from app.models.shift import Shift
from app.models.user import User
from app.schemas.attendance_exception import (
    AttendanceExceptionItem,
    AttendanceExceptionSummary,
    AttendanceExceptionsResponse,
)


TYPE_ALIASES = {
    "late": "late",
    "early": "early",
    "missing_checkout": "missing_checkout",
    "absent": "absent",
    "overtime": "overtime",
    "active_too_long": "active_too_long",
    "correction_request": "correction_request",
}


class AttendanceExceptionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_exceptions(
        self,
        *,
        actor: User,
        business_date: date | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        status_filter: str = "open",
        type_filter: str | None = None,
        user_id: uuid.UUID | None = None,
        department_id: uuid.UUID | None = None,
        search: str | None = None,
        scope: str = "my_team",
    ) -> AttendanceExceptionsResponse:
        self._assert_can_view(actor)
        start = start_date or business_date or pk_today()
        end = end_date or business_date or start
        if end < start:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="end_date must be after start_date")

        visible_user_ids = self._visible_user_ids(actor, scope=scope)
        if user_id:
            if user_id not in visible_user_ids and actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            visible_user_ids = [user_id]
        if department_id:
            dept_ids = {
                u.id
                for u in self.db.query(User.id).filter(User.department_id == department_id).all()
            }
            visible_user_ids = [uid for uid in visible_user_ids if uid in dept_ids]

        if visible_user_ids:
            self.generate_for_range(start, end, visible_user_ids=visible_user_ids)

        q = (
            self.db.query(AttendanceException)
            .options(
                joinedload(AttendanceException.user).joinedload(User.dept),
                joinedload(AttendanceException.user).joinedload(User.shift),
                joinedload(AttendanceException.session),
            )
            .filter(
                AttendanceException.business_date >= start,
                AttendanceException.business_date <= end,
                AttendanceException.user_id.in_(visible_user_ids) if visible_user_ids else False,
            )
        )
        if status_filter and status_filter != "all":
            q = q.filter(AttendanceException.status == status_filter)
        if type_filter:
            q = q.filter(AttendanceException.exception_type == TYPE_ALIASES.get(type_filter, type_filter))
        if search:
            pattern = f"%{search.strip()}%"
            q = q.join(User, AttendanceException.user_id == User.id).filter(
                or_(User.full_name.ilike(pattern), User.email.ilike(pattern))
            )

        exceptions = q.order_by(AttendanceException.business_date.desc(), AttendanceException.detected_at.desc()).all()
        summary = self._summary(exceptions)
        return AttendanceExceptionsResponse(
            summary=summary,
            exceptions=[self._serialize(item) for item in exceptions],
        )

    def resolve(self, exception_id: uuid.UUID, actor: User, note: str) -> AttendanceException:
        exc = self._get_actionable(exception_id, actor)
        now = datetime.now(timezone.utc)
        old_status = exc.status
        exc.status = "resolved"
        exc.resolution_note = note
        exc.resolved_by = actor.id
        exc.resolved_at = now
        self._audit(actor, exc, "ATTENDANCE_EXCEPTION_RESOLVED", old_status=old_status, note=note)
        self.db.commit()
        self.db.refresh(exc)
        return exc

    def dismiss(self, exception_id: uuid.UUID, actor: User, note: str | None = None) -> AttendanceException:
        exc = self._get_actionable(exception_id, actor)
        now = datetime.now(timezone.utc)
        old_status = exc.status
        exc.status = "dismissed"
        exc.resolution_note = note
        exc.dismissed_by = actor.id
        exc.dismissed_at = now
        self._audit(actor, exc, "ATTENDANCE_EXCEPTION_DISMISSED", old_status=old_status, note=note)
        self.db.commit()
        self.db.refresh(exc)
        return exc

    def generate_for_range(self, start_date: date, end_date: date, *, visible_user_ids: list[uuid.UUID]) -> None:
        users = (
            self.db.query(User)
            .options(joinedload(User.shift))
            .filter(User.id.in_(visible_user_ids), User.status == UserStatus.ACTIVE)
            .all()
        )
        now = pk_now()
        day = start_date
        while day <= end_date:
            day_start = pk_day_start(day)
            day_end = pk_day_end(day)
            sessions = (
                self.db.query(AttendanceSession)
                .filter(
                    AttendanceSession.user_id.in_([u.id for u in users]),
                    AttendanceSession.check_in_at >= day_start,
                    AttendanceSession.check_in_at < day_end,
                )
                .all()
            )
            by_user: dict[uuid.UUID, list[AttendanceSession]] = {}
            for session in sessions:
                by_user.setdefault(session.user_id, []).append(session)
                self._generate_from_session(session, day, now)

            approved_leave_user_ids = {
                row.user_id
                for row in self.db.query(LeaveRequest.user_id)
                .filter(LeaveRequest.status == LeaveStatus.APPROVED, LeaveRequest.start_date <= day, LeaveRequest.end_date >= day)
                .all()
            }
            for user in users:
                if user.id in by_user or user.id in approved_leave_user_ids:
                    continue
                if self._absence_can_be_detected(user, day, now):
                    self._upsert(user.id, None, None, day, "absent", "high", "Absent without approved leave")

            corrections = (
                self.db.query(AttendanceCorrection)
                .filter(
                    AttendanceCorrection.user_id.in_([u.id for u in users]),
                    AttendanceCorrection.status.in_([CorrectionStatus.PENDING, CorrectionStatus.NEEDS_CLARIFICATION]),
                    AttendanceCorrection.created_at >= day_start,
                    AttendanceCorrection.created_at < day_end,
                )
                .all()
            )
            for corr in corrections:
                self._upsert(corr.user_id, corr.session_id, corr.id, day, "correction_request", "medium", corr.reason)
            day += timedelta(days=1)
        self.db.commit()

    def _generate_from_session(self, session: AttendanceSession, business_date: date, now) -> None:
        if session.is_late_login:
            self._upsert(session.user_id, session.id, None, business_date, "late", "medium", f"Late by {session.late_minutes or 0} minutes")
        if session.is_early_logout:
            self._upsert(session.user_id, session.id, None, business_date, "early", "medium", session.early_checkout_reason)
        if session.is_overtime:
            self._upsert(session.user_id, session.id, None, business_date, "overtime", "low", session.checkout_after_shift_note)
        if session.session_status == AttendanceSessionStatus.ACTIVE:
            check_in = ensure_pk_datetime(session.check_in_at)
            expected_end = ensure_pk_datetime(session.expected_shift_end_at) if session.expected_shift_end_at else None
            if expected_end and now > expected_end + timedelta(minutes=60):
                self._upsert(session.user_id, session.id, None, business_date, "missing_checkout", "high", "Shift window ended without checkout")
            if check_in and now > check_in + timedelta(hours=16):
                self._upsert(session.user_id, session.id, None, business_date, "active_too_long", "high", "Active attendance session exceeds 16 hours")

    def _absence_can_be_detected(self, user: User, business_date: date, now) -> bool:
        shift = user.shift
        if not shift:
            return now.date() > business_date
        start_at, _ = self._shift_boundaries(business_date, shift)
        grace = start_at + timedelta(minutes=shift.grace_period_minutes)
        return now > grace

    def _shift_boundaries(self, business_date: date, shift: Shift):
        from app.services.shift_service import ShiftService

        return ShiftService.get_shift_boundaries(business_date, shift)

    def _upsert(
        self,
        user_id: uuid.UUID,
        session_id: uuid.UUID | None,
        correction_id: uuid.UUID | None,
        business_date: date,
        exception_type: str,
        severity: str,
        reason: str | None,
    ) -> None:
        existing = (
            self.db.query(AttendanceException)
            .filter(
                AttendanceException.user_id == user_id,
                AttendanceException.business_date == business_date,
                AttendanceException.exception_type == exception_type,
            )
            .first()
        )
        if existing:
            return
        self.db.add(
            AttendanceException(
                user_id=user_id,
                session_id=session_id,
                correction_id=correction_id,
                business_date=business_date,
                exception_type=exception_type,
                severity=severity,
                status="open",
                detected_at=datetime.now(timezone.utc),
                reason=reason,
            )
        )

    def _assert_can_view(self, actor: User) -> None:
        if actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS, UserRole.MANAGER, UserRole.TEAM_LEAD, UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    def _visible_user_ids(self, actor: User, *, scope: str) -> list[uuid.UUID]:
        if actor.role in (UserRole.ADMIN, UserRole.HR_OPERATIONS) and scope == "organization":
            return [u.id for u in self.db.query(User.id).filter(User.status == UserStatus.ACTIVE).all()]
        if actor.role in (UserRole.ADMIN, UserRole.HR_OPERATIONS) and scope == "my_team":
            return [u.id for u in self.db.query(User.id).filter(User.status == UserStatus.ACTIVE).all()]
        if actor.role in (UserRole.MANAGER, UserRole.TEAM_LEAD):
            ids = [u.id for u in self.db.query(User.id).filter(User.manager_id == actor.id, User.status == UserStatus.ACTIVE).all()]
            return ids
        return [actor.id]

    def _get_actionable(self, exception_id: uuid.UUID, actor: User) -> AttendanceException:
        exc = self.db.get(AttendanceException, exception_id)
        if not exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance exception not found")
        if exc.user_id not in self._visible_user_ids(actor, scope="organization") and actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        if actor.role in (UserRole.EMPLOYEE, UserRole.INTERN, UserRole.JUNIOR_EMPLOYEE):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return exc

    def _summary(self, exceptions: list[AttendanceException]) -> AttendanceExceptionSummary:
        return AttendanceExceptionSummary(
            open=sum(1 for e in exceptions if e.status == "open"),
            resolved=sum(1 for e in exceptions if e.status == "resolved"),
            late=sum(1 for e in exceptions if e.exception_type == "late"),
            early=sum(1 for e in exceptions if e.exception_type == "early"),
            missing_checkout=sum(1 for e in exceptions if e.exception_type == "missing_checkout"),
            absent=sum(1 for e in exceptions if e.exception_type == "absent"),
            overtime=sum(1 for e in exceptions if e.exception_type == "overtime"),
        )

    def _serialize(self, exc: AttendanceException) -> AttendanceExceptionItem:
        user = exc.user
        session = exc.session
        shift = user.shift if user else None
        return AttendanceExceptionItem(
            id=exc.id,
            user_id=exc.user_id,
            user_name=user.full_name if user else "Unknown",
            user_email=user.email if user else "",
            department=user.department_name if user else None,
            type=exc.exception_type,
            severity=exc.severity,
            status=exc.status,
            business_date=exc.business_date,
            shift_name=shift.name if shift else None,
            shift_start=shift.start_time.strftime("%H:%M") if shift and isinstance(shift.start_time, time) else None,
            shift_end=shift.end_time.strftime("%H:%M") if shift and isinstance(shift.end_time, time) else None,
            check_in_at=session.check_in_at if session else None,
            check_out_at=session.check_out_at if session else None,
            detected_at=exc.detected_at,
            reason=exc.reason,
            resolution_note=exc.resolution_note,
        )

    def _audit(self, actor: User, exc: AttendanceException, action: str, *, old_status: str, note: str | None) -> None:
        self.db.add(
            AuditLog(
                actor_user_id=actor.id,
                action_type=action,
                entity_type="attendance_exception",
                entity_id=exc.id,
                old_value={"status": old_status},
                new_value={"status": exc.status, "note": note},
            )
        )
