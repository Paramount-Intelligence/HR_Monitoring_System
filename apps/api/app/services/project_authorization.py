"""Project object-level authorization — default deny, no role fall-through."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, Query

from app.models.enums import UserRole, UserStatus
from app.models.project import Project
from app.models.task import Task
from app.models.user import User

PROJECT_CREATE_ROLES = frozenset(
    {
        UserRole.ADMIN,
        UserRole.HR_OPERATIONS,
        UserRole.MANAGER,
        UserRole.TEAM_LEAD,
        UserRole.EMPLOYEE,
    }
)

PROJECT_FULL_ACCESS_ROLES = frozenset({UserRole.ADMIN, UserRole.HR_OPERATIONS})
PROJECT_MANAGEMENT_ROLES = frozenset({UserRole.MANAGER, UserRole.TEAM_LEAD})


class ProjectAuthorizationService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def assert_can_create(self, actor: User) -> None:
        if actor.role not in PROJECT_CREATE_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to create projects.",
            )

    def can_read_project(self, actor: User, project: Project) -> bool:
        if actor.role in PROJECT_FULL_ACCESS_ROLES:
            return True
        if actor.role in PROJECT_MANAGEMENT_ROLES:
            if project.manager_id == actor.id:
                return True
            owner = self.db.get(User, project.owner_id)
            return bool(owner and owner.manager_id == actor.id)
        if project.owner_id == actor.id:
            return True
        assigned = (
            self.db.query(Task.id)
            .filter(Task.project_id == project.id, Task.assigned_to == actor.id)
            .first()
        )
        return assigned is not None

    def assert_can_read(self, actor: User, project: Project) -> None:
        if not self.can_read_project(actor, project):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

    def apply_list_scope(self, query: Query, actor: User) -> Query:
        if actor.role in PROJECT_FULL_ACCESS_ROLES:
            return query
        if actor.role in PROJECT_MANAGEMENT_ROLES:
            team_owner_ids = [
                row[0]
                for row in self.db.query(User.id)
                .filter(User.manager_id == actor.id, User.status == UserStatus.ACTIVE)
                .all()
            ]
            team_owner_ids.append(actor.id)
            return query.filter(
                or_(
                    Project.manager_id == actor.id,
                    Project.owner_id.in_(team_owner_ids),
                )
            )
        assigned_project_ids = [
            row[0]
            for row in self.db.query(Task.project_id)
            .filter(Task.assigned_to == actor.id)
            .distinct()
            .all()
        ]
        filters = [Project.owner_id == actor.id]
        if assigned_project_ids:
            filters.append(Project.id.in_(assigned_project_ids))
        return query.filter(or_(*filters))

    def resolve_manager_id_for_create(
        self, actor: User, requested_manager_id: uuid.UUID | None
    ) -> uuid.UUID:
        if actor.role in PROJECT_MANAGEMENT_ROLES:
            if requested_manager_id and requested_manager_id != actor.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Managers may only create projects assigned to themselves.",
                )
            return actor.id
        if requested_manager_id:
            manager = self.db.get(User, requested_manager_id)
            if not manager or manager.role not in (
                UserRole.MANAGER,
                UserRole.ADMIN,
                UserRole.TEAM_LEAD,
                UserRole.HR_OPERATIONS,
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="manager_id must reference a valid manager or admin user",
                )
            if actor.role not in PROJECT_FULL_ACCESS_ROLES and actor.manager_id != requested_manager_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You may only assign your reporting manager.",
                )
            return requested_manager_id
        if actor.manager_id:
            return actor.manager_id
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="manager_id is required when no reporting manager is assigned.",
        )
