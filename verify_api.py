import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "apps", "api"))

import json
from fastapi.testclient import TestClient
from app.main import app
from app.core.deps import get_db
from app.models.user import User
from app.models.enums import UserRole
from app.core.security import create_access_token

client = TestClient(app)

def run_tests():
    from app.db.session import SessionLocal
    db = SessionLocal()
    
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    employee = db.query(User).filter(User.role == UserRole.EMPLOYEE).first()
    
    if not admin or not employee:
        print("Could not find admin or employee in the database for testing.")
        return
        
    admin_token = create_access_token(str(admin.id), admin.role.value)
    employee_token = create_access_token(str(employee.id), employee.role.value)
    
    print(f"--- Running tests for Target Employee: {employee.email} ---")
    
    print("\n1. Backend API Check (Admin access)")
    res = client.get(
        f"/api/v1/users/{employee.id}/admin-profile",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    print(f"Status Code: {res.status_code}")
    if res.status_code != 200:
        print("ERROR: Expected 200")
        print(res.text)
        return
        
    data = res.json()
    print("Response keys:", list(data.keys()))
    
    required_keys = ['profile', 'attendance_sessions', 'leave_requests', 'eod_submissions', 'tasks', 'time_logs', 'projects', 'goals', 'activity_timeline']
    missing = [k for k in required_keys if k not in data]
    if missing:
        print(f"ERROR: Missing keys in response: {missing}")
    else:
        print("SUCCESS: All expected keys present.")
        
    print("\n2. Sensitive Field Check")
    raw_str = json.dumps(data).lower()
    bad_keys = ['password', 'hash', 'token', 'secret', 'smtp', 'private']
    found_bad = False
    
    for k in bad_keys:
        if k in raw_str:
            print(f"WARNING: Potential sensitive data '{k}' found in response.")
            found_bad = True
            
    if not found_bad:
        print("SUCCESS: No sensitive fields found in JSON output.")
        
    print("\n3. RBAC Check (Employee access)")
    res_emp = client.get(
        f"/api/v1/users/{employee.id}/admin-profile",
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    print(f"Status Code: {res_emp.status_code}")
    if res_emp.status_code == 403:
        print("SUCCESS: Employee access returned 403 Forbidden.")
    else:
        print(f"ERROR: Expected 403, got {res_emp.status_code}")
        
    db.close()

if __name__ == "__main__":
    run_tests()
