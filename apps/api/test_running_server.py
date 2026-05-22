import urllib.request
import urllib.error
import json
import sys

sys.path.append(r"d:\HR Monitoring System\apps\api")
from app.db.session import SessionLocal
from app.models.user import User
from app.models.communication import Conversation, ConversationParticipant, CallSession
from app.core.security import create_access_token
from app.models.enums import ConversationType

db = SessionLocal()
user_id = None
user_role = None
user_name = None
conversation_id = None

try:
    # 1. Get an active user to authenticate
    user = db.query(User).filter(User.status == "active").first()
    if not user:
        print("No active user found!")
        sys.exit(1)
        
    user_id = user.id
    user_role = user.role.value
    user_name = user.full_name
    
    # 2. Get a direct conversation where this user is a participant
    conversation = db.query(Conversation).filter(
        Conversation.type == ConversationType.DIRECT
    ).join(ConversationParticipant).filter(
        ConversationParticipant.user_id == user.id
    ).first()
    
    if not conversation:
        conversation = db.query(Conversation).filter(Conversation.type == ConversationType.DIRECT).first()
        
    if conversation:
        conversation_id = conversation.id
finally:
    db.close()

if not conversation_id:
    print("No direct conversation found!")
    sys.exit(1)

token = create_access_token(str(user_id), user_role)
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

print(f"Testing running server with Conversation ID: {conversation_id}")
print(f"User: {user_name} (ID: {user_id})")

# Check health first
try:
    req = urllib.request.Request("http://localhost:8000/health")
    with urllib.request.urlopen(req, timeout=3) as res:
        print("Server health check:", res.status, res.read().decode())
except Exception as e:
    print("Failed to reach server at port 8000:", e)
    sys.exit(1)

# Call start endpoint on the running server
url = f"http://localhost:8000/api/v1/messages/conversations/{conversation_id}/calls/start"
data = json.dumps({"call_type": "voice"}).encode()

req = urllib.request.Request(url, data=data, headers=headers, method="POST")
try:
    with urllib.request.urlopen(req, timeout=5) as res:
        print("Response status:", res.status)
        print("Response body:", res.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP Error Response status:", e.code)
    print("HTTP Error Response body:", e.read().decode())
except Exception as e:
    print("Error during call:", e)
