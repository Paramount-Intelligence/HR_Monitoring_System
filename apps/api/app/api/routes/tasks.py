"""Task routes."""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_admin
from app.models.enums import TaskStatus, TimerSessionStatus, ProjectPriority
from app.models.user import User
from app.schemas.task import TaskComplexity, TaskCreate, TaskRead, TaskUpdate, TaskCommentRead, TaskCommentCreate
from app.services.task_service import TaskService

router = APIRouter()


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED, summary="Create a task")
def create_task(payload: TaskCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TaskRead:
    return TaskService(db).create_task(payload, actor)


@router.get("", response_model=list[TaskRead], summary="List tasks (RBAC-scoped)")
def list_tasks(
    project_id: uuid.UUID | None = Query(None),
    assigned_to: uuid.UUID | None = Query(None),
    task_status: TaskStatus | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[TaskRead]:
    return TaskService(db).list_tasks(project_id=project_id, assigned_to=assigned_to, task_status=task_status, actor=actor)


@router.get("/{task_id}", response_model=TaskRead, summary="Get task by ID")
def get_task(task_id: uuid.UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TaskRead:
    return TaskService(db).get_task(task_id, actor)


@router.patch("/{task_id}", response_model=TaskRead, summary="Update task")
def update_task(task_id: uuid.UUID, payload: TaskUpdate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TaskRead:
    return TaskService(db).update_task(task_id, payload, actor)


@router.post("/{task_id}/complexity", response_model=TaskRead, summary="Set task complexity (manager/admin only)")
def set_complexity(task_id: uuid.UUID, payload: TaskComplexity, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TaskRead:
    return TaskService(db).set_complexity(task_id, payload, actor)

@router.get("/{task_id}/subtasks", response_model=list[TaskRead], summary="List subtasks for a task")
def list_subtasks(task_id: uuid.UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[TaskRead]:
    return TaskService(db).list_subtasks(task_id, actor)

@router.post("/{task_id}/comments", response_model=TaskCommentRead, status_code=status.HTTP_201_CREATED, summary="Add a comment to a task")
def create_comment(task_id: uuid.UUID, payload: TaskCommentCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> TaskCommentRead:
    return TaskService(db).create_comment(task_id, payload, actor)

@router.get("/{task_id}/comments", response_model=list[TaskCommentRead], summary="List comments for a task")
def list_comments(task_id: uuid.UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> list[TaskCommentRead]:
    return TaskService(db).list_comments(task_id, actor)


@router.get("/admin/overview", summary="Admin organizational tasks dashboard overview")
def get_admin_task_overview(
    search: str | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    project_id: uuid.UUID | None = Query(None),
    status: TaskStatus | None = Query(None),
    priority: ProjectPriority | None = Query(None),
    timer_state: str | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    from datetime import date, datetime, timezone
    from sqlalchemy import or_
    from app.models.task import Task
    from app.models.task_timer_session import TaskTimerSession
    
    # 1. Fetch active/paused timer sessions
    active_sessions = db.query(TaskTimerSession).filter(
        TaskTimerSession.status.in_([TimerSessionStatus.RUNNING, TimerSessionStatus.PAUSED])
    ).all()
    active_session_by_task = {s.task_id: s for s in active_sessions}
    
    # 2. Build task filter query
    query = db.query(Task)
    
    if search:
        query = query.filter(
            or_(
                Task.title.ilike(f"%{search}%"),
                Task.description.ilike(f"%{search}%")
            )
        )
    if employee_id:
        query = query.filter(Task.assigned_to == employee_id)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if start_date:
        query = query.filter(Task.due_date >= start_date)
    if end_date:
        query = query.filter(Task.due_date <= end_date)
        
    if timer_state:
        if timer_state == "running":
            task_ids = [s.task_id for s in active_sessions if s.status == TimerSessionStatus.RUNNING]
            query = query.filter(Task.id.in_(task_ids))
        elif timer_state == "paused":
            task_ids = [s.task_id for s in active_sessions if s.status == TimerSessionStatus.PAUSED]
            query = query.filter(Task.id.in_(task_ids))
        elif timer_state == "not_started":
            task_ids_with_sessions = [s.task_id for s in active_sessions]
            query = query.filter(~Task.id.in_(task_ids_with_sessions))

    total_count = query.count()
    tasks = query.order_by(Task.created_at.desc()).offset(offset).limit(limit).all()
    
    # 3. Aggregate statistics (overall dashboard health)
    total_tasks = db.query(Task).count()
    active_tasks = db.query(Task).filter(~Task.status.in_([TaskStatus.COMPLETED, TaskStatus.REVIEWED])).count()
    in_progress = db.query(Task).filter(Task.status == TaskStatus.IN_PROGRESS).count()
    completed = db.query(Task).filter(Task.status.in_([TaskStatus.COMPLETED, TaskStatus.REVIEWED])).count()
    
    overdue = db.query(Task).filter(
        Task.due_date < date.today(),
        ~Task.status.in_([TaskStatus.COMPLETED, TaskStatus.REVIEWED])
    ).count()
    
    currently_working = db.query(TaskTimerSession).filter(
        TaskTimerSession.status == TimerSessionStatus.RUNNING
    ).count()
    
    summary = {
        "total_tasks": total_tasks,
        "active_tasks": active_tasks,
        "in_progress": in_progress,
        "completed": completed,
        "overdue": overdue,
        "currently_working": currently_working,
    }
    
    # 4. Format active work timers list
    active_work_list = []
    for session in active_sessions:
        accumulated = session.accumulated_seconds or 0
        if session.status == TimerSessionStatus.RUNNING:
            now = datetime.now(timezone.utc)
            last_resumed = session.last_resumed_at
            if last_resumed.tzinfo is None:
                last_resumed = last_resumed.replace(tzinfo=timezone.utc)
            delta = (now - last_resumed).total_seconds()
            current_duration = int(accumulated + delta)
        else:
            current_duration = accumulated

        active_work_list.append({
            "id": str(session.id),
            "task_id": str(session.task_id),
            "task_title": session.task_title or "Untitled Task",
            "project_title": session.project_title or "No Project",
            "employee_id": str(session.user_id),
            "employee_name": session.user.full_name if session.user else "Unknown Employee",
            "employee_role": session.user.role.value if session.user else "employee",
            "timer_state": session.status.value,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "current_duration_seconds": max(0, current_duration),
            "pause_reason": session.pause_reason.value if session.pause_reason else None
        })

    # 5. Format tasks list
    task_list = []
    for t in tasks:
        task_data = TaskRead.from_orm(t).dict()
        
        # Add timer tracking details
        if t.id in active_session_by_task:
            session = active_session_by_task[t.id]
            accumulated = session.accumulated_seconds or 0
            if session.status == TimerSessionStatus.RUNNING:
                now = datetime.now(timezone.utc)
                last_resumed = session.last_resumed_at
                if last_resumed.tzinfo is None:
                    last_resumed = last_resumed.replace(tzinfo=timezone.utc)
                delta = (now - last_resumed).total_seconds()
                current_duration = int(accumulated + delta)
            else:
                current_duration = accumulated
            
            task_data["timer_state"] = session.status.value
            task_data["timer_duration_seconds"] = max(0, current_duration)
            task_data["timer_pause_reason"] = session.pause_reason.value if session.pause_reason else None
        else:
            task_data["timer_state"] = "not_started"
            task_data["timer_duration_seconds"] = 0
            task_data["timer_pause_reason"] = None
            
        task_list.append(task_data)

    return {
        "summary": summary,
        "total_count": total_count,
        "tasks": task_list,
        "active_work": active_work_list
    }
