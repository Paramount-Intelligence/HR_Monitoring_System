import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.enums import UserRole, ProjectStatus
from app.core.security import create_access_token

client = TestClient(app)

def test_api():
    db = SessionLocal()
    
    # Get an admin user
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if not admin:
        print("No admin user found")
        return
        
    admin_token = create_access_token(str(admin.id), admin.role.value)
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Get a project
    project = db.query(Project).filter(Project.project_status.in_([ProjectStatus.APPROVED, ProjectStatus.ACTIVE])).first()
    if not project:
        print("No active/approved project found")
        # Let's see if there's any project
        project = db.query(Project).first()
        if project:
            print(f"Found a project but status is {project.project_status}")
        else:
            print("No project exists in the database at all")
            return
            
    # Get an assignee
    assignee = db.query(User).filter(User.role == UserRole.MANAGER).first()
    if not assignee:
        assignee = db.query(User).filter(User.role == UserRole.EMPLOYEE).first()
        
    if not assignee:
        print("No assignee found")
        return
        
    print(f"Testing with Project ID: {project.id} ({project.title}, status={project.project_status})")
    print(f"Testing with Assignee ID: {assignee.id} ({assignee.full_name}, role={assignee.role})")
    
    # Test Case 1: due_date is empty string
    print("\n--- Test Case 1: due_date='' (empty string) ---")
    payload1 = {
        "project_id": str(project.id),
        "assigned_to": str(assignee.id),
        "title": "Analyze the system",
        "description": "hello am good thanks",
        "priority": "medium",
        "due_date": ""
    }
    res1 = client.post("/api/v1/tasks", json=payload1, headers=headers)
    print("Status Code:", res1.status_code)
    print("Response:", res1.text)
    
    # Test Case 2: due_date is null
    print("\n--- Test Case 2: due_date=None (null) ---")
    payload2 = {
        "project_id": str(project.id),
        "assigned_to": str(assignee.id),
        "title": "Analyze the system",
        "description": "hello am good thanks",
        "priority": "medium",
        "due_date": None
    }
    res2 = client.post("/api/v1/tasks", json=payload2, headers=headers)
    print("Status Code:", res2.status_code)
    print("Response:", res2.text)

    # Test Case 3: priority casing mismatch (e.g. "Medium")
    print("\n--- Test Case 3: priority='Medium' ---")
    payload3 = {
        "project_id": str(project.id),
        "assigned_to": str(assignee.id),
        "title": "Analyze the system",
        "description": "hello am good thanks",
        "priority": "Medium",
        "due_date": None
    }
    res3 = client.post("/api/v1/tasks", json=payload3, headers=headers)
    print("Status Code:", res3.status_code)
    print("Response:", res3.text)

    db.close()

if __name__ == "__main__":
    test_api()
