# AI Agent Implementation Instructions

## 1. Purpose
This document tells an AI coding agent exactly how to execute the build with the right priorities.

## 2. Operating principles
- do not invent requirements outside the docs
- preserve polished UX quality, not just functional correctness
- ship in thin end to end slices
- keep modules strongly typed
- keep business logic in backend services, not React components
- maintain docs when schema or endpoint decisions change
- prefer clarity and maintainability over cleverness

## 3. Implementation stack guidance
Preferred stack:
- Next.js + TypeScript for web
- Tailwind CSS + component system for UI
- NestJS or FastAPI for API
- PostgreSQL for DB
- Redis + worker for async jobs
- transactional email provider for alerts

If using a different stack, preserve architecture and behavior.

## 4. UI quality instructions
The UI must be polished and user friendly:
- use consistent spacing and typography
- use rounded cards and soft shadow surfaces
- keep the navigation simple and calm
- create meaningful empty states and loading skeletons
- avoid low quality generated admin panels
- ensure charts look deliberate and readable
- tables must be filterable and easy to scan
- highlight urgent exceptions above fold on manager and admin dashboards

## 5. Build order
### Step 1
Create project scaffold:
- monorepo or clear app separation
- linting, formatting, env handling
- shared types package if applicable

### Step 2
Implement auth and role guards.

### Step 3
Implement user management and seeds.

### Step 4
Implement attendance module end to end:
- DB
- API
- employee UI
- manager/admin views

### Step 5
Implement project request and approval flow end to end.

### Step 6
Implement task management and timer flow.

### Step 7
Implement dashboard summaries and visualization.

### Step 8
Implement audit logging and governance validation.

### Step 9
Implement email alerts and worker jobs.

### Step 10
Implement performance metrics and analytics.

## 6. Coding requirements
- use DTO or schema validation on all writes
- centralize RBAC checks
- centralize audit log creation helper
- centralize alert creation helper
- avoid duplicate date formatting logic across components
- write reusable UI primitives for tables, filters, cards, and metric widgets

## 7. Repository expectations
The AI agent should produce:
- `/apps/web`
- `/apps/api`
- `/apps/worker`
- `/packages/ui`
- `/docs`
- `/infra`
- `.env.example`
- seed scripts
- migration scripts
- README with run instructions

## 8. Deliverables per milestone

### Milestone 1
- auth
- users
- base layout
- navigation shell

### Milestone 2
- attendance
- projects
- approvals

### Milestone 3
- tasks
- timer
- time logs

### Milestone 4
- dashboards
- charts
- workload page

### Milestone 5
- alerts
- metrics
- audit logs

## 9. Definition of completion for AI agent
The implementation is acceptable only if:
- all three role experiences are complete enough to demo
- UI is clean and visually coherent
- seeded demo data tells a believable product story
- acceptance criteria tests pass
- no placeholder sections remain on critical screens
- alert emails work end to end
