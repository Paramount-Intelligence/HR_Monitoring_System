import requests

BASE_URL = "http://localhost:8000/api/v1"

def login(email):
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": "Password123!"})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    print(f"Login failed for {email}: {resp.status_code} {resp.text}")
    return None

def probe_endpoints():
    manager_token = login("manager@paramount.com")
    if not manager_token: return
    
    headers = {"Authorization": f"Bearer {manager_token}"}
    
    endpoints = [
        "/leaves/pending",
        "/attendance/corrections/pending",
        "/reports/manager?start_date=2026-04-01&end_date=2026-04-30"
    ]
    
    for ep in endpoints:
        resp = requests.get(f"{BASE_URL}{ep}", headers=headers)
        print(f"GET {ep} -> {resp.status_code}")
        if resp.status_code != 200:
            print(f"ERROR: {resp.text}")

if __name__ == "__main__":
    probe_endpoints()
