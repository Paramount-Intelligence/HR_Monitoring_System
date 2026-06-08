import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.notifications import Notification
from app.core.security import create_access_token

client = TestClient(app)

def test_notif():
    db = SessionLocal()
    alice = db.query(User).filter(User.email == "alice@company.com").first()
    if not alice:
        print("Alice not found")
        return
    token = create_access_token(str(alice.id), alice.role.value)
    
    # Check what notifications exist
    notifs = db.query(Notification).filter(Notification.user_id == alice.id).all()
    print(f"Total notifications in DB for Alice: {len(notifs)}")
    for n in notifs:
        print(f"ID: {n.id}, Type: {n.notification_type}, Title: {n.title}, Related: {n.related_entity_type}/{n.related_entity_id}")
        
    res = client.get(
        "/api/v1/notifications/",
        headers={"Authorization": f"Bearer {token}"}
    )
    print("GET /notifications Status:", res.status_code)
    if res.status_code != 200:
        print("Response text:", res.text)
    else:
        print("Success, JSON:", res.json())
        
    db.close()

if __name__ == "__main__":
    test_notif()
