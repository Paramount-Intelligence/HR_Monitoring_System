# Railway Environment Variables

Use separate Railway services for the API and the web app. Do not copy the local `.env`
files directly into Railway; set only the variables each service needs.

## API Service (required)

```env
APP_ENV=production
APP_HOST=0.0.0.0
APP_SECRET_KEY=<generate-a-long-random-secret>

DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_PUBLIC_URL=${{Postgres.DATABASE_PUBLIC_URL}}

FRONTEND_BASE_URL=https://pimsmonitoringsystem.up.railway.app
CORS_ORIGINS=https://pimsmonitoringsystem.up.railway.app

ACCESS_TOKEN_EXPIRE_MINUTES=120
REFRESH_TOKEN_EXPIRE_DAYS=30

BOOTSTRAP_ADMIN_EMAIL=<admin-email>
BOOTSTRAP_ADMIN_PASSWORD=<strong-initial-password>
BOOTSTRAP_ADMIN_NAME=HR Admin
```

If multiple frontend domains are active:

```env
CORS_ORIGINS=https://pimsmonitoringsystem.up.railway.app,https://diligent-elegance-production-52de.up.railway.app
```

Notes:

- Railway provides `PORT`; the API `Procfile` already binds to `$PORT`.
- `FRONTEND_BASE_URL` is used for links in emails and must match your live web URL.
- `CORS_ORIGINS` must include `FRONTEND_BASE_URL` (no wildcard `*` with credentials).
- Do **not** use `SECRET_KEY`, `JWT_SECRET_KEY`, or duplicate secret env vars — only `APP_SECRET_KEY` signs JWTs.

## API Service (optional)

```env
REDIS_URL=${{Redis.REDIS_URL}}

SMTP_TLS=True
SMTP_PORT=587
SMTP_HOST=smtp.gmail.com
SMTP_USER=<smtp-user>
SMTP_PASSWORD=<smtp-app-password>
EMAILS_FROM_EMAIL=<from-email>
EMAILS_FROM_NAME=Workforce OS

# Web Push (API service only — never on web service)
VAPID_PUBLIC_KEY=<public-key>
VAPID_PRIVATE_KEY=<private-key>
VAPID_SUBJECT=mailto:paramountintelligence.central@gmail.com
```

Web Push is optional. If any one `VAPID_*` variable is set without the others, delivery stays disabled and the API logs a safe warning.

## Web Service (required)

Set these on the Next.js service **before build**:

```env
NEXT_PUBLIC_APP_NAME=Workforce Intelligence & Execution OS
NEXT_PUBLIC_API_URL=https://hrmonitoringsystem-production.up.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://hrmonitoringsystem-production.up.railway.app/api/v1/ws
APP_ENV=production
```

Notes:

- `NEXT_PUBLIC_*` values are baked into the client bundle at **build time**. Redeploy the web service after changing them.
- `NEXT_PUBLIC_WS_URL` must point at the **API** host (`/api/v1/ws`), not the frontend domain.
- Do **not** set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — the browser fetches the public key from `GET /api/v1/notifications/push-public-key`.
- Do not put database, SMTP, bootstrap admin, `VAPID_PRIVATE_KEY`, or other backend secrets on the web service.
- Do **not** set `EXPORT_STATIC=true` on Railway web. Static export is for local Capacitor builds via `npm run build:mobile` with env vars set in your shell/CI.

## Call Recording Storage (API only)

```env
CALL_RECORDINGS_STORAGE_DRIVER=s3
CALL_RECORDINGS_MAX_UPLOAD_MB=100
AWS_ENDPOINT_URL=https://<your-bucket-endpoint>
AWS_S3_BUCKET_NAME=<bucket-name>
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
AWS_DEFAULT_REGION=auto
AWS_S3_URL_STYLE=virtual
```

## After URLs Change

1. Update API `FRONTEND_BASE_URL`.
2. Update API `CORS_ORIGINS` to include the frontend URL(s).
3. Update web `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`.
4. Redeploy **both** services (web must rebuild for `NEXT_PUBLIC_*` changes).

## Unused / not required

These are **not** read by the current codebase:

- `SECRET_KEY`
- `JWT_SECRET_KEY`
- `SESSION_IDLE_TIMEOUT_MINUTES`
- `JWT_CLOCK_SKEW_SECONDS`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
