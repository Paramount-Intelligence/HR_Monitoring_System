"""Full Phase 1 integration test — runs against live API on localhost:8000."""
import sys
import requests

BASE = "http://localhost:8000/api/v1"
PASS = 0
FAIL = 0


def check(label, got, expected):
    global PASS, FAIL
    ok = got == expected
    status = "PASS" if ok else "FAIL"
    if not ok:
        FAIL += 1
        print(f"  [{status}] {label}: expected {expected}, got {got}")
    else:
        PASS += 1
        print(f"  [{status}] {label}")


# ── Login ──────────────────────────────────────────────────────────────────
print("\n=== AUTH ===")
r = requests.post(f"{BASE}/auth/login", json={"email": "admin@company.com", "password": "Admin1234!"})
check("admin login", r.status_code, 200)
admin_token = r.json().get("access_token", "")

r = requests.post(f"{BASE}/auth/login", json={"email": "sarah@company.com", "password": "Manager1234!"})
check("manager login", r.status_code, 200)
mgr_token = r.json().get("access_token", "")
mgr_id = r.json().get("user", {}).get("id")

r = requests.post(f"{BASE}/auth/login", json={"email": "alice@company.com", "password": "Employee1234!"})
check("employee login", r.status_code, 200)
emp_token = r.json().get("access_token", "")
emp_id = r.json().get("user", {}).get("id")

admin_h = {"Authorization": f"Bearer {admin_token}"}
mgr_h   = {"Authorization": f"Bearer {mgr_token}"}
emp_h   = {"Authorization": f"Bearer {emp_token}"}

r = requests.post(f"{BASE}/auth/refresh", json={"refresh_token": requests.post(f"{BASE}/auth/login", json={"email": "admin@company.com", "password": "Admin1234!"}).json().get("refresh_token", "")})
check("token refresh", r.status_code, 200)

# ── Attendance ────────────────────────────────────────────────────────────
print("\n=== ATTENDANCE ===")
r = requests.post(f"{BASE}/attendance/check-in", json={"work_mode": "office"}, headers=emp_h)
check("employee check-in", r.status_code, 200)
session_id = r.json().get("id")

r = requests.post(f"{BASE}/attendance/check-in", json={"work_mode": "wfh"}, headers=emp_h)
check("duplicate check-in blocked (409)", r.status_code, 409)

r = requests.get(f"{BASE}/attendance/active", headers=emp_h)
check("active session exists", r.status_code, 200)

r = requests.post(f"{BASE}/attendance/check-out", headers=emp_h)
check("employee check-out", r.status_code, 200)

r = requests.get(f"{BASE}/attendance/me", headers=emp_h)
check("own attendance history", r.status_code, 200)

r = requests.patch(f"{BASE}/attendance/{session_id}/correction-request", json={"reason": "Wrong work mode"}, headers=emp_h)
check("correction request", r.status_code, 200)

r = requests.get(f"{BASE}/attendance/team", headers=mgr_h)
check("manager team attendance", r.status_code, 200)

# ── Projects ──────────────────────────────────────────────────────────────
print("\n=== PROJECTS ===")
r = requests.post(f"{BASE}/projects", json={"title": "Alpha Project", "priority": "high", "manager_id": mgr_id}, headers=emp_h)
check("employee creates project", r.status_code, 201)
project_id = r.json().get("id")

r = requests.get(f"{BASE}/projects", headers=admin_h)
check("admin lists projects", r.status_code, 200)

r = requests.post(f"{BASE}/projects/{project_id}/approve", json={"decision": "approved", "reason": "Looks good"}, headers=mgr_h)
check("manager approves project", r.status_code, 200)
check("project is approved", r.json().get("approval_status"), "approved")

# ── Tasks ─────────────────────────────────────────────────────────────────
print("\n=== TASKS ===")
r = requests.post(f"{BASE}/tasks", json={"project_id": project_id, "assigned_to": emp_id, "title": "Build login page", "priority": "high"}, headers=mgr_h)
check("manager creates task", r.status_code, 201)
task_id = r.json().get("id")

r = requests.get(f"{BASE}/tasks", headers=emp_h)
check("employee lists own tasks", r.status_code, 200)
check("employee sees the assigned task", len(r.json()), 1)

r = requests.patch(f"{BASE}/tasks/{task_id}", json={"status": "in_progress"}, headers=emp_h)
check("employee sets task in_progress", r.status_code, 200)

r = requests.post(f"{BASE}/tasks/{task_id}/complexity", json={"complexity_level": 3, "expected_duration_minutes": 120}, headers=mgr_h)
check("manager sets complexity", r.status_code, 200)

r = requests.post(f"{BASE}/tasks/{task_id}/complexity", json={"complexity_level": 1, "expected_duration_minutes": 30}, headers=emp_h)
check("employee cannot set complexity (403)", r.status_code, 403)

# ── Time logs ─────────────────────────────────────────────────────────────
print("\n=== TIME LOGS ===")
r = requests.post(f"{BASE}/time-logs/start", json={"task_id": task_id}, headers=emp_h)
check("start timer", r.status_code, 200)
log_id = r.json().get("id")

r = requests.post(f"{BASE}/time-logs/start", json={"task_id": task_id}, headers=emp_h)
check("duplicate timer blocked (409)", r.status_code, 409)

r = requests.post(f"{BASE}/time-logs/stop", json={"task_id": task_id}, headers=emp_h)
check("stop timer", r.status_code, 200)

r = requests.get(f"{BASE}/time-logs/me", headers=emp_h)
check("own time logs", r.status_code, 200)

r = requests.get(f"{BASE}/time-logs/team", headers=mgr_h)
check("manager team time logs", r.status_code, 200)

# ── Dashboards ────────────────────────────────────────────────────────────
print("\n=== DASHBOARDS ===")
r = requests.get(f"{BASE}/dashboard/employee", headers=emp_h)
check("employee dashboard", r.status_code, 200)
check("task total >= 1", r.json()["tasks"]["total"] >= 1, True)

r = requests.get(f"{BASE}/dashboard/manager", headers=mgr_h)
check("manager dashboard", r.status_code, 200)
check("team attendance list present", isinstance(r.json()["team_attendance_today"], list), True)

r = requests.get(f"{BASE}/dashboard/admin", headers=admin_h)
check("admin dashboard", r.status_code, 200)
check("total_users >= 11", r.json()["total_users"] >= 11, True)

r = requests.get(f"{BASE}/dashboard/admin", headers=emp_h)
check("employee cannot access admin dashboard (403)", r.status_code, 403)

# ── Summary ───────────────────────────────────────────────────────────────
print(f"\n{'='*40}")
print(f"Results: {PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
