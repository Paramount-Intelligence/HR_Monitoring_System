from sqlalchemy.orm import Session
from app.models.user import User
from app.models.enums import UserRole
from app.db.session import SessionLocal
import uuid

def check_role_parity():
    db = SessionLocal()
    try:
        # Check if roles exist
        roles = [r.value for r in UserRole]
        print(f"Supported Roles: {roles}")
        
        # Verify Intern and Junior Employee exist in the system
        # Actually, they are just enum values.
        # We need to verify if the routes/logic treat them the same.
        
        # Scenario: Admin bootstrap
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if admin:
            print(f"Admin '{admin.full_name}' found.")
        else:
            print("WARNING: No Admin found.")
            
        # Scenario: HR
        hr = db.query(User).filter(User.role == UserRole.HR_OPERATIONS).first()
        if hr:
            print(f"HR '{hr.full_name}' found.")
        else:
            print("WARNING: No HR found.")

    finally:
        db.close()

if __name__ == "__main__":
    check_role_parity()
