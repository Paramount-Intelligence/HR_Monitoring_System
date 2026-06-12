# Phase 13 — Mobile Security QA Checklist

Manual verification for PIMS mobile + backend security hardening.  
Backend RBAC is authoritative; mobile checks are UX only.

## Auth & tokens

- [ ] Login stores access + refresh tokens in SecureStore only (not AsyncStorage)
- [ ] App reload preserves session when tokens are valid
- [ ] Expired access token triggers a single refresh; concurrent 401s queue behind one refresh
- [ ] Refresh failure clears tokens and routes to login
- [ ] Logout clears SecureStore tokens, React Query cache, offline queues, WebSocket, call state, push registration
- [ ] No access/refresh token, Authorization header, or full WS URL appears in device logs (production build)
- [ ] React Query persisted cache does not contain auth tokens

## RBAC — mobile UI

- [ ] Employee/intern cannot see Manage tab or open `/manage/*` (shows access denied)
- [ ] Manager/team lead see team-scoped manage features only
- [ ] HR sees HR-permitted manage features
- [ ] Admin sees admin features
- [ ] Direct navigation to restricted report routes shows access denied or empty state
- [ ] HTTP 403 shows friendly “access denied” — does **not** logout or infinite-retry

## RBAC — backend APIs

- [ ] Employee/intern `GET /users` returns only self (or scoped list)
- [ ] Employee/intern `GET /users/{other_id}` returns 403
- [ ] Manager/team lead user list is team-scoped (not full org)
- [ ] Intern cannot access admin analytics/workforce admin endpoints (403)
- [ ] Non-admin cannot list/play/download call recordings (403)
- [ ] Admin can access admin call recording routes with `call_recordings.view`

## WebSocket

- [ ] Connection without token is rejected
- [ ] Invalid/expired token is rejected (close code 1008)
- [ ] Employee, manager, HR, admin roles can connect when active
- [ ] WS logs show `token received=true` / `user_id` only — never full token or URL
- [ ] Mobile stops reconnect on logout and while offline
- [ ] Mobile refreshes token before reconnect after auth close

## Calls

- [ ] Non-participant cannot start/signaling/end another user’s call (403/404)
- [ ] Only intended receiver can accept incoming call
- [ ] Call buttons hidden/disabled when offline or WS disconnected
- [ ] Logout stops media tracks and clears call state
- [ ] No raw SDP logged in production

## Call recordings

- [ ] Upload requires auth + call participant
- [ ] Empty file rejected (400)
- [ ] Oversized file rejected (413)
- [ ] Invalid MIME rejected (400/422)
- [ ] Storage key starts with `call-recordings/` (backend-generated)
- [ ] Normal user cannot stream/download admin recordings
- [ ] Mobile uploads via backend only (no bucket credentials in app)
- [ ] Recording bytes not stored in AsyncStorage

## Push / device tokens

- [ ] Register/deactivate endpoints require auth
- [ ] User cannot register token for another user
- [ ] Duplicate token upserts safely (no hijack of another user’s row)
- [ ] Logout deactivates device token when endpoint available
- [ ] Push payload has IDs/previews only — no auth tokens or full report bodies
- [ ] Expo Go skips native push without crashing

## Offline cache & queue

- [ ] Offline queue keys scoped by `user_id` (`@pims/offline-queue/{userId}`)
- [ ] Logout clears **all** offline queue AsyncStorage keys
- [ ] Offline sync does not run without access token
- [ ] Queued actions do not sync after logout or under a different user session
- [ ] Destructive admin actions are not silently queued offline

## File uploads

- [ ] Profile picture: auth, size limit, MIME/extension validation
- [ ] Profile pictures served via API route with path sanitization (no raw StaticFiles mount)
- [ ] Invalid image MIME rejected
- [ ] Mobile handles 413/422 with friendly message

## Errors & logging

- [ ] Production API errors omit stack traces and internal paths
- [ ] Mobile shows friendly errors — not raw JSON/stack traces
- [ ] 401 → refresh once then logout; 403 → access denied UI

## CORS & environment

- [ ] Production CORS is explicit origin list (no `*` with credentials)
- [ ] Mobile bundle contains only `EXPO_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_WS_URL`
- [ ] No bucket/AWS secrets in mobile env or source
- [ ] Production backend rejects default `APP_SECRET_KEY` / bootstrap password

## Build verification

```bash
# Mobile
cd apps/mobile
npx expo doctor
npm run typecheck
npx expo export --platform android

# Backend
cd apps/api
python -m compileall app
python -c "from app.main import app; print('Backend import OK')"
pytest tests/test_rbac_mobile.py -q
```

## Sign-off

| Area            | Tester | Date | Pass |
|-----------------|--------|------|------|
| Auth            |        |      |      |
| RBAC            |        |      |      |
| WebSocket       |        |      |      |
| Calls           |        |      |      |
| Recordings      |        |      |      |
| Push            |        |      |      |
| Offline         |        |      |      |
| Uploads         |        |      |      |
| Env/CORS        |        |      |      |
