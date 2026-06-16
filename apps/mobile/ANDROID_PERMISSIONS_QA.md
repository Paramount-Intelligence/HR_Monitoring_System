# Android Permissions & Native Readiness QA

Phase L audit checklist for PIMS mobile (`apps/mobile`). Use a **development/preview native build** — not Expo Go. WebRTC and push require a dev client or release APK.

---

## Required Android permissions

| Permission | Why needed | Where requested / declared |
|------------|------------|----------------------------|
| `INTERNET` | API, WebSocket, WebRTC | `app.json` manifest |
| `ACCESS_NETWORK_STATE` | Offline detection / network awareness | `app.json` manifest |
| `RECORD_AUDIO` | Voice/video calls, voice notes in chat, optional call recording | Runtime: `src/calls/media-permissions.ts` before call start/accept; voice notes request on mic tap in `VoiceNoteRecorder` |
| `CAMERA` | Video calls only | Runtime: `media-permissions.ts` when `callType === 'video'` |
| `POST_NOTIFICATIONS` | Android 13+ push alerts | Runtime: `src/notifications/notification-permissions.ts` via `expo-notifications` |
| `VIBRATE` | Incoming-call channel + foreground ring vibration | `app.json`; channel config in `notification-channels.ts` |
| `MODIFY_AUDIO_SETTINGS` | WebRTC / expo-audio routing | `app.json` (WebRTC plugin) |
| Photo library (scoped) | Profile picture upload | Runtime: `ProfilePicturePicker` via `expo-image-picker` (`READ_MEDIA_IMAGES` on Android 13+ added by plugin) |

### Intentionally not added

| Permission | Reason |
|------------|--------|
| `BLUETOOTH_CONNECT` | Speaker/Bluetooth routing not implemented; UI toggle is local state only |
| `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_MICROPHONE` | No background mic recording or persistent call foreground service |
| Location, contacts, SMS, call log, calendar | App does not use these features |
| Broad storage (`READ_EXTERNAL_STORAGE`) | Image picker uses scoped media access via `expo-image-picker` |

---

## Notification channels (Android 8+)

Created in `src/notifications/notification-channels.ts` via `ensureNotificationChannels()` **before** Expo push token registration.

| Channel ID | Name | Importance | Sound | Vibration | Notes |
|------------|------|------------|-------|-----------|-------|
| `default` | General | DEFAULT | default | yes | Fallback / general pushes |
| `alerts` | Alerts | HIGH | default | yes | Workforce alerts |
| `messages` | Messages | HIGH | default | yes | Chat messages |
| `incoming-calls` | Incoming calls | MAX | default | yes (long pattern) | Lock screen PUBLIC; ringtone audio attributes |

**Backend:** Push payloads should set `channelId` to match these IDs for correct sound/importance on Android 8+.

**Foreground handler:** `notifications-service.ts` sets `shouldPlaySound: false` while app is foreground to avoid double audio when the in-app incoming-call modal plays the ringtone.

**Tap navigation:** `notification-navigation.ts` routes message → chat, call → chat, alert/notification → `/alerts`, with fallbacks to dashboard.

---

## Android 13+ notification permission

### Test steps

1. Install fresh dev/preview build on Android 13+ device.
2. Log in → Profile → **Push notifications** → **Enable notifications**.
3. Confirm system `POST_NOTIFICATIONS` prompt appears.
4. Grant → status shows **Enabled**; deny → **Disabled** with retry via Enable or Device permissions card.

### Expected if denied

- No crash; push token registration skipped.
- Alerts still work in-app via API polling/WebSocket when app is open.
- Device permissions card shows **Not granted** for Notifications with **Open Settings**.

---

## Sound / ringtone

### Background / killed app

- Incoming call push should use `channelId: incoming-calls` (server-side).
- Channel uses default system notification sound + vibration.

### Foreground (app open)

- `IncomingCallModal` visible → `incoming-call-ringtone.ts` plays looping `assets/sounds/incoming-call.wav` via `expo-audio` + Android vibration.
- Ringtone **stops** on accept, decline, timeout, phase change, or overlay unmount.

### Test steps

1. Device A calls Device B while B has app open on dashboard.
2. Confirm modal + audible loop + vibration on B.
3. Accept → sound stops immediately; decline/timeout → sound stops.
4. Navigate away / background during ring → sound stops on unmount.
5. Repeat same call ID → ringtone does not restart redundantly.

