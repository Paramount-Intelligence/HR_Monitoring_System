# PIMS Android — Permissions Disclosure

Document for Play Console **App content** / permission declarations and internal review.

Package: `com.paramount.pims`  
Target SDK: **35** (via `expo-build-properties` in `app.config.ts`)

---

## Declared permissions

| Permission | Declared in manifest | Used for | Required for core app |
|------------|---------------------|----------|------------------------|
| `INTERNET` | Yes | API, WebSocket, uploads | Yes |
| `CAMERA` | Yes | Video calls; profile photo capture (image picker) | No — only when user uses camera features |
| `RECORD_AUDIO` | Yes | Voice/video calls; call recording (local mic) | No — only during calls |
| `MODIFY_AUDIO_SETTINGS` | Yes | Call audio routing (speaker/earpiece) | No — call feature only |
| `POST_NOTIFICATIONS` | Yes | Push alerts for messages, approvals, alerts (Android 13+) | No — optional; user can deny |
| `BLUETOOTH_CONNECT` | Yes | Audio routing to Bluetooth headsets during calls | No — call feature only |

---

## Permissions NOT requested

The app does **not** request:

- Location (fine/coarse/background)
- SMS / phone call logs
- Contacts / calendar
- External storage read/write (scoped storage via system pickers)
- Body sensors
- Nearby devices (except Bluetooth connect for audio)

If any of the above are added later, update this document and Play declarations.

---

## User-facing rationale (for Play / support)

**Camera**  
Used when you start a video call or take a profile photo. The app does not access the camera in the background.

**Microphone (`RECORD_AUDIO`)**  
Used for voice and video calls and for optional call recording initiated during an active call.

**Notifications (`POST_NOTIFICATIONS`)**  
Used to notify you about new messages, alerts, and approval updates when you are not actively using the app.

**Bluetooth**  
Used to route call audio to connected Bluetooth headsets.

---

## iOS (future TestFlight / App Store)

Configured in `app.json`:

- `NSCameraUsageDescription`
- `NSMicrophoneUsageDescription`

---

## Review checklist

- [ ] Each declared permission maps to an implemented feature
- [ ] No permission requested “just in case”
- [ ] Runtime permission prompts appear at point of use
- [ ] App remains usable if notification permission denied (degraded push)
- [ ] App handles camera/mic denial for calls with clear messaging

---

## Removing a permission

If a feature is removed, delete the permission from `app.json` → `android.permissions` and rebuild AAB.
