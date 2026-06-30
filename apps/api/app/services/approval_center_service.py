from __future__ import annotations

from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.attendance_correction import AttendanceCorrection
from app.models.attendance_session import AttendanceSession
from app.models.eod_report import EODReport
from app.models.enums import CorrectionStatus, LeaveStatus, LeaveType, UserRole, UserStatus
from app.models.leave_request import LeaveRequest
from app.models.user import User
from app.schemas.approvals import ApprovalCenterItem, ApprovalCenterResponse, ApprovalCenterSummary
from app.services.eod_review_auth import can_review_eod_submitter

PENDING_RESOLVE_ACTIONS = ["review", "approve", "request_revision", "reject"]
REVIEW_ONLY_ACTIONS = ["review"]


class ApprovalCenterService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_approvals(
        self,
        *,
        actor: User,
        type_filter: str = "all",
        status_filter: str = "pending",
        business_date: date | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        search: str | None = None,
        scope: str = "my_team",
    ) -> ApprovalCenterResponse:
        if actor.role not in (UserRole.ADMIN, UserRole.HR_OPERATIONS, UserRole.MANAGER, UserRole.TEAM_LEAD):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        user_ids = self._visible_user_ids(actor, scope)
        start = start_date or business_date
        end = end_date or business_date
        items: list[ApprovalCenterItem] = []
        if type_filter in ("all", "eod"):
            items.extend(self._eod_items(actor, user_ids, start, end))
        if type_filter in ("all", "leave", "wfh"):
            items.extend(self._leave_items(actor, type_filter, start, end))
        if type_filter in ("all", "attendance_correction"):
            items.extend(self._correction_items(user_ids, start, end))
        if status_filter != "all":
            normalized = "needs_revision" if status_filter == "needs_revision" else status_filter
            items = [item for item in items if item.status == normalized]
        if search:
            needle = search.strip().lower()
            items = [
                item for item in items
                if needle in item.user_name.lower() or needle in item.user_email.lower() or needle in item.title.lower()
            ]
        items.sort(key=lambda item: item.submitted_at or item.business_date or date.min, reverse=True)
        summary = ApprovalCenterSummary(
            pending=sum(1 for item in items if item.status == "pending"),
            approved=sum(1 for item in items if item.status == "approved"),
            rejected=sum(1 for item in items if item.status == "rejected"),
            needs_revision=sum(1 for item in items if item.status == "needs_revision"),
        )
        return ApprovalCenterResponse(summary=summary, items=items)

    def _visible_user_ids(self, actor: User, scope: str) -> list:
        if actor.role in (UserRole.ADMIN, UserRole.HR_OPERATIONS) and scope == "organization":
            return [u.id for u in self.db.query(User.id).filter(User.status == UserStatus.ACTIVE).all()]
        if actor.role in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
            return [u.id for u in self.db.query(User.id).filter(User.status == UserStatus.ACTIVE).all()]
        return [u.id for u in self.db.query(User.id).filter(User.manager_id == actor.id, User.status == UserStatus.ACTIVE).all()]

    def _eod_items(self, actor: User, user_ids, start, end) -> list[ApprovalCenterItem]:
        if not user_ids:
            return []
        q = self.db.query(EODReport, User).join(User, EODReport.user_id == User.id).filter(EODReport.user_id.in_(user_ids))
        if start:
            q = q.filter(EODReport.report_date >= start)
        if end:
            q = q.filter(EODReport.report_date <= end)
        rows = q.order_by(EODReport.updated_at.desc()).limit(100).all()
        prefix = "/admin" if actor.role == UserRole.ADMIN else "/manager"
        return [
            ApprovalCenterItem(
                id=report.id,
                type="eod",
                title="EOD Review",
                user_name=user.full_name,
                user_email=user.email,
                department=user.department_name,
                status=self._eod_status(report.status),
                submitted_at=report.submitted_at or report.updated_at,
                business_date=report.report_date,
                description="Daily EOD pending review",
                action_url=f"{prefix}/eod-reviews?date={report.report_date.isoformat()}",
                available_actions=self._eod_available_actions(actor, report),
            )
            for report, user in rows
        ]

    def _eod_available_actions(self, actor: User, report: EODReport) -> list[str]:
        if self._eod_status(report.status) != "pending":
            return REVIEW_ONLY_ACTIONS
        if can_review_eod_submitter(self.db, actor, report.user_id):
            return PENDING_RESOLVE_ACTIONS
        return REVIEW_ONLY_ACTIONS

    def _leave_available_actions(self, actor: User, req: LeaveRequest, normalized_status: str) -> list[str]:
        if normalized_status != "pending":
            return REVIEW_ONLY_ACTIONS
        if actor.role in (UserRole.ADMIN, UserRole.HR_OPERATIONS):
            return PENDING_RESOLVE_ACTIONS
        if req.current_approver_id == actor.id:
            return PENDING_RESOLVE_ACTIONS
        return REVIEW_ONLY_ACTIONS

    def _leave_items(self, actor: User, type_filter: str, start, end) -> list[ApprovalCenterItem]:
        q = self.db.query(LeaveRequest).options(joinedload(LeaveRequest.user))
        if actor.role in (UserRole.MANAGER, UserRole.TEAM_LEAD):
            q = q.filter(LeaveRequest.current_approver_id == actor.id)
        if type_filter == "leave":
            q = q.filter(LeaveRequest.leave_type != LeaveType.WFH)
        elif type_filter == "wfh":
            q = q.filter(LeaveRequest.leave_type == LeaveType.WFH)
        if start:
            q = q.filter(LeaveRequest.start_date >= start)
        if end:
            q = q.filter(LeaveRequest.start_date <= end)
        return [
            ApprovalCenterItem(
                id=req.id,
                type="wfh" if req.leave_type == LeaveType.WFH else "leave",
                title="WFH Request" if req.leave_type == LeaveType.WFH else "Leave Request",
                user_name=req.user.full_name if req.user else "Unknown",
                user_email=req.user.email if req.user else "",
                department=req.user.department_name if req.user else None,
                status=self._leave_status(req.status),
                submitted_at=req.created_at,
                business_date=req.start_date,
                description=req.reason or "",
                action_url="/manager/approvals",
                available_actions=self._leave_available_actions(actor, req, self._leave_status(req.status)),
            )
            for req in q.order_by(LeaveRequest.created_at.desc()).limit(100).all()
        ]

    def _correction_items(self, user_ids, start, end) -> list[ApprovalCenterItem]:
        if not user_ids:
            return []
        q = (
            self.db.query(AttendanceCorrection, User, AttendanceSession)
            .join(User, AttendanceCorrection.user_id == User.id)
            .join(AttendanceSession, AttendanceCorrection.session_id == AttendanceSession.id)
            .filter(AttendanceCorrection.user_id.in_(user_ids))
        )
        if start:
            q = q.filter(AttendanceCorrection.created_at >= start)
        if end:
            q = q.filter(AttendanceCorrection.created_at < end)
        return [
            ApprovalCenterItem(
                id=corr.id,
                type="attendance_correction",
                title="Attendance Correction",
                user_name=user.full_name,
                user_email=user.email,
                department=user.department_name,
                status=self._correction_status(corr.status),
                submitted_at=corr.created_at,
                business_date=session.check_in_at.date() if session.check_in_at else None,
                description=corr.reason or "Attendance correction requested",
                action_url="/manager/approvals",
                available_actions=REVIEW_ONLY_ACTIONS,
            )
            for corr, user, session in q.order_by(AttendanceCorrection.created_at.desc()).limit(100).all()
        ]

    def _eod_status(self, value: str) -> str:
        v = (value or "").lower()
        if "pending" in v:
            return "pending"
        if "reject" in v:
            return "rejected"
        if "revision" in v or "clarification" in v:
            return "needs_revision"
        if "approve" in v or "review" in v:
            return "approved"
        return v or "pending"

    def _leave_status(self, value: LeaveStatus) -> str:
        if value == LeaveStatus.NEEDS_CLARIFICATION:
            return "needs_revision"
        return value.value

    def _correction_status(self, value: CorrectionStatus) -> str:
        if value == CorrectionStatus.NEEDS_CLARIFICATION:
            return "needs_revision"
        if value == CorrectionStatus.APPROVED:
            return "approved"
        if value == CorrectionStatus.REJECTED:
            return "rejected"
        return "pending"
