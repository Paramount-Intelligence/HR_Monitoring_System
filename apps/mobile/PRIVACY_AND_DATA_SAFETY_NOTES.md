# PIMS Mobile — Privacy & Data Safety Notes

**Draft for Play Console Data safety form and privacy policy alignment.**  
Items marked **[OWNER]** require legal/product confirmation before public release.

---

## App overview

PIMS is a workforce management mobile client. Users authenticate with employer-issued accounts. Data is sent to the organization’s hosted backend over HTTPS/WSS.

**Backend (production):** `https://hrmonitoringsystem-production-cb42.up.railway.app/api/v1`  
**Not embedded in app:** database credentials, object storage keys, JWT secrets, or SMTP credentials.

---

## Data categories

### Account information

| Data | Examples | Purpose | Required | Shared externally | Encrypted in transit |
|------|----------|---------|----------|-------------------|----------------------|
| Name, email, role | Profile, directory | Authentication, RBAC, display | Yes | No (org backend only) | Yes (TLS) |
| Employee ID / org fields | If configured | HR workflows | Varies | No | Yes |

**User deletion:** **[OWNER]** — define account deletion / offboarding process with employer.

---

### Contact information

| Data | Purpose | Notes |
|------|---------|-------|
| Work email | Login, profile | Primary identifier |
| Phone | **[OWNER]** — only if collected in profile | Mark optional if unused |

---

### User-generated content

| Data | Examples | Purpose |
|------|----------|---------|
| Messages | Chat body, metadata | Team communication |
| Leave/WFH requests | Form text | HR workflows |
| Approval notes | Comments | Manager workflows |

**Retention:** **[OWNER]** — align with company retention policy.

---

### Photos and files

| Data | Purpose | Storage |
|------|---------|---------|
| Profile picture | Avatar display | Uploaded via API; not direct bucket access from app |
| Call recordings | Compliance/review | Uploaded by app; **admin playback only** on backend |
| Message attachments | **[OWNER]** — if enabled | Via API |

---

### Audio / video (calls)

| Data | Purpose | Notes |
|------|---------|-------|
| Live call audio/video | Voice/video calls | WebRTC; not stored as live stream by default |
| Call recording (device mic) | Internal review | Mobile captures **local microphone** only; uploaded post-call |

**Recording consent:** **[OWNER REQUIRED]**  
- Confirm employee monitoring / recording disclosure for your jurisdiction.  
- Confirm whether call recording is enabled in production for all users.  
- Privacy policy must mention recording if enabled.

---

### Device identifiers

| Data | Purpose | Notes |
|------|---------|-------|
| Expo push token | Push notifications | Registered after login; deactivated on logout |
| Device name / app version | Push diagnostics | Sent with token registration |

**Not collected in app bundle:** advertising ID (unless added later — currently not used).

---

### App activity

| Data | Examples | Purpose |
|------|----------|---------|
| Attendance events | Check-in/out timestamps | Workforce tracking |
| Report views | Aggregated metrics | Manager/admin dashboards |
| Audit-related actions | Server-side | Backend logging |

---

### Diagnostics

| Data | Collected today | Notes |
|------|-----------------|-------|
| Crash logs | **[OWNER]** — confirm if Sentry/Crashlytics added | Not in mobile source audit |
| In-app `secureLog` | Dev builds only (`__DEV__`) | Production builds should not log tokens |

---

## Data safety form guidance (Google Play)

Answer **honestly** based on confirmed production behavior:

| Question area | Likely answer | Confirm |
|---------------|---------------|---------|
| Data collected | Yes — account, messages, activity, device token | **[OWNER]** |
| Data encrypted in transit | Yes (HTTPS/WSS) | Yes |
| Data deletion request | **[OWNER]** | Policy URL required |
| Data shared with third parties | Typically **No** for sale; backend host is infrastructure | **[OWNER]** |
| Purpose | App functionality, analytics (if any), developer communications (push) | **[OWNER]** |

---

## Items requiring owner / legal confirmation

- [ ] **Privacy policy URL** for Play Console
- [ ] **Employee monitoring** disclosure (attendance, calls, recording)
- [ ] **Call recording** enabled/disabled in production
- [ ] **Data retention** periods
- [ ] **Data deletion** and export process (GDPR/CCPA if applicable)
- [ ] **Internal-only vs public** app (unlisted vs open listing)
- [ ] **Children / target audience** (typically 18+ workforce app)
- [ ] **Subprocessors** (hosting provider, push service Expo, etc.)

---

## Security controls (mobile)

- Auth tokens in **SecureStore** only
- No backend secrets in app bundle
- Role-based UI; backend enforces RBAC
- Logout clears tokens, cache, offline queues, push registration
- Production logging gated (`secureLog` / `__DEV__`)

See also: `SECURITY_QA_CHECKLIST.md`
