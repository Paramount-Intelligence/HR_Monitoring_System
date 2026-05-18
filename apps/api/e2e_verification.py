import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "apps", "api"))

from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.attendance_session import AttendanceSession
from app.core.security import create_access_token
import time

BASE_URL = "/api/v1"
client = TestClient(app)
db = SessionLocal()

user = db.query(User).filter_by(email="alice@company.com").first()
admin_user = db.query(User).filter_by(email="admin@company.com").first()

if not user or not admin_user:
    print("Users not found in DB")
    exit(1)

token = create_access_token(str(user.id), user.role.value)
admin_token = create_access_token(str(admin_user.id), admin_user.role.value)

headers = {"Authorization": f"Bearer {token}"}
admin_headers = {"Authorization": f"Bearer {admin_token}"}
print("Logged in successfully.")

res = client.get(f"{BASE_URL}/projects", headers=headers)
if res.status_code != 200 or not res.json():
    p_res = client.post(f"{BASE_URL}/projects", json={"name": "Test Project", "description": "Desc", "priority": "high"}, headers=admin_headers)
    project_id = p_res.json()["id"]
else:
    project_id = res.json()[0]["id"]

res = client.get(f"{BASE_URL}/tasks?project_id={project_id}", headers=headers)
if res.status_code != 200 or not res.json():
    t_res = client.post(f"{BASE_URL}/tasks", json={
        "project_id": project_id,
        "title": "E2E Test Task",
        "description": "Integration testing",
        "priority": "high",
        "assigned_to": str(user.id)
    }, headers=headers)
    task_id = t_res.json()["id"]
else:
    task_id = res.json()[0]["id"]

print(f"Using Task ID: {task_id}")

print("Cleaning up existing state...")
active = client.get(f"{BASE_URL}/time-logs/active-timer", headers=headers).json()
if active and "task_id" in active:
    client.post(f"{BASE_URL}/time-logs/stop", json={"task_id": active["task_id"]}, headers=headers)
client.post(f"{BASE_URL}/attendance/breaks/end", headers=headers)
client.post(f"{BASE_URL}/attendance/check-out", json={"early_checkout_reason": "cleanup"}, headers=headers)

db.query(AttendanceSession).filter_by(user_id=user.id, session_status="active").update({"session_status": "completed"})
db.commit()

from datetime import datetime, timedelta, timezone

print("\n--- 1. & 2. Checkout 422 & Early Checkout ---")
res = client.post(f"{BASE_URL}/attendance/check-in", json={"work_mode": "office"}, headers=headers)
print("Check In:", res.status_code)

session = db.query(AttendanceSession).filter_by(user_id=user.id, session_status="active").first()
if session:
    now = datetime.now(timezone.utc)
    session.expected_shift_end_at = now + timedelta(hours=24)
    db.commit()

res = client.post(f"{BASE_URL}/attendance/check-out", json={}, headers=headers)
print("Checkout without reason (Expect 400):", res.status_code, res.json())

res = client.post(f"{BASE_URL}/attendance/check-out", json={"early_checkout_reason": "early departure"}, headers=headers)
print("Checkout with valid reason:", res.status_code)
if res.status_code == 200:
    print("early_checkout_reason stored:", res.json().get("early_checkout_reason"))

print("\n--- 3. Attendance Checkout Auto-Pause ---")
client.post(f"{BASE_URL}/attendance/check-in", json={"work_mode": "office"}, headers=headers)

res = client.post(f"{BASE_URL}/time-logs/start", json={"task_id": task_id}, headers=headers)
print("Start Task Timer:", res.status_code)

res = client.post(f"{BASE_URL}/attendance/check-out", json={"early_checkout_reason": "pausing for the day"}, headers=headers)
print("Checkout status in step 3:", res.status_code)

res = client.get(f"{BASE_URL}/time-logs/active-timer", headers=headers)
active_timer = res.json()
print("Timer status after checkout:", active_timer.get("status") if active_timer else "None")
print("Timer pause_reason after checkout:", active_timer.get("pause_reason") if active_timer else "None")

print("\n--- 4. Attendance Check-in Auto-Resume ---")
client.post(f"{BASE_URL}/attendance/check-in", json={"work_mode": "office"}, headers=headers)
res = client.get(f"{BASE_URL}/time-logs/active-timer", headers=headers)
active_timer = res.json()
print("Timer status after check-in:", active_timer.get("status") if active_timer else "None")

print("\n--- 5. & 6. Break Auto-Pause & Resume ---")
res = client.post(f"{BASE_URL}/attendance/breaks/start", json={"break_type": "dinner"}, headers=headers)
print("Start Break:", res.status_code)

res = client.get(f"{BASE_URL}/time-logs/active-timer", headers=headers)
active_timer = res.json()
print("Timer status after break start:", active_timer.get("status") if active_timer else "None")
print("Timer pause_reason after break start:", active_timer.get("pause_reason") if active_timer else "None")

res = client.post(f"{BASE_URL}/attendance/breaks/end", headers=headers)
print("End Break:", res.status_code)

res = client.get(f"{BASE_URL}/time-logs/active-timer", headers=headers)
active_timer = res.json()
print("Timer status after break end:", active_timer.get("status") if active_timer else "None")

print("\n--- 7. Manual Pause Isolation ---")
res = client.post(f"{BASE_URL}/time-logs/pause", json={"task_id": task_id}, headers=headers)
print("Manual Pause:", res.status_code)
client.post(f"{BASE_URL}/attendance/breaks/start", json={"break_type": "other", "note": "coffee"}, headers=headers)
client.post(f"{BASE_URL}/attendance/breaks/end", headers=headers)
res = client.get(f"{BASE_URL}/time-logs/active-timer", headers=headers)
active_timer = res.json()
print("Timer status after break (manual pause):", active_timer.get("status") if active_timer else "None")
print("Timer pause_reason after break (manual pause):", active_timer.get("pause_reason") if active_timer else "None")

client.post(f"{BASE_URL}/attendance/check-out", json={"early_checkout_reason": "manual pause test"}, headers=headers)
client.post(f"{BASE_URL}/attendance/check-in", json={"work_mode": "office"}, headers=headers)
res = client.get(f"{BASE_URL}/time-logs/active-timer", headers=headers)
active_timer = res.json()
print("Timer status after checkout/check-in (manual pause):", active_timer.get("status") if active_timer else "None")
print("Timer pause_reason after checkout/check-in (manual pause):", active_timer.get("pause_reason") if active_timer else "None")

print("\n--- 8. Duration Accuracy ---")
res = client.post(f"{BASE_URL}/time-logs/stop", json={"task_id": task_id}, headers=headers)
print("Stop Task:", res.status_code)
if res.status_code == 200:
    time_log = res.json()
    print("Final TimeLog created:", "Yes" if "id" in time_log else "No")
    print(f"Recorded Duration: {time_log.get('duration_minutes')} minutes")
else:
    print("Stop task failed:", res.json())

client.post(f"{BASE_URL}/attendance/check-out", json={"early_checkout_reason": "cleanup complete"}, headers=headers)
print("\nAll integration tests finished successfully.")
