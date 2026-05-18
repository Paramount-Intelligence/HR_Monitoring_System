# 20 Postgres Migration and Bootstrap

This document details how to initialize the production database and set up the first Administrative account.

## 1. Database Initialization
Before the application can run, the PostgreSQL schema must be created. The system uses **Alembic** for migration management.

### Environment Requirements
*   `DATABASE_URL`: Must be set to a valid PostgreSQL connection string (e.g., `postgresql://user:password@host:port/dbname`).
*   **Note**: Railway provides this automatically when you link the Postgres service to the API.

### Migration Command
From the `apps/api` directory (with virtual environment active):
```bash
alembic upgrade head
```
This will:
1.  Connect to the database.
2.  Create all tables (Users, Attendance, Projects, etc.).
3.  Apply any pending schema changes.

## 2. Admin Bootstrap
Once the tables are created, you need an Admin account to log in for the first time. The system includes an automated bootstrapper that runs on API startup.

### Bootstrap Credentials
The following values are used by default (and can be overridden in `.env`):
*   **Email**: value of `BOOTSTRAP_ADMIN_EMAIL`
*   **Password**: value of `BOOTSTRAP_ADMIN_PASSWORD`
*   **Name**: `HR Admin`

### How to Bootstrap
1.  Ensure `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are set in your environment.
2.  Start the API:
    ```bash
    python main.py
    ```
3.  The backend will detect if the admin user exists. If not, it will:
    *   Hash the password.
    *   Create the User with the `admin` role.
    *   Set the status to `active`.
    *   Log a success message with the configured bootstrap admin email.

### Important Security Note
> [!CAUTION]
> The bootstrap password is provided as a plain-text environment variable for the initial setup. **You must change this password immediately after your first login** via the user profile settings.

## 3. Permission Seeding
Along with the Admin user, the system seeds the base permission matrix required for RBAC logic. This also happens automatically on startup during the `seed_permissions` phase.

## 4. Verifying the Setup
1.  Open the login page.
2.  Enter the bootstrap credentials.
3.  Upon successful login, you should be redirected to the **Org Dashboard** (`/admin/dashboard`).
4.  Navigate to **Users & Teams** to verify you can see the user list (currently only yourself).

## 5. Troubleshooting
*   **`Relation "users" does not exist`**: You missed the `alembic upgrade head` step.
*   **Bootstrap fails with `IntegrityError`**: Usually means the user already exists. The bootstrapper is idempotent and will try to sync the name/password if the user exists but credentials differ.
*   **`Password is too short`**: Ensure the `BOOTSTRAP_ADMIN_PASSWORD` has no leading/trailing spaces in the `.env` file.
