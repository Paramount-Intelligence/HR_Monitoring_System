import sys
import os

sys.path.append(r"d:\HR Monitoring System\apps\api")

from app.db.session import SessionLocal
from app.models.communication import Conversation, ConversationParticipant, CallSession, CallParticipant, CallSignal

db = SessionLocal()
try:
    print("=== LATEST CALL SESSIONS ===")
    calls = db.query(CallSession).order_by(CallSession.created_at.desc()).limit(10).all()
    for c in calls:
        print(f"CallSession ID: {c.id}")
        print(f"  Conversation ID: {c.conversation_id}")
        print(f"  Started By ID: {c.started_by_id}")
        print(f"  Call Type: {c.call_type}")
        print(f"  Status: {c.status}")
        print(f"  Created At: {c.created_at}")
        print(f"  Ended At: {c.ended_at}")
        
    print("\n=== LATEST CONVERSATIONS ===")
    convs = db.query(Conversation).order_by(Conversation.created_at.desc()).limit(5).all()
    for cv in convs:
        print(f"Conversation ID: {cv.id}")
        print(f"  Type: {cv.type}")
        print(f"  Title: {cv.title}")
        parts = db.query(ConversationParticipant).filter_by(conversation_id=cv.id).all()
        print(f"  Participants ({len(parts)}): {[p.user_id for p in parts]}")
finally:
    db.close()
