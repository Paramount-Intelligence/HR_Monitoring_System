# PIMS Mobile — Troubleshooting

## EAS Free Tier queue delay

**Symptom:** Build stuck in “Queued” for a long time.

**Fix:** Wait or upgrade EAS plan. Check https://expo.dev/accounts → Builds. Queue times vary at peak hours. Start builds overnight for long QA cycles.

---

## Development build stuck loading Metro

**Symptom:** Dev client opens but spinner never loads JS bundle.

**Fixes:**

1. Phone and PC on **same Wi‑Fi** (not guest network isolation)
2. Use LAN URL from `npx expo start --dev-client` (e.g. `192.168.x.x:8081`)
3. Disable VPN on phone and PC
4. Windows Firewall: allow Node/Metro on private network
5. Try `npx expo start --dev-client --tunnel` (slower but bypasses LAN issues)
6. Shake device → Reload, or press `r` in Metro terminal

---

## `unexpected end of stream` Metro error

**Symptom:** Red screen / bundle download fails mid-stream.

**Fixes:**

1. Restart Metro: Ctrl+C → `npx expo start --dev-client --clear`
2. Clear dev client cache (shake → Reload)
3. Check unstable Wi‑Fi; switch to tunnel mode
4. Ensure no proxy intercepting HTTP

---

## VPN / Wi‑Fi / firewall

**Symptom:** API works on web but not phone, or Metro unreachable.

**Fix:** Same network, no VPN, allow port 8081. Production API is HTTPS — mobile data should work for API-only testing; Metro dev still needs LAN/tunnel.

---

## Expo Go vs development build

**Symptom:** Calls fail, push missing, “native module not found”.

**Fix:** Install **development** or **preview APK**. Expo Go cannot load `react-native-webrtc` or full push stack. Scan QR only with dev client built for this project.

---

## Google “Can’t verify app”

**Symptom:** Warning when installing APK.

**Fix:** Expected for sideloaded preview/dev APK. Choose install anyway. Use Play Store AAB for production users.

---

## WebRTC native module error

**Symptom:** `TurboModuleRegistry.getEnforcing(...)` or WebRTC crash.

**Fix:**

1. Confirm `newArchEnabled: false` in app config
2. Rebuild dev client after config change — **old APK will not work**
3. Do not use Expo Go

---

## Push token / notification permission

**Symptom:** Push never arrives; Profile shows disabled.

**Fixes:**

1. Android 13+: Profile → Enable notifications → grant system prompt
2. Use physical device (not emulator without Google Play)
3. Not Expo Go
4. Check channels initialized: log `notification_channels_ready`
5. Backend must have valid Expo push credentials

---

## Call stuck connecting

**Symptom:** Outgoing call rings forever.

**Fixes:**

1. Both users on native build, logged in
2. Microphone permission granted
3. Stable network; try Wi‑Fi vs mobile data
4. callee app foreground or background with push for incoming
5. Check WebSocket connected (`WS_MOBILE connected` in dev logs — no URL logged in production builds)

---

## Ringtone / sound issues

**Symptom:** No sound on notifications or double sound on calls.

**Expected behavior (current):**

- All channels use **device default** notification sound
- Foreground incoming call: **vibration only**, no custom WAV
- Background call push: default sound via `incoming-calls` channel

**Fix:** Ensure backend sends correct `channelId`. Reinstall app to reset channels. Check phone not in DND/silent (incoming-calls respects DND unless bypass configured).

---

## 403 conversations / messages

**Symptom:** Empty messages or permission error for some users.

**Fix:** User may lack messaging permission for that conversation — expected for restricted roles. App should show friendly message, not crash. Admin: verify user permissions on web.

---

## Blank top spacing / header gap

**Symptom:** Large white area above “PIMS Intelligence” header.

**Fix:** Fixed in app via `Screen headerSafeArea` + single inset in `BrandHeader`/`DashboardHeader`. Update to latest build. If persists on a screen without `headerSafeArea`, report screen name.

---

## Right-side text clipping / horizontal overflow

**Symptom:** Header badge, bell, or card text cut off on the right; content wider than screen.

**Fix:** Update to latest build. Root cause was negative header margins and 50% grid columns with gutter negative margins. If a specific screen still clips, note the screen name and role.

---

## Keyboard covering forms

**Symptom:** Create task / forms hidden behind keyboard.

**Fix:** Use scroll views on forms; Create Task screen uses keyboard-aware layout. Dismiss keyboard before picking assignee if overlap occurs on small screens.

---

## Voice note “file type not supported .m4a”

**Symptom:** Upload fails with 400.

**Fix:** Production Railway API must deploy backend change allowing audio extensions. Mobile cannot fix alone. See alert message in app.

---

## VoiceNoteRecorder crash on back

**Symptom:** Error about released AudioRecorder on navigate away.

**Fix:** Updated cleanup avoids `isRecording` on released native object. Update app bundle.

---

## Build / export errors

**Symptom:** Typecheck or export fails.

**Fix:**

```powershell
cd apps/mobile
npm run typecheck
npx expo export --platform android
```

Read first error; common issues: missing assets, TypeScript strict errors, invalid `app.json` paths.

---

## Deep link “Unmatched route”

**Symptom:** Dev client URL opens wrong route.

**Fix:** App ignores `exp+` / `expo-development-client` URLs. Use `pims://` scheme for real deep links.

---

## Still stuck?

1. Capture steps without tokens or passwords
2. Note app version (`1.4.0`) and build number
3. Check `apps/mobile/docs/TESTING_QA.md` for related test case
4. Compare with web app behavior for same user/role
