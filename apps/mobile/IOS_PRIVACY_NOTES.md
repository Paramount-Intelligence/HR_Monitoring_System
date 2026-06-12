# PIMS iOS — Privacy Notes (App Store)

Draft for App Store Connect **App Privacy** labels and privacy policy alignment.  
**Needs owner/legal confirmation** where marked.

---

## Summary

PIMS collects workforce data necessary to operate as an employer-provided mobile client. Data is transmitted to the organization’s hosted backend over encrypted connections (HTTPS/WSS). The app is not designed for cross-app tracking.

**Tracking:** No — app does not use IDFA or cross-app tracking for advertising.  
**Third-party analytics:** **[OWNER]** — confirm if crash/analytics SDKs are added.

---

## Data types (likely collected)

| Data type | Collected | Linked to user | Used for tracking | Purpose |
|-----------|-----------|----------------|-------------------|---------|
| Name | Yes | Yes | No | Account, display |
| Email address | Yes | Yes | No | Login, profile |
| Phone number | Optional | Yes | No | Profile if provided |
| User ID / role | Yes | Yes | No | RBAC |
| Photos (profile) | Optional | Yes | No | Avatar upload |
| Other user content | Yes | Yes | No | Messages, requests |
| Audio data | During calls | Yes | No | Voice/video calls |
| Audio recordings | If enabled (Android validated; iOS pending) | Yes | No | Compliance review — admin only |
| Product interaction | Yes | Yes | No | Attendance, approvals |
| Device ID (push token) | Yes | Yes | No | Push notifications |
| Crash data | **[OWNER]** | **[OWNER]** | No | Diagnostics if enabled |

---

## Data NOT collected by mobile app directly

- Precise location (no GPS permission)
- Contacts, calendar, SMS
- Browsing history
- Financial info
- Health data

---

## Data sharing

| Recipient | Shared | Notes |
|-----------|--------|-------|
| Organization backend | Yes | Primary data processor |
| Expo push service | Push token only | For notification delivery |
| Other third parties | **[OWNER]** | Confirm subprocessors |

Data is **not sold**.

---

## Encryption

- Data in transit: TLS (HTTPS/WSS)
- Tokens on device: iOS Keychain via SecureStore
- **[OWNER]:** Data at rest on backend

---

## User controls

| Control | Available |
|---------|-----------|
| Delete account in-app | No — employer-managed |
| Request deletion | **[OWNER]** — HR/offboarding process |
| Opt out of push | Yes — iOS Settings |
| Opt out of calls | Yes — do not initiate/accept |

---

## Recording & employee monitoring

**[OWNER REQUIRED]**

- Attendance check-in/out may constitute workforce monitoring
- Call recording (when enabled): requires policy disclosure and consent per jurisdiction
- iOS call recording is **disabled** in current build until TestFlight validation

---

## Privacy policy URL

**[OWNER]:** `PRIVACY_POLICY_URL_PLACEHOLDER`

Must match Play Store / web app policy before App Store submission.

---

## Age rating

Workforce app — typically **4+** or **12+** depending on ASC questionnaire answers. No unrestricted web access, no UGC public feeds.

---

## Related

- `PRIVACY_AND_DATA_SAFETY_NOTES.md` (Android + shared)
- `ANDROID_PERMISSIONS_DISCLOSURE.md`
