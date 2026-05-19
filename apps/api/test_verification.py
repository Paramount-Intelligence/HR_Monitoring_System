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

def run_tests():
    db = SessionLocal()
    
    # 1. Retrieve users
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    manager = db.query(User).filter(User.role == UserRole.MANAGER).first()
    employee = db.query(User).filter(User.role == UserRole.EMPLOYEE).first()
    
    if not admin:
        print("FAIL: No admin user found")
        return
    if not manager:
        print("FAIL: No manager user found")
        return
    if not employee:
        print("FAIL: No employee user found")
        return

    admin_token = create_access_token(str(admin.id), admin.role.value)
    employee_token = create_access_token(str(employee.id), employee.role.value)
    
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    employee_headers = {"Authorization": f"Bearer {employee_token}"}
    
    # 2. Retrieve approved/active project
    project = db.query(Project).filter(Project.project_status.in_([ProjectStatus.APPROVED, ProjectStatus.ACTIVE])).first()
    if not project:
        print("FAIL: No active/approved project found in database")
        return

    print("Verifying task creation payload constraints...")
    
    # Test 1: Task creation without due date (null)
    payload_no_due = {
        "project_id": str(project.id),
        "assigned_to": str(employee.id),
        "title": "Verification Task Without Due Date",
        "description": "Verification tests description",
        "priority": "medium",
        "due_date": None
    }
    res_no_due = client.post("/api/v1/tasks", json=payload_no_due, headers=admin_headers)
    assert res_no_due.status_code == 201, f"Expected 201, got {res_no_due.status_code}"
    print("SUCCESS: Task created successfully with due_date = null")
    
    # Test 2: Task creation with due date
    payload_with_due = {
        "project_id": str(project.id),
        "assigned_to": str(manager.id),
        "title": "Verification Task With Due Date",
        "description": "Verification tests description with date",
        "priority": "high",
        "due_date": "2026-06-01"
    }
    res_with_due = client.post("/api/v1/tasks", json=payload_with_due, headers=admin_headers)
    assert res_with_due.status_code == 201, f"Expected 201, got {res_with_due.status_code}"
    print("SUCCESS: Task created successfully with a valid due_date string")

    # Test 3: Non-admin role security verification on Admin Dashboard Overview
    res_overview_emp = client.get("/api/v1/tasks/admin/overview", headers=employee_headers)
    assert res_overview_emp.status_code == 403, f"Expected 403 for non-admin, got {res_overview_emp.status_code}"
    print("SUCCESS: Non-admin user access strictly rejected (403 Forbidden)")

    # Test 4: Admin dashboard overview works successfully for admin
    res_overview_admin = client.get("/api/v1/tasks/admin/overview", headers=admin_headers)
    assert res_overview_admin.status_code == 200, f"Expected 200 for admin, got {res_overview_admin.status_code}"
    print("SUCCESS: Admin user successfully loaded the tasks overview dashboard (200 OK)")

    db.close()
    print("\n--- ALL programmatic backend verification tests PASSED ---")

if __name__ == "__main__":
    run_tests()
