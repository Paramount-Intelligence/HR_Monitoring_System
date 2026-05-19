import uuid
from app.schemas.task import TaskCreate
from app.services.task_service import TaskService
from app.models.user import User
from app.models.enums import ProjectPriority, UserRole
from sqlalchemy.orm import Session
from sqlalchemy import create_engine

def run_test():
    # Setup test database connection
    engine = create_engine("sqlite:///./workforce_intelligence.db")
    db = Session(engine)
    
    # 1. Fetch System Admin as actor
    actor = db.query(User).filter(User.role == UserRole.ADMIN).first()
    print(f"Actor: {actor.full_name} ({actor.role.value})")
    
    # 2. Get active project ID
    # Let's use the HR dashboard project (active)
    project_id = uuid.UUID("1468d78a61354718be6d1e97c63094db")
    
    # 3. Get assignee (Sarah Manager, role=manager)
    assignee = db.query(User).filter(User.role == UserRole.MANAGER).first()
    print(f"Assignee: {assignee.full_name} ({assignee.role.value})")
    
    try:
        # Create TaskCreate payload with empty string for due_date (as if sent by frontend)
        # Note: Pydantic TaskCreate expects due_date: date | None = None
        # Let's test what happens when due_date is sent as empty string vs None
        
        # Test Case A: due_date as None
        print("\n--- Test Case A: due_date=None ---")
        payload = TaskCreate(
            project_id=project_id,
            assigned_to=assignee.id,
            title="Analyze the system",
            description="hello am good thanks",
            priority=ProjectPriority.MEDIUM,
            due_date=None
        )
        task = TaskService(db).create_task(payload, actor)
        print(f"Success! Task ID: {task.id}")
        
    except Exception as e:
        print(f"Error in Case A: {e}")
        
    try:
        # Test Case B: due_date as empty string
        # Let's see if this fails Pydantic validation!
        print("\n--- Test Case B: due_date='' ---")
        payload = TaskCreate(
            project_id=project_id,
            assigned_to=assignee.id,
            title="Analyze the system",
            description="hello am good thanks",
            priority=ProjectPriority.MEDIUM,
            due_date=""  # Empty string
        )
        print("Pydantic Validation Succeeded for empty string!")
    except Exception as e:
        print(f"Pydantic Validation Failed: {e}")
        
    db.close()

if __name__ == '__main__':
    run_test()
