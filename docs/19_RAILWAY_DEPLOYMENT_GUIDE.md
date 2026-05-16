# 19 Railway Deployment Guide

This guide outlines the steps to deploy the Workforce Intelligence & Execution OS to **Railway** for production pilot usage.

## 1. Target Services
A full deployment requires the following services on Railway:
*   **PostgreSQL**: Primary transactional database.
*   **Redis**: Message broker for Celery.
*   **Backend API**: FastAPI service.
*   **Frontend**: Next.js service.
*   **Worker**: Celery worker service (can be a separate service or a background process in the API).

## 2. Environment Variables (Railway)
Ensure the following variables are configured in the Railway dashboard for the respective services:

### Shared
*   `APP_ENV`: `production`
*   `DATABASE_URL`: (Automatically provided by Railway Postgres)
*   `REDIS_URL`: (Automatically provided by Railway Redis)

### Backend API
*   `APP_SECRET_KEY`: (Secure random string)
*   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: (Your production SMTP provider)
*   `FRONTEND_BASE_URL`: The URL of your deployed Next.js app.
*   `CORS_ORIGINS`: Your frontend domain (e.g., `https://your-app.up.railway.app`).

### Frontend
*   `NEXT_PUBLIC_API_BASE_URL`: The public URL of your deployed Backend API.
*   `NEXT_PUBLIC_APP_NAME`: `Workforce Intelligence & Execution OS`

## 3. Build & Start Commands

### Backend API
*   **Build Command**: `pip install -r requirements.txt`
*   **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend
*   **Build Command**: `npm run build`
*   **Start Command**: `npm run start`

### Worker
*   **Start Command**: `python -m celery -A app.worker worker --loglevel=info --pool=solo`

## 4. Deployment Steps
1.  **Create Project**: Create a new project on Railway.
2.  **Add Database**: Add "Provision PostgreSQL" and "Provision Redis".
3.  **Connect Repo**: Connect your GitHub repository.
4.  **Configure Services**:
    *   Set the root directory to `apps/api` for the Backend service.
    *   Set the root directory to `apps/web` for the Frontend service.
5.  **Set Variables**: Copy variables from your local `.env` (excluding local file paths).
6.  **Deploy**: Railway will automatically trigger builds on push to the connected branch.

## 5. Post-Deployment Smoke Test
- [ ] Verify the API health endpoint: `https://your-api.up.railway.app/health`.
- [ ] Verify the Frontend loads and can reach the API.
- [ ] Run the **Admin Bootstrap** command (see Doc 20).
- [ ] Test a single Check-In / Check-Out flow.
- [ ] Verify the Celery worker is processing logs without errors.

## 6. Important Production Notes
*   **CORS**: Do **not** use `*` (wildcard) for `CORS_ORIGINS` in production. Explicitly list your domains.
*   **Database**: Always use **PostgreSQL** for production; SQLite is for local development only.
*   **Backups**: Enable automated backups for the PostgreSQL service in the Railway dashboard.
