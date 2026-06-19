# Railway Environment Variables

Use separate Railway services for the API and the web app. Do not copy the local `.env`
files directly into Railway; set only the variables each service needs.

## API Service

Set these on the FastAPI service:

```env
APP_ENV=production
APP_HOST=0.0.0.0
APP_SECRET_KEY=<generate-a-long-random-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_PUBLIC_URL=${{Postgres.DATABASE_PUBLIC_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

FRONTEND_BASE_URL=https://<your-web-service>.up.railway.app
CORS_ORIGINS=https://<your-web-service>.up.railway.app

SMTP_TLS=True
SMTP_PORT=587
SMTP_HOST=smtp.gmail.com
SMTP_USER=<smtp-user>
SMTP_PASSWORD=<smtp-app-password>
EMAILS_FROM_EMAIL=<from-email>
EMAILS_FROM_NAME=Workforce OS

BOOTSTRAP_ADMIN_EMAIL=<admin-email>
BOOTSTRAP_ADMIN_PASSWORD=<strong-initial-password>
BOOTSTRAP_ADMIN_NAME=HR Admin
```

Notes:

- Railway provides `PORT`; the API `Procfile` already binds to `$PORT`.
- Prefer Railway reference variables like `${{Postgres.DATABASE_URL}}` over hardcoded
  database credentials.
- `FRONTEND_BASE_URL` is used for links in emails.
- `CORS_ORIGINS` controls which browser origins can call the API.

## Web Service

Set these on the Next.js service:

```env
NEXT_PUBLIC_APP_NAME=Workforce Intelligence & Execution OS
NEXT_PUBLIC_API_URL=https://<your-api-service>.up.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://<your-api-service>.up.railway.app/api/v1/ws
APP_ENV=production

# Optional — required for calls across strict NAT/firewalls
# NEXT_PUBLIC_STUN_URL=stun:stun.l.google.com:19302
# NEXT_PUBLIC_TURN_URL=turn:your-turn.example.com:3478
# NEXT_PUBLIC_TURN_USERNAME=
# NEXT_PUBLIC_TURN_CREDENTIAL=
```

Notes:

- `NEXT_PUBLIC_API_URL` must exist when Railway builds the web app. Next.js bakes
  `NEXT_PUBLIC_*` values into the client bundle at build time.
- `NEXT_PUBLIC_WS_URL` must point at the **API** service WebSocket endpoint
  (`wss://<api-host>/api/v1/ws`), not the frontend domain. Redeploy the web service
  after changing either `NEXT_PUBLIC_*` URL.
- Do **not** set `EXPORT_STATIC=true` on the Railway web service. Static export is
  only for local Capacitor builds via `npm run build:mobile`.
- Railway service root directory must be `apps/web`. Config file: `apps/web/railway.toml`.
- Do not put database, SMTP, bootstrap admin, or backend secrets on the web service.

## Call Recording Storage (Railway Bucket)

Set these on the **API service only** (never on the web service):

```env
CALL_RECORDINGS_STORAGE_DRIVER=s3
CALL_RECORDINGS_MAX_UPLOAD_MB=100

# Railway Bucket / S3-compatible credentials (backend-only)
AWS_ENDPOINT_URL=https://<your-bucket-endpoint>
AWS_S3_BUCKET_NAME=<bucket-name>
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
AWS_DEFAULT_REGION=auto
AWS_S3_URL_STYLE=virtual
```

Alternative variable names also supported:

```env
S3_ENDPOINT_URL=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_REGION=auto
S3_URL_STYLE=virtual
```

Notes:

- Recordings are stored as `.webm` objects in the bucket under `call-recordings/YYYY/MM/{call_id}/{recording_id}.webm`.
- PostgreSQL stores metadata only (`storage_key`, `storage_driver`, duration, participants, etc.).
- Admin stream/download goes through authenticated backend routes — no public bucket URLs in the frontend.
- For local development, omit bucket credentials and use `CALL_RECORDINGS_STORAGE_DRIVER=local` (default).

## After URLs Change

If Railway gives you new domains:

1. Update API service `FRONTEND_BASE_URL`.
2. Update API service `CORS_ORIGINS`.
3. Update web service `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`.
4. Redeploy both services, especially the web service because `NEXT_PUBLIC_*` values
   are build-time config.
