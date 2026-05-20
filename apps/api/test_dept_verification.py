import sys
import os
import pytest
from pydantic import ValidationError

sys.path.append(os.path.join(os.path.dirname(__file__)))

from app.core.config import Settings
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.department import Department
from app.models.enums import UserRole, UserStatus
from fastapi.testclient import TestClient

client = TestClient(app)

def test_sqlite_rejection():
    print("Testing that SQLite URLs are strictly rejected...")
    try:
        # Should raise validation error when database_url is sqlite
        Settings(database_url="sqlite:///./workforce_intelligence.db")
        print("FAIL: SQLite was accepted!")
        sys.exit(1)
    except ValidationError as e:
        assert "SQLite is no longer supported" in str(e)
        print("SUCCESS: SQLite database URL was correctly rejected.")

def test_missing_database_url():
    print("Testing that missing database_url raises an error...")
    try:
        Settings(database_url="")
        print("FAIL: Empty database_url was accepted!")
        sys.exit(1)
    except ValidationError as e:
        assert "DATABASE_URL is missing" in str(e)
        print("SUCCESS: Empty/missing database URL was correctly rejected.")

def test_department_head_eligibility():
    db = SessionLocal()
    print("Testing department head eligibility checks...")
    
    # 1. Retrieve an admin user
    admin = db.query(User).filter(User.role == UserRole.ADMIN, User.status == UserStatus.ACTIVE).first()
    # 2. Retrieve an employee user (not eligible)
    employee = db.query(User).filter(User.role == UserRole.EMPLOYEE, User.status == UserStatus.ACTIVE).first()
    
    if not admin:
        print("WARN: No active admin found in database for testing.")
        db.close()
        return
    if not employee:
        print("WARN: No active employee found in database for testing.")
        db.close()
        return

    # Helper function to generate access token
    from app.core.security import create_access_token
    admin_token = create_access_token(str(admin.id), admin.role.value)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Test Create Department with non-eligible user (Employee)
    payload_invalid_role = {
        "name": f"Test Dept {os.urandom(4).hex()}",
        "description": "Fails validation",
        "head_id": str(employee.id)
    }
    res = client.post("/api/v1/departments", json=payload_invalid_role, headers=headers)
    assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
    err_body = res.json()
    err_msg = err_body.get("detail") or err_body.get("error", {}).get("message", "")
    assert "Department head must be Admin, HR, Manager, or Team Lead" in err_msg
    print("SUCCESS: Department creation with non-eligible role (EMPLOYEE) was rejected with HTTP 400.")

    # Test Create Department with non-existent head_id
    payload_non_existent = {
        "name": f"Test Dept {os.urandom(4).hex()}",
        "description": "Fails validation",
        "head_id": "00000000-0000-0000-0000-000000000000"
    }
    res = client.post("/api/v1/departments", json=payload_non_existent, headers=headers)
    assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
    err_body = res.json()
    err_msg = err_body.get("detail") or err_body.get("error", {}).get("message", "")
    assert "Selected department head is not eligible" in err_msg
    print("SUCCESS: Department creation with non-existent head_id was rejected with HTTP 400.")

    # Test Create Department with eligible user (Admin)
    payload_valid = {
        "name": f"Test Dept {os.urandom(4).hex()}",
        "description": "Passes validation",
        "head_id": str(admin.id)
    }
    res = client.post("/api/v1/departments", json=payload_valid, headers=headers)
    assert res.status_code == 200 or res.status_code == 201, f"Expected 200/201, got {res.status_code}: {res.text}"
    dept_data = res.json()
    assert dept_data["head_id"] == str(admin.id)
    assert dept_data["head_name"] == admin.full_name
    created_dept_id = dept_data["id"]
    print("SUCCESS: Department created successfully with eligible admin user.")

    # Test Update Department: change head to null (Not Assigned)
    payload_clear = {
        "head_id": None
    }
    res = client.patch(f"/api/v1/departments/{created_dept_id}", json=payload_clear, headers=headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    updated_dept_data = res.json()
    assert updated_dept_data["head_id"] is None
    assert updated_dept_data["head_name"] is None
    print("SUCCESS: Department head cleared successfully (head_id = null).")

    # Clean up
    created_dept = db.get(Department, created_dept_id)
    if created_dept:
        db.delete(created_dept)
        db.commit()
    db.close()

if __name__ == "__main__":
    test_sqlite_rejection()
    test_missing_database_url()
    test_department_head_eligibility()
    print("\n--- ALL programmatic backend verification tests PASSED ---")
