"""Project routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.enums import ApprovalStatus, ProjectStatus
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectDecision, ProjectRead, ProjectUpdate
from app.services.project_service import ProjectService

router = APIRouter()


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED, summary="Create a project")
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> ProjectRead:
    return ProjectService(db).create_project(payload, actor)


@router.get("", response_model=list[ProjectRead], summary="List projects (RBAC-scoped)")
def list_projects(
    approval_status: ApprovalStatus | None = Query(None),
    project_status: ProjectStatus | None = Query(None),
    owner_id: uuid.UUID | None = Query(None),
    manager_id: uuid.UUID | None = Query(None),
    include_archived: bool = Query(False),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[ProjectRead]:
    return ProjectService(db).list_projects(
        approval_status=approval_status,
        project_status=project_status,
        owner_id=owner_id,
        manager_id=manager_id,
        include_archived=include_archived,
        actor=actor,
    )


@router.get("/task-eligible", response_model=list[ProjectRead], summary="Get approved projects available for task creation")
def list_task_eligible_projects(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[ProjectRead]:
    return ProjectService(db).list_task_eligible_projects(actor=actor)


@router.get("/{project_id}", response_model=ProjectRead, summary="Get project by ID")
def get_project(project_id: uuid.UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> ProjectRead:
    return ProjectService(db).get_project(project_id, actor)


@router.patch("/{project_id}", response_model=ProjectRead, summary="Update a project")
def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> ProjectRead:
    return ProjectService(db).update_project(project_id, payload, actor)


@router.patch("/{project_id}/archive", response_model=ProjectRead, summary="Archive a project (soft delete)")
def archive_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> ProjectRead:
    return ProjectService(db).archive_project(project_id, actor)


@router.post("/{project_id}/approve", response_model=ProjectRead, summary="Approve or reject a project")
def decide_project(project_id: uuid.UUID, payload: ProjectDecision, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> ProjectRead:
    return ProjectService(db).decide_project(project_id, payload, actor)
