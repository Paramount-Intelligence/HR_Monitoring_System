"""Attendance service — check-in, check-out, team views, correction requests."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func
import sqlalchemy as sa
from sqlalchemy.orm import Session, joinedload

from app.core.time_utils import ensure_pk_datetime, PK_TZ
from app.models.attendance_session import AttendanceSession
from app.models.attendance_correction import AttendanceCorrection
from app.models.attendance_break import AttendanceBreak
from app.models.shift import Shift
from app.models.enums import AttendanceClassification, AttendanceSessionStatus, UserRole, WorkMode, CorrectionStatus, AttendanceBreakType
from app.models.user import User
from app.schemas.attendance import CheckInRequest, CheckOutRequest, CorrectionRequest, CorrectionResolveRequest
from app.services.shift_service import ShiftService


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
        now_pk = ensure_pk_datetime(now)
        
        is_late = False
        late_mins = 0
        expected_start = None
        expected_end = None
        
        if actor.shift_id:
            shift = self.db.get(Shift, actor.shift_id)
            if shift:
                # For overnight shifts (like 5 PM - 2 AM), if checking in between 12 AM and 10 AM PKT,
                # it's likely the person is very late for "yesterday's" shift.
                target_date = now_pk.date()
                if shift.end_time < shift.start_time and now_pk.hour < 10:
                    target_date = target_date - timedelta(days=1)
                
                # Calculate boundaries for the determined shift day
                expected_start, expected_end = ShiftService.get_shift_boundaries(target_date, shift)
                
                # Calculate late minutes based on these specific boundaries
                limit = expected_start.astimezone(PK_TZ) + timedelta(minutes=shift.grace_period_minutes)
                
                if now_pk > limit:
                    is_late = True
                    diff = now_pk - expected_start.astimezone(PK_TZ)
                    late_mins = int(diff.total_seconds() // 60)
                else:
                    is_late = False
                    late_mins = 0

        session = AttendanceSession(
            user_id=actor.id,
            check_in_at=now,
            work_mode=payload.work_mode,
            session_status=AttendanceSessionStatus.ACTIVE,
            attendance_classification=AttendanceClassification.ACTIVE,
            is_late_login=is_late,
            late_minutes=late_mins,
            expected_shift_start_at=expected_start.astimezone(timezone.utc) if expected_start else None,
            expected_shift_end_at=expected_end.astimezone(timezone.utc) if expected_end else None
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        
        # Auto-resume task timer if applicable
        from app.services.task_timer_service import TaskTimerService
        from app.models.enums import TimerSessionStatus, TimerPauseReason
        from app.models.task_timer_session import TaskTimerSession
        try:
            timer_service = TaskTimerService(self.db)
            last_session = (
                self.db.query(TaskTimerSession)
                .filter(
                    TaskTimerSession.user_id == actor.id,
                    TaskTimerSession.status == TimerSessionStatus.PAUSED,
                    TaskTimerSession.pause_reason == TimerPauseReason.ATTENDANCE_CHECKOUT
                )
                .order_by(TaskTimerSession.updated_at.desc())
                .first()
            )
            if last_session:
                timer_service.resume_timer(last_session.task_id, actor)
        except Exception as e:
            # Do not break attendance check-in
            print(f"Failed to auto-resume task timer: {e}")

        return session

    def check_out(self, actor: User, payload: CheckOutRequest | None = None) -> AttendanceSession:
        session = self._get_active_session(actor.id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active attendance session found.",
            )

        now = datetime.now(timezone.utc)
        now_pk = ensure_pk_datetime(now)
        
        # Check if checkout is after shift end
        if session.expected_shift_end_at:
            exp_end_pk = ensure_pk_datetime(session.expected_shift_end_at)
            if now_pk > exp_end_pk:
                # Justification required
                if not payload or not payload.checkout_after_shift_reason or not payload.checkout_after_shift_note:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Reason and note are required for checkout after shift end."
                    )
                
                reason = payload.checkout_after_shift_reason.lower()
                session.is_overtime = (reason == 'overtime')
                session.checkout_after_shift_reason = payload.checkout_after_shift_reason
                session.checkout_after_shift_note = payload.checkout_after_shift_note

        is_early = False
        early_mins = 0
        if actor.shift_id:
            shift = self.db.get(Shift, actor.shift_id)
            if shift:
                is_early, early_mins = ShiftService.is_early_logout(now, shift, session.expected_shift_end_at)
                
        if is_early:
            if not payload or not payload.early_checkout_reason or len(payload.early_checkout_reason.strip()) < 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A reason of at least 5 characters is required for checking out before your shift ends."
                )
            session.early_checkout_reason = payload.early_checkout_reason

        # Auto-end active break if any
        active_break = self.get_active_break(actor.id)
        if active_break:
            self.end_break(actor, active_break.id)
            self.db.refresh(session)

        session.check_out_at = now
        session.is_early_logout = is_early
        session.early_checkout_minutes = early_mins
        session.session_status = AttendanceSessionStatus.COMPLETED
        
        # Calculate minutes and hours
        # Normalize both to PK_TZ to ensure consistent subtraction
        check_in_pk = ensure_pk_datetime(session.check_in_at)
        check_out_pk = ensure_pk_datetime(session.check_out_at)
        
        delta = check_out_pk - check_in_pk
        total_seconds = max(0, int(delta.total_seconds()))
        session.worked_minutes = total_seconds // 60
        session.total_hours = total_seconds / 3600.0
        
        # Calculate classification
        session.attendance_classification = self._calculate_classification(session)
        
        self.db.commit()
        self.db.refresh(session)
        
        # Auto-pause task timer if applicable
        from app.services.task_timer_service import TaskTimerService
        from app.models.enums import TimerSessionStatus, TimerPauseReason
        try:
            timer_service = TaskTimerService(self.db)
            active_timer = timer_service.get_active_session(actor.id)
            if active_timer and active_timer.status == TimerSessionStatus.RUNNING:
                timer_service.pause_timer(active_timer.task_id, actor, reason=TimerPauseReason.ATTENDANCE_CHECKOUT)
        except Exception as e:
            # Do not break attendance check-out
            print(f"Failed to auto-pause task timer: {e}")

        # Update DailyStats
        self._update_daily_stats(session)
        
        return session

    def _update_daily_stats(self, session: AttendanceSession) -> None:
        """Sync session data to DailyStats aggregation."""
        from app.models.daily_stats import DailyStats
        from app.core.time_utils import ensure_pk_datetime
        
        # We aggregate based on the check-in date in PKT
        pk_checkin = ensure_pk_datetime(session.check_in_at)
        target_date = pk_checkin.date()
        
        stats = self.db.query(DailyStats).filter(
            DailyStats.user_id == session.user_id,
            DailyStats.date == target_date
        ).first()
        
        if not stats:
            stats = DailyStats(
                user_id=session.user_id,
                date=target_date,
                primary_session_id=session.id
            )
            self.db.add(stats)
        
        # Update aggregate metrics
        # For simplicity, we assume one primary session per day for these flags
        stats.total_hours = session.total_hours or 0.0
        stats.is_late_login = session.is_late_login
        stats.is_early_logout = session.is_early_logout
        stats.is_overtime = session.is_overtime
        stats.is_absent = False
        
        self.db.commit()

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
            # Portable date comparison (works for both SQLite and Postgres)
            q = q.filter(sa.func.date(AttendanceSession.check_in_at) >= date_from)
        if date_to:
            q = q.filter(sa.func.date(AttendanceSession.check_in_at) <= date_to)
            
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
             q = q.filter(sa.func.date(AttendanceSession.check_in_at) >= date_from)
        if date_to:
             q = q.filter(sa.func.date(AttendanceSession.check_in_at) <= date_to)

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
                delta = session.check_out_at - session.check_in_at
                total_seconds = max(0, int(delta.total_seconds()))
                session.worked_minutes = total_seconds // 60
                session.total_hours = total_seconds / 3600.0

            # Recalculate flags
            user = self.db.get(User, session.user_id)
            if user and user.shift_id:
                shift = self.db.get(Shift, user.shift_id)
                if shift:
                    session.is_late_login, session.late_minutes = ShiftService.is_late(session.check_in_at, shift)
                    if session.check_out_at:
                        session.is_early_logout, session.early_checkout_minutes = ShiftService.is_early_logout(session.check_out_at, shift, session.expected_shift_end_at)

            session.attendance_classification = self._calculate_classification(session)
            session.is_corrected = True
            correction.status = CorrectionStatus.APPROVED
            session.correction_requested = False
            
            # Update DailyStats
            if session.check_out_at:
                self._update_daily_stats(session)

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
        
        # Business Rules:
        # Full Day: >= 9 hours
        # Half Day: >= 4.5 hours and < 9 hours
        # Short Leave: < 4.5 hours
        # Insufficient: if near 0 or as per current policy
        
        hours = session.total_hours or 0
        if hours >= 9.0:
            return AttendanceClassification.FULL_DAY
        elif hours >= 4.5:
            return AttendanceClassification.HALF_DAY
        elif hours > 0.5: # More than 30 mins but less than 4.5h
            return AttendanceClassification.SHORT_LEAVE
        else:
            return AttendanceClassification.INSUFFICIENT

    # --- Break Management ---

    def start_break(self, actor: User, break_type: AttendanceBreakType, note: str | None = None) -> AttendanceBreak:
        session = self._get_active_session(actor.id)
        if not session:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot start break without an active attendance session.")

        if self.get_active_break(actor.id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already have an active break.")

        if break_type == AttendanceBreakType.OTHER and not note:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Note is required for 'other' break type.")

        now = datetime.now(timezone.utc)
        new_break = AttendanceBreak(
            attendance_session_id=session.id,
            user_id=actor.id,
            break_type=break_type,
            started_at=now,
            note=note,
            is_paid=True
        )
        self.db.add(new_break)
        self.db.commit()
        self.db.refresh(new_break)
        
        # Auto-pause task timer if applicable
        from app.services.task_timer_service import TaskTimerService
        from app.models.enums import TimerSessionStatus, TimerPauseReason
        try:
            timer_service = TaskTimerService(self.db)
            active_timer = timer_service.get_active_session(actor.id)
            if active_timer and active_timer.status == TimerSessionStatus.RUNNING:
                timer_service.pause_timer(active_timer.task_id, actor, reason=TimerPauseReason.BREAK_STARTED)
        except Exception as e:
            print(f"Failed to auto-pause task timer on break start: {e}")

        return new_break

    def end_break(self, actor: User, break_id: uuid.UUID | None = None) -> AttendanceBreak:
        session = self._get_active_session(actor.id)
        if not session:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active attendance session.")

        if break_id:
            active_break = self.db.get(AttendanceBreak, break_id)
        else:
            active_break = self.get_active_break(actor.id)

        if not active_break or active_break.ended_at:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active break found.")

        now = datetime.now(timezone.utc)
        active_break.ended_at = now
        
        # Calculate duration
        # Ensure started_at is aware for subtraction
        start_at = active_break.started_at
        if start_at.tzinfo is None:
            start_at = start_at.replace(tzinfo=timezone.utc)
            
        diff = now - start_at
        duration = max(0, int(diff.total_seconds() // 60))
        active_break.duration_minutes = duration

        # Update session summary
        session.total_break_minutes += duration
        if active_break.break_type == AttendanceBreakType.DINNER:
            session.dinner_break_minutes += duration
        elif active_break.break_type == AttendanceBreakType.PRAYER:
            session.prayer_break_minutes += duration
        elif active_break.break_type == AttendanceBreakType.OTHER:
            session.other_break_minutes += duration

        self.db.commit()
        self.db.refresh(active_break)
        
        # Auto-resume task timer if applicable
        from app.services.task_timer_service import TaskTimerService
        from app.models.enums import TimerSessionStatus, TimerPauseReason
        from app.models.task_timer_session import TaskTimerSession
        try:
            timer_service = TaskTimerService(self.db)
            last_session = (
                self.db.query(TaskTimerSession)
                .filter(
                    TaskTimerSession.user_id == actor.id,
                    TaskTimerSession.status == TimerSessionStatus.PAUSED,
                    TaskTimerSession.pause_reason == TimerPauseReason.BREAK_STARTED
                )
                .order_by(TaskTimerSession.updated_at.desc())
                .first()
            )
            if last_session:
                timer_service.resume_timer(last_session.task_id, actor)
        except Exception as e:
            print(f"Failed to auto-resume task timer on break end: {e}")

        return active_break

    def get_active_break(self, user_id: uuid.UUID) -> AttendanceBreak | None:
        return (
            self.db.query(AttendanceBreak)
            .filter(
                AttendanceBreak.user_id == user_id,
                AttendanceBreak.ended_at == None
            )
            .first()
        )

    def get_session_breaks(self, session_id: uuid.UUID) -> list[AttendanceBreak]:
        return (
            self.db.query(AttendanceBreak)
            .filter(AttendanceBreak.attendance_session_id == session_id)
            .order_by(AttendanceBreak.started_at.asc())
            .all()
        )
