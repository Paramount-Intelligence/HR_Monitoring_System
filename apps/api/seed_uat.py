from app.db.session import SessionLocal
from app.models.user import User
from app.models.enums import UserRole
from app.core.security import hash_password
import uuid

def seed_uat_users():
    db = SessionLocal()
    try:
        password = hash_password("Password123!")
        
        users = [
            {"email": "hr@paramount.com", "full_name": "HR Manager", "role": UserRole.HR_OPERATIONS},
            {"email": "manager@paramount.com", "full_name": "Team Manager", "role": UserRole.MANAGER},
            {"email": "lead@paramount.com", "full_name": "Team Lead", "role": UserRole.TEAM_LEAD},
            {"email": "emp@paramount.com", "full_name": "Standard Employee", "role": UserRole.EMPLOYEE},
            {"email": "intern@paramount.com", "full_name": "UAT Intern", "role": UserRole.INTERN},
            {"email": "junior@paramount.com", "full_name": "Junior Dev", "role": UserRole.JUNIOR_EMPLOYEE},
        ]
        
        for u in users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                new_user = User(
                    email=u["email"],
                    full_name=u["full_name"],
                    role=u["role"],
                    password_hash=password,
                    status="active"
                )
                db.add(new_user)
                print(f"Seeded {u['role']} - {u['email']}")
        
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    seed_uat_users()
