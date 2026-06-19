"""Project service — create, list, approve, reject with RBAC and audit log."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.approval import Approval
from app.models.audit_log import AuditLog
from app.models.enums import ApprovalEntityType, ApprovalStatus, ProjectStatus, UserRole, TaskStatus
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectDecision
from app.services.project_authorization import ProjectAuthorizationService


class ProjectService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self._authz = ProjectAuthorizationService(db)

    def create_project(self, payload: ProjectCreate, actor: User) -> Project:
        self._authz.assert_can_create(actor)
        target_manager_id = self._authz.resolve_manager_id_for_create(actor, payload.manager_id)

        project = Project(
            title=payload.title,
            description=payload.description,
            owner_id=actor.id,
            manager_id=target_manager_id,
            priority=payload.priority,
            project_status=ProjectStatus.PENDING_APPROVAL,
            due_date=payload.due_date,
        )
        self.db.add(project)
        self.db.flush()

        approval = Approval(
            entity_type=ApprovalEntityType.PROJECT,
            entity_id=project.id,
            requested_by=actor.id,
            decision=ApprovalStatus.PENDING,
        )
        self.db.add(approval)

        self._write_audit(
            actor=actor,
            action="PROJECT_CREATED",
            entity_id=project.id,
            new_value={"title": project.title, "status": project.project_status.value},
        )

        self.db.commit()
        self.db.refresh(project)
        return project

    def list_projects(
        self,
        *,
        approval_status: ApprovalStatus | None = None,
        project_status: ProjectStatus | None = None,
        owner_id: uuid.UUID | None = None,
        manager_id: uuid.UUID | None = None,
        actor: User,
    ) -> list[Project]:
        q = self.db.query(Project)
        q = self._authz.apply_list_scope(q, actor)

        if approval_status:
            q = q.filter(Project.approval_status == approval_status)
        if project_status:
            q = q.filter(Project.project_status == project_status)
        if owner_id:
            q = q.filter(Project.owner_id == owner_id)
        if manager_id:
            q = q.filter(Project.manager_id == manager_id)

        projects = q.order_by(Project.created_at.desc()).all()
        for p in projects:
            p.progress_percentage = self._calculate_progress(p.id)
        return projects

    def list_task_eligible_projects(self, actor: User) -> list[Project]:
        q = self.db.query(Project).filter(
            Project.approval_status == ApprovalStatus.APPROVED,
            Project.project_status.in_([ProjectStatus.APPROVED, ProjectStatus.ACTIVE]),
        )
        q = self._authz.apply_list_scope(q, actor)
        return q.order_by(Project.created_at.desc()).all()

    def get_project(self, project_id: uuid.UUID, actor: User) -> Project:
        project = self.db.get(Project, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        self._authz.assert_can_read(actor, project)
        project.progress_percentage = self._calculate_progress(project.id)
        return project

    def decide_project(
        self, project_id: uuid.UUID, payload: ProjectDecision, actor: User
    ) -> Project:
        if actor.role not in (UserRole.MANAGER, UserRole.ADMIN, UserRole.HR_OPERATIONS, UserRole.TEAM_LEAD):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        if payload.decision == ApprovalStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Decision must be 'approved' or 'rejected'",
            )

        project = self.db.get(Project, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        if actor.role in (UserRole.MANAGER, UserRole.TEAM_LEAD) and project.manager_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        old_status = project.approval_status.value
        now = datetime.now(timezone.utc)

        if payload.decision == ApprovalStatus.APPROVED:
            project.approval_status = ApprovalStatus.APPROVED
            project.project_status = ProjectStatus.ACTIVE
            project.approved_at = now
        else:
            project.approval_status = ApprovalStatus.REJECTED
            project.project_status = ProjectStatus.REJECTED
            project.rejected_reason = payload.reason

        approval = (
            self.db.query(Approval)
            .filter(
                Approval.entity_type == ApprovalEntityType.PROJECT,
                Approval.entity_id == project_id,
                Approval.decision == ApprovalStatus.PENDING,
            )
            .first()
        )
        if approval:
            approval.decision = payload.decision
            approval.decided_by = actor.id
            approval.decided_at = now
            approval.reason = payload.reason

        self._write_audit(
            actor=actor,
            action=f"PROJECT_{payload.decision.value.upper()}",
            entity_id=project.id,
            old_value={"approval_status": old_status},
            new_value={
                "approval_status": payload.decision.value,
                "reason": payload.reason,
            },
        )

        self.db.commit()
        self.db.refresh(project)
        return project

    def _calculate_progress(self, project_id: uuid.UUID) -> float:
        total_tasks = self.db.query(Task).filter(Task.project_id == project_id).count()
        if total_tasks == 0:
            return 0.0
        completed_tasks = self.db.query(Task).filter(
            Task.project_id == project_id,
            Task.status == TaskStatus.COMPLETED,
        ).count()
        return round((completed_tasks / total_tasks) * 100, 2)

    def _write_audit(
        self,
        *,
        actor: User,
        action: str,
        entity_id: uuid.UUID,
        old_value: dict | None = None,
        new_value: dict | None = None,
    ) -> None:
        self.db.add(
            AuditLog(
                actor_user_id=actor.id,
                action_type=action,
                entity_type="project",
                entity_id=entity_id,
                old_value=old_value,
                new_value=new_value,
            )
        )
