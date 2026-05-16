# 05 Backend Architecture

The backend is a robust API built with **FastAPI** (Python), designed for high performance, ease of use, and strong type safety.

## Core Structure
The backend code is located in `apps/api/app`.

```text
/app
  /api                  # Route handlers & API logic
    /routes             # Endpoint definitions grouped by module
    /router.py          # Main router registration
  /models               # SQLAlchemy database models
  /schemas              # Pydantic validation schemas
  /services             # Business logic layer
  /core                 # Configuration, security, and utils
  /db                   # Session management and migrations
  /worker               # Celery worker and task definitions
  /main.py              # Application entry point
```

## Layered Architecture

### 1. API Layer (`/api/routes`)
*   Handles HTTP requests and responses.
*   Uses Pydantic schemas for input validation and output serialization.
*   Enforces RBAC and permission checks via FastAPI dependencies.
*   Calls the Service Layer for all business logic.

### 2. Service Layer (`/services`)
*   Contains the core business logic of the application.
*   Handles complex operations, validations (e.g., overlapping leaves), and cross-entity interactions.
*   Isolated from HTTP-specific logic, making it easier to test and reuse (e.g., in background jobs).

### 3. Data Layer (`/models` & `/db`)
*   **SQLAlchemy**: Used as the ORM to interact with PostgreSQL.
*   **Alembic**: Handles database migrations.
*   **Session Management**: `SessionLocal` provides a database session per request.

### 4. Background Jobs (`/worker`)
*   **Celery**: Used for asynchronous processing.
*   **Redis**: Serves as the message broker.
*   Tasks include email alerts, report generation, and periodic metric recalculations.

## Design Patterns

### Dependency Injection
FastAPI's dependency injection system is used extensively for:
*   Database session management (`get_db`).
*   Authentication and User fetching (`get_current_user`).
*   Role and Permission enforcement (`check_permissions`).

### Error Handling
*   Centralized exception handlers in `main.py` convert internal errors and validation failures into standardized JSON responses.
*   Uses custom HTTP exceptions with descriptive codes (e.g., `VALIDATION_ERROR`, `AUTH_ERROR`, `CONFLICT`).

### Transaction Management
*   Crucial operations (like Leave submissions) use an atomic pattern:
    1.  Create primary entity.
    2.  `db.flush()` to generate IDs.
    3.  Create related entities (e.g., Timeline).
    4.  `db.commit()` to persist all changes at once.

## Key Services
*   **AttendanceService**: Manages check-in/out, late detection, and classification.
*   **LeaveService**: Handles complex overlap validation and approval routing.
*   **AuthService**: Manages JWT generation, password hashing, and token refresh.
*   **EmailService**: Handles template rendering and asynchronous email delivery.

## Security
*   **Password Hashing**: BCrypt (via Passlib).
*   **JWT**: Scoped tokens for Access and Refresh.
*   **CORS**: Middleware configured to trust specific domains.

## Environment Configuration
The backend loads settings from a `.env` file using `pydantic-settings`. This includes:
*   Database URLs (Local SQLite vs Production Postgres).
*   SMTP configuration.
*   JWT secret keys.
*   Bootstrap admin credentials.
