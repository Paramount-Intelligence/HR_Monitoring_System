from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password

def fix_uat_passwords():
    db = SessionLocal()
    try:
        password = hash_password("Password123!")
        
        emails = ["admin@company.com", "emp@paramount.com", "employee@paramount.com", "intern@paramount.com", "junior@paramount.com"]
        
        for email in emails:
            user = db.query(User).filter(User.email == email).first()
            if user:
                user.password_hash = password
                print(f"Fixed password for {email}")
        
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    fix_uat_passwords()