---

## Voice call — microphone permission

### Where

- `src/calls/media-permissions.ts` → `requestCallMediaPermissions('voice')`
- Called from `call-store.ts` `prepareMedia()` before outgoing start or incoming accept.

### Test steps

1. Revoke microphone in system settings.
2. Start voice call from chat → system prompt or deny path.
3. If denied → alert with **Open Settings**; call does not start; no crash.

---

## Video call — camera + microphone

### Test steps

1. Revoke camera only → start video call → prompt to continue audio-only or cancel.
2. Revoke microphone → call blocked with friendly alert.
3. Voice call must **not** request camera permission.

---

## Profile image picker

### Where

- `src/components/profile/ProfilePicturePicker.tsx` — library only (no in-app camera capture).

### Test steps

1. Profile → Upload profile picture → grant photo library access.
2. Deny → alert with **Open Settings**; no crash.
3. Upload JPEG/PNG/WebP ≤ size limit succeeds when granted.

---

## WebRTC native readiness

| Check | Status |
|-------|--------|
| `react-native-webrtc` in dependencies | Yes |
| `@config-plugins/react-native-webrtc` in `app.json` plugins | Yes |
| New Architecture | **Disabled** (`newArchEnabled: false` in `app.config.ts`) — required for WebRTC TurboModule compatibility |
| Works in Expo Go | **No** — requires dev/preview/production native build |
| Camera/mic in manifest | `RECORD_AUDIO`, `CAMERA` |
| Safe logging | `secureLog` only; no full SDP/token/URL logging |

**After changing native architecture settings, rebuild the development client APK.**

---

## Foreground service / background audio

**Audit result:** Not required.

- Call audio uses WebRTC in active session; no background mic capture after call ends.
- Optional call recording uses expo-audio during active call only (same session).
- No sticky incoming-call notification or Android foreground service for microphone.

---

## Bluetooth / speaker routing

| Control | Implementation |
|---------|----------------|
| Mute | WebRTC track mute via `call-store` |
| Camera toggle | WebRTC video track |
| Switch camera | Not implemented |
| Speaker button | **UI state only** (`isSpeakerOn` toggle) — does not route audio to speaker/Bluetooth |
| Bluetooth headset | **Not implemented** — no `BLUETOOTH_CONNECT` permission |

---

## Haptics / vibration

- `VIBRATE` permission in manifest.
- Incoming-call channel vibration pattern configured.
- Foreground incoming call uses `Vibration.vibrate` repeating pattern; cancelled on stop.

---

## Device permissions UI

**Profile → Device permissions** card (`DevicePermissionsCard.tsx`):

- Shows Notifications, Microphone, Camera, Photo library status.
- **Retry** per permission where supported.
- **Open Settings** for system-level changes.

---

## Two-device voice/video call QA (manual)

1. Build/install native APK/dev client on two Android devices (not Expo Go).
2. Both users logged in, notifications granted.
3. **Voice:** A calls B → B hears ring (foreground) or notification (background) → accept → two-way audio.
4. **Video:** Same with camera prompts; verify video tiles when both grant camera.
5. End call → no lingering ringtone/vibration.
6. Deny mic on one device → verify blocked with message, no crash.

---

## Voice note QA (Messages chat)

1. Open a direct or group chat with send permission.
2. With empty text field, tap **mic** → grant `RECORD_AUDIO` if prompted.
3. Record a short note → **Stop** → preview play → **Send**.
4. Verify bubble shows play button + duration on sender and receiver.
5. Only one voice note should play at a time; leaving chat stops playback.
6. Deny mic → friendly alert + Open Settings; no crash.
7. While offline → voice send blocked with message; text offline queue unchanged.
8. Max duration auto-stops at 60 seconds.

---

## Known gaps

- Speaker toggle does not change audio route (WebRTC default routing only).
- Bluetooth headset selection/routing not implemented.
- Camera flip (front/back) not implemented during video call.
- Backend must send correct Android `channelId` on push payloads for channel sounds to apply.
- Custom ringtone asset is a short bundled WAV; system default used on notification channel when app is backgrounded.
- Two-device call QA (Phase G7) still pending full sign-off.

---

## Typecheck

```bash
cd apps/mobile
npm run typecheck
```
