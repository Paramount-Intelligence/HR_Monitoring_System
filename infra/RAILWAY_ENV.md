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
APP_ENV=production
```

Notes:

- `NEXT_PUBLIC_API_URL` must exist when Railway builds the web app. Next.js bakes
  `NEXT_PUBLIC_*` values into the client bundle at build time.
- Do not put database, SMTP, bootstrap admin, or backend secrets on the web service.

## After URLs Change

If Railway gives you new domains:

1. Update API service `FRONTEND_BASE_URL`.
2. Update API service `CORS_ORIGINS`.
3. Update web service `NEXT_PUBLIC_API_URL`.
4. Redeploy both services, especially the web service because `NEXT_PUBLIC_API_URL`
   is build-time config.
