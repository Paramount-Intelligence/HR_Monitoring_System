# 18 Local Development Guide

Follow this guide to set up the Workforce Intelligence & Execution OS on your local machine for development and testing.

## 1. Prerequisites
*   **Node.js**: v18.x or v20.x
*   **Python**: v3.10 or v3.11
*   **Redis**: Required for background jobs (Celery). You can run it via Docker or as a local service.
*   **SQLite**: Used by default for local development (No setup required).

## 2. Environment Setup
1.  **Clone the repository**.
2.  **Create `.env` file**: Copy `.env.example` to the root directory.
    ```bash
    cp .env.example .env
    ```
3.  **Update Variables**:
    *   Set `APP_SECRET_KEY` to a random string.
    *   (Optional) Configure `SMTP_` variables if you want to test emails.
    *   Ensure `DATABASE_URL` is commented out or set to a local Postgres if you're not using the default SQLite fallback.

## 3. Backend Setup (API)
1.  Navigate to the API directory:
    ```bash
    cd apps/api
    ```
2.  Create a virtual environment and install dependencies:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```
3.  Run Migrations:
    ```bash
    alembic upgrade head
    ```
4.  Start the API:
    ```bash
    python main.py
    ```
    The API will be available at `http://localhost:8000`.

## 4. Frontend Setup (Web)
1.  Navigate to the Web directory:
    ```bash
    cd apps/web
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The Web app will be available at `http://localhost:3000`.

## 5. Worker Setup (Celery)
1.  Ensure Redis is running:
    ```bash
    redis-server
    ```
2.  From the `apps/api` directory (with venv active):
    ```bash
    python -m celery -A app.worker worker --loglevel=info --pool=solo
    ```

## 6. Initial Seed & Admin
The system is configured to automatically seed permissions and bootstrap a default admin user on startup.
*   **Default Admin**: `hr.picentral@gmail.com`
*   **Default Password**: `aliazzam1995`

## 7. Common Local Errors
*   **`ChunkLoadError`**: Usually caused by a stale Next.js cache. Run `rm -rf .next` in `apps/web` and restart.
*   **Redis Connection Refused**: Ensure the Redis server is running and the `REDIS_URL` in `.env` is correct.
*   **Database Locked**: Common with SQLite if multiple processes (API and Worker) try to write simultaneously. Restart the services.

## 8. Useful Commands
*   **Reset Database (SQLite)**: Delete `workforce_intelligence.db` and run `alembic upgrade head`.
*   **Linting**: `npm run lint` (web) or `flake8` (api).
