import httpx

# We need an admin token to perform the test
# Usually, I can just use the debug endpoint if available, but let's see what happens if I hit check-out without token:
# it will be 401. I need a valid token.
# Let's create a minimal test inside the app context using TestClient

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User

client = TestClient(app)
db = SessionLocal()

user = db.query(User).filter_by(email="alice@company.com").first()

if user:
    # First, let's create an active session
    # We bypass check-in route and create directly to avoid shift logic complexity
    from app.models.attendance_session import AttendanceSession, AttendanceSessionStatus
    from app.models.enums import WorkMode, AttendanceClassification
    from datetime import datetime, timezone
    
    session = db.query(AttendanceSession).filter_by(user_id=user.id, session_status=AttendanceSessionStatus.ACTIVE).first()
    if not session:
        session = AttendanceSession(
            user_id=user.id,
            check_in_at=datetime.now(timezone.utc),
            work_mode=WorkMode.OFFICE,
            session_status=AttendanceSessionStatus.ACTIVE,
            attendance_classification=AttendanceClassification.ACTIVE,
            is_late_login=False,
            is_early_logout=False
        )
        db.add(session)
        db.commit()

    # Now we call check-out using the dependency override or a token
    from app.core.security import create_access_token
    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Testing check-out with empty body {}...")
    res = client.post("/api/v1/attendance/check-out", json={}, headers=headers)
    print("Status:", res.status_code)
    print("Response:", res.json())
    
    print("\nTesting check-out with no body...")
    res2 = client.post("/api/v1/attendance/check-out", headers=headers)
    print("Status:", res2.status_code)
    try:
        print("Response:", res2.json())
    except:
        print("Response text:", res2.text)
