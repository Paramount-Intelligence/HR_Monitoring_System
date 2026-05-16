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


class ProjectService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    def create_project(self, payload: ProjectCreate, actor: User) -> Project:
        # Default manager_id to actor if not provided
        target_manager_id = payload.manager_id or actor.id

        # Validate that manager_id points to a real manager/admin
        manager = self.db.get(User, target_manager_id)
        if not manager or manager.role not in (UserRole.MANAGER, UserRole.ADMIN):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="manager_id must reference a valid manager or admin user",
            )

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

        # Create an approval record
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

    # ------------------------------------------------------------------
    # List
    # ------------------------------------------------------------------

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

        # Managers only see projects assigned to them or created by their team
        if actor.role == UserRole.MANAGER:
            q = q.filter(Project.manager_id == actor.id)
        elif actor.role == UserRole.EMPLOYEE:
            q = q.filter(Project.owner_id == actor.id)

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
        """Return projects that are approved and active, scoped to the actor's visibility."""
        # A project is task-eligible if it has been approved. 
        # We accept both 'approved' and 'active' statuses for backward compatibility.
        q = self.db.query(Project).filter(
            Project.approval_status == ApprovalStatus.APPROVED,
            Project.project_status.in_([ProjectStatus.APPROVED, ProjectStatus.ACTIVE])
        )
        
        # Scope: By default, let employees see all approved projects 
        # so they can contribute to any active team project.
        if actor.role == UserRole.MANAGER:
            q = q.filter(Project.manager_id == actor.id)
        # Admins see all. Employees now also see all approved projects.
            
        projects = q.order_by(Project.created_at.desc()).all()
        return projects

    # ------------------------------------------------------------------
    # Get by ID
    # ------------------------------------------------------------------

    def get_project(self, project_id: uuid.UUID, actor: User) -> Project:
        project = self.db.get(Project, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        self._check_read_access(project, actor)
        project.progress_percentage = self._calculate_progress(project.id)
        return project

    # ------------------------------------------------------------------
    # Approve / Reject
    # ------------------------------------------------------------------

    def decide_project(
        self, project_id: uuid.UUID, payload: ProjectDecision, actor: User
    ) -> Project:
        if actor.role not in (UserRole.MANAGER, UserRole.ADMIN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        if payload.decision == ApprovalStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Decision must be 'approved' or 'rejected'",
            )

        project = self.db.get(Project, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        if actor.role == UserRole.MANAGER and project.manager_id != actor.id:
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

        # Update the approval record
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

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _check_read_access(self, project: Project, actor: User) -> None:
        if actor.role == UserRole.ADMIN:
            return
        if actor.role == UserRole.MANAGER and project.manager_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        if actor.role == UserRole.EMPLOYEE and project.owner_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    def _calculate_progress(self, project_id: uuid.UUID) -> float:
        total_tasks = self.db.query(Task).filter(Task.project_id == project_id).count()
        if total_tasks == 0:
            return 0.0
        completed_tasks = self.db.query(Task).filter(
            Task.project_id == project_id,
            Task.status == TaskStatus.COMPLETED
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
