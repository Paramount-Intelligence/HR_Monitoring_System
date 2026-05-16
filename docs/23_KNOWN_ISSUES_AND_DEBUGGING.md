# 23 Known Issues and Debugging

This document tracks current known bugs, architectural limitations, and troubleshooting steps for the Workforce Intelligence & Execution OS.

## 🔴 Critical Issues

### 1. Backend 500s Masked as "Network Error"
*   **Symptom**: Frontend shows a vague "Network Error" toast instead of a specific error message.
*   **Root Cause**: In some routes, the global exception handler is triggered before a custom error response is formulated, or CORS settings block the detail response.
*   **Workaround**: Check the **Backend Logs** (Railway or local terminal). Look for Python Tracebacks to see the actual error (e.g., `AttributeError`, `IntegrityError`).
*   **Fix Status**: Partially resolved via atomic transactions in Leave module; ongoing for other modules.

### 2. Metrics Recalculation Lag
*   **Symptom**: Dashboard KPI cards don't update immediately after completing a task or correcting attendance.
*   **Root Cause**: Metrics are aggregated asynchronously via Celery/Redis. If the worker is busy or the Redis connection is slow, updates may lag by 1-5 minutes.
*   **Workaround**: Wait a few minutes and refresh. If it persists, verify the worker process is running.

## 🟡 Moderate Issues

### 3. Email Alert Deduplication
*   **Symptom**: Managers may receive multiple emails for the same exception (e.g., three "Missing Checkout" emails).
*   **Workaround**: Currently being handled via manual dismissal in the dashboard. Cooldown logic is being refined in the `AlertService`.

### 4. Dropdown Label Clipping
*   **Symptom**: Long Project or Task titles in dropdown menus are cut off on smaller screens.
*   **Workaround**: Hover over the item (if title attribute exists) or use a larger screen. CSS fix for flexible dropdown widths is planned.

## 🔵 Minor Issues / Limitations

### 5. UUIDs in Error Logs
*   **Symptom**: Some internal error logs still use UUIDs instead of User Names, making debugging from logs slightly slower.
*   **Workaround**: Use the `users` table or Admin User Management view to map IDs to names.

### 6. SQLite Concurrency (Local only)
*   **Symptom**: `database is locked` error when running the API and Worker simultaneously on SQLite.
*   **Workaround**: Production uses PostgreSQL which doesn't have this limit. Locally, try restarting the services or increasing the SQLite timeout in `db/session.py`.

---

## 🛠️ Debugging Steps

### 1. Check API Health
```bash
curl https://your-api.up.railway.app/health
```
Expected: `{"status": "ok"}`.

### 2. Monitor Worker Logs
If emails aren't sending or analytics aren't updating:
```bash
# Locally
tail -f apps/api/worker.log  # Or check terminal
# Railway
railway logs -s worker
```

### 3. Inspect JWT
If you are getting `401 Unauthorized` unexpectedly, copy the token from Browser DevTools (LocalStorage/Cookies) and paste it into [jwt.io](https://jwt.io) to verify:
*   `exp`: Expiration time.
*   `role`: Correct user role.
*   `sub`: Correct user ID.

### 4. Database Console
If data looks inconsistent, use a tool like **DBeaver** or the **Railway Query Editor** to check the tables directly, specifically `attendance_sessions` and `leave_requests`.
