# Workforce Intelligence & Execution OS

Monorepo for the HR Monitoring / Workforce Intelligence platform.

## Planned stack
- Web: Next.js + TypeScript + Tailwind CSS
- API: FastAPI
- Worker: Python worker for alerts and metrics
- Database: SQLite
- Queue/Cache: Redis

## Structure
- `apps/web` - frontend
- `apps/api` - backend API
- `apps/worker` - background jobs
- `packages/ui` - shared UI components
- `packages/types` - shared contracts and types
- `packages/config` - shared config
- `docs` - source documentation
- `infra` - docker and deployment assets

## Status
Initial scaffold in progress.
