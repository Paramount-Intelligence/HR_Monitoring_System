"""Attendance service — check-in, check-out, team views, correction requests."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.attendance_session import AttendanceSession
from app.models.attendance_correction import AttendanceCorrection
from app.models.shift import Shift
from app.models.enums import AttendanceClassification, AttendanceSessionStatus, UserRole, WorkMode, CorrectionStatus
from app.models.user import User
from app.schemas.attendance import CheckInRequest, CorrectionRequest, CorrectionResolveRequest
from app.services.shift_service import ShiftService
from app.core.time_utils import ensure_pk_datetime


class AttendanceService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def check_in(self, payload: CheckInRequest, actor: User) -> AttendanceSession:
        active = self._get_active_session(actor.id)
        if active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already have an active attendance session. Check out first.",
            )

        now = datetime.now(timezone.utc)
        is_late = False
        if actor.shift_id:
            shift = self.db.get(Shift, actor.shift_id)
            if shift:
                is_late = ShiftService.is_late(now, shift)

        session = AttendanceSession(
            user_id=actor.id,
            check_in_at=now,
            work_mode=payload.work_mode,
            session_status=AttendanceSessionStatus.ACTIVE,
            attendance_classification=AttendanceClassification.ACTIVE,
            is_late_login=is_late
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def check_out(self, actor: User) -> AttendanceSession:
        session = self._get_active_session(actor.id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active attendance session found.",
            )

        now = datetime.now(timezone.utc)
        is_early = False
        if actor.shift_id:
            shift = self.db.get(Shift, actor.shift_id)
            if shift:
                is_early = ShiftService.is_early_logout(now, shift)

        session.check_out_at = now
        session.is_early_logout = is_early
        session.session_status = AttendanceSessionStatus.COMPLETED
        
        # Calculate total hours
        checkout_aware = ensure_pk_datetime(session.check_out_at)
        checkin_aware = ensure_pk_datetime(session.check_in_at)
        duration = checkout_aware - checkin_aware
        session.total_hours = duration.total_seconds() / 3600.0
        
        # Calculate classification
        session.attendance_classification = self._calculate_classification(session)
        
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_active(self, actor: User) -> AttendanceSession | None:
        return self._get_active_session(actor.id)

    def get_my_sessions(
        self,
        actor: User,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[AttendanceSession]:
        q = self.db.query(AttendanceSession).filter(
            AttendanceSession.user_id == actor.id
        )
        if date_from:
            q = q.filter(AttendanceSession.check_in_at >= datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc))
        if date_to:
            end = datetime.combine(date_to, datetime.max.time(), tzinfo=timezone.utc)
            q = q.filter(AttendanceSession.check_in_at <= end)
            
        return q.order_by(AttendanceSession.check_in_at.desc()).all()

    def get_team_sessions(
        self,
        actor: User,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[AttendanceSession]:
        if actor.role not in (UserRole.MANAGER, UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.HR_OPERATIONS):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        if actor.role in (UserRole.MANAGER, UserRole.TEAM_LEAD):
            member_ids = [u.id for u in self.db.query(User).filter(User.manager_id == actor.id).all()]
            if not member_ids:
                return []
        else:
            member_ids = [u.id for u in self.db.query(User).all()]

        q = self.db.query(AttendanceSession).filter(
            AttendanceSession.user_id.in_(member_ids)
        )
        if date_from:
            q = q.filter(AttendanceSession.check_in_at >= datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc))
        if date_to:
            end = datetime.combine(date_to, datetime.max.time(), tzinfo=timezone.utc)
            q = q.filter(AttendanceSession.check_in_at <= end)

        return q.options(joinedload(AttendanceSession.user)).order_by(AttendanceSession.check_in_at.desc()).all()

    def request_correction(
        self,
        session_id: uuid.UUID,
        payload: CorrectionRequest,
        actor: User,
    ) -> AttendanceSession:
        session = self.db.get(AttendanceSession, session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

        if actor.role == UserRole.EMPLOYEE and session.user_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        if session.correction_requested:
            pending = self.db.query(AttendanceCorrection).filter(
                AttendanceCorrection.session_id == session.id,
                AttendanceCorrection.status.in_([CorrectionStatus.PENDING, CorrectionStatus.NEEDS_CLARIFICATION])
            ).first()
            if pending:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A correction is already pending or needs clarification for this session",
                )

        session.correction_requested = True
        session.correction_reason = payload.reason
        
        correction = AttendanceCorrection(
            session_id=session.id,
            user_id=actor.id,
            original_check_in_at=session.check_in_at,
            original_check_out_at=session.check_out_at,
            requested_check_in_at=payload.requested_check_in_at,
            requested_check_out_at=payload.requested_check_out_at,
            reason=payload.reason,
            status=CorrectionStatus.PENDING
        )
        self.db.add(correction)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_pending_corrections(self, actor: User) -> list[AttendanceSession]:
        if actor.role not in (UserRole.MANAGER, UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.HR_OPERATIONS):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        if actor.role in (UserRole.MANAGER, UserRole.TEAM_LEAD):
            member_ids = [u.id for u in self.db.query(User).filter(User.manager_id == actor.id).all()]
        else:
            member_ids = [u.id for u in self.db.query(User).all()]

        return (
            self.db.query(AttendanceSession)
            .options(joinedload(AttendanceSession.user))
            .filter(
                AttendanceSession.user_id.in_(member_ids),
                AttendanceSession.correction_requested == True
            )
            .order_by(AttendanceSession.created_at.desc())
            .all()
        )

    def resolve_correction(
        self,
        session_id: uuid.UUID,
        payload: CorrectionResolveRequest,
        actor: User,
    ) -> AttendanceSession:
        if actor.role not in (UserRole.MANAGER, UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.HR_OPERATIONS):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        session = self.db.get(AttendanceSession, session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

        if not session.correction_requested:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No correction requested for this session")

        if actor.role in (UserRole.MANAGER, UserRole.TEAM_LEAD):
            user = self.db.get(User, session.user_id)
            if not user or user.manager_id != actor.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to resolve corrections for this user")

        correction = self.db.query(AttendanceCorrection).filter(
            AttendanceCorrection.session_id == session.id,
            AttendanceCorrection.status.in_([CorrectionStatus.PENDING, CorrectionStatus.NEEDS_CLARIFICATION])
        ).first()

        if not correction:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Correction record not found")

        if payload.action == 'approve':
            if correction.requested_check_in_at:
                session.check_in_at = correction.requested_check_in_at
            if correction.requested_check_out_at:
                session.check_out_at = correction.requested_check_out_at
                session.session_status = AttendanceSessionStatus.COMPLETED
            
            # Recalculate duration and hours
            if session.check_out_at:
                checkout_aware = ensure_pk_datetime(session.check_out_at)
                checkin_aware = ensure_pk_datetime(session.check_in_at)
                duration = checkout_aware - checkin_aware
                session.total_hours = duration.total_seconds() / 3600.0

            # Recalculate flags
            user = self.db.get(User, session.user_id)
            if user and user.shift_id:
                shift = self.db.get(Shift, user.shift_id)
                if shift:
                    session.is_late_login = ShiftService.is_late(session.check_in_at, shift)
                    if session.check_out_at:
                        session.is_early_logout = ShiftService.is_early_logout(session.check_out_at, shift)

            session.attendance_classification = self._calculate_classification(session)
            session.is_corrected = True
            correction.status = CorrectionStatus.APPROVED
            session.correction_requested = False

        elif payload.action == 'reject':
            correction.status = CorrectionStatus.REJECTED
            session.correction_requested = False

        elif payload.action == 'clarify':
            correction.status = CorrectionStatus.NEEDS_CLARIFICATION

        if payload.manager_comment:
            correction.manager_comment = payload.manager_comment

        self.db.commit()
        self.db.refresh(session)
        return session

    def _get_active_session(self, user_id: uuid.UUID) -> AttendanceSession | None:
        return (
            self.db.query(AttendanceSession)
            .filter(
                AttendanceSession.user_id == user_id,
                AttendanceSession.session_status == AttendanceSessionStatus.ACTIVE,
            )
            .first()
        )

    def _calculate_classification(self, session: AttendanceSession) -> AttendanceClassification:
        if session.session_status == AttendanceSessionStatus.ACTIVE:
            return AttendanceClassification.ACTIVE
        
        # Rule: 9h for full, 4.5h for half
        hours = session.total_hours or 0
        if hours >= 9.0:
            return AttendanceClassification.FULL_DAY
        elif hours >= 4.5:
            return AttendanceClassification.HALF_DAY
        else:
            return AttendanceClassification.INSUFFICIENT
