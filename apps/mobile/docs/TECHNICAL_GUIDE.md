# PIMS Mobile — Technical Guide

Developer reference for the Expo React Native app in `apps/mobile`.

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54, React Native (Legacy Architecture) |
| Language | TypeScript |
| Routing | Expo Router (file-based `app/`) |
| Server state | TanStack React Query + persist |
| HTTP | Axios (`src/api/client.ts`) |
| Auth storage | `expo-secure-store` (never AsyncStorage for tokens) |
| Realtime | WebSocket (`src/realtime/`) |
| Calls | `react-native-webrtc`, `@config-plugins/react-native-webrtc` |
| Audio | `expo-audio` (voice notes, no custom call ringtone) |
| Push | `expo-notifications` + Android channels |
| Offline | Network store + offline queue |

## Folder structure

```
apps/mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Login, forgot password
│   ├── (tabs)/             # Six bottom tabs
│   ├── chat/               # Conversation detail
│   ├── manage/             # Admin/manage flows
│   ├── reports/            # Report screens
│   └── alerts.tsx          # Alert center (non-tab)
├── assets/
│   ├── logo.png            # Source branding asset
│   ├── icon.png            # 1024 app icon (from logo)
│   ├── favicon.png         # Web favicon (from logo)
│   └── android-icon-*.png  # Adaptive icon layers
├── docs/                   # This documentation set
└── src/
    ├── api/                # REST wrappers
    ├── auth/               # Auth store, role utils
    ├── calls/              # WebRTC, call store, ringtone/vibration
    ├── components/         # UI components
    ├── notifications/      # Push, channels, navigation
    ├── offline/            # Queue & sync
    ├── query/              # React Query client
    ├── realtime/           # WebSocket provider
    └── utils/              # Formatters, secure log, etc.
```

## Routing structure

| Route group | Purpose |
|-------------|---------|
| `(auth)/login` | Authentication |
| `(tabs)/index` | Dashboard |
| `(tabs)/attendance` | Attendance |
| `(tabs)/projects` | Projects |
| `(tabs)/tasks` | Tasks |
| `(tabs)/messages` | Messages list |
| `(tabs)/profile` | Profile |
| `alerts` | Alert center |
| `manage/*` | Manage hub (hidden tab route) |
| `chat/[conversationId]` | Chat thread |

## API client

- Base URL: `Constants.expoConfig.extra.apiBaseUrl`
- Bearer token from SecureStore via auth store interceptor
- FormData uploads: Content-Type stripped, `transformRequest` passthrough (React Native multipart)
- Timeouts extended for voice note uploads (90s)

## Auth / token flow

1. Login → `POST /auth/login` → access + refresh tokens
2. Tokens stored in **SecureStore** only
3. Axios attaches `Authorization: Bearer <access>`
4. Refresh on 401 via refresh token
5. Logout clears SecureStore + push token unregister

**Never** log tokens, Authorization headers, or full WebSocket URLs.

## SecureStore rules

- Access token, refresh token, user cache keys in SecureStore
- No tokens in AsyncStorage, Redux persist, or React Query persisted cache for secrets
- `secure-log.ts` for safe diagnostic logging

## React Query

- Query keys in `src/constants/query-keys.ts`
- Persist client for offline read cache (non-secret data)
- 403 on messages: handled gracefully (no redbox)

## Offline handling

- `NetworkProvider` + `OfflineBanner`
- Mutations queued in offline store where implemented
- User alerted when action requires network

## WebSocket / realtime

- URL from `extra.wsUrl`
- Authenticated connection after login
- Reconnect with duplicate-connection guard
- Powers live message updates and alerts when connected

## Calls / WebRTC

- `CallOverlayProvider` global modals (incoming, outgoing, active)
- ICE via STUN (`extra.stunUrl`)
- Signaling through REST + WebSocket events
- `newArchEnabled: false` required for WebRTC native module
- Foreground incoming: **vibration only**; background uses push + `incoming-calls` channel default sound

## Voice notes

1. Record with `expo-audio` (`VoiceNoteRecorder`)
2. Upload `POST .../attachments` (multipart, `.m4a`)
3. Send message with `attachment_ids`
4. Playback via authenticated URL (`VoiceNoteBubble`)

Backend must allow audio extensions in `messages.py` (deploy to Railway for production).

## Notifications / channels

Created in `src/notifications/notification-channels.ts`:

| Channel ID | Use |
|------------|-----|
| `default` | General |
| `alerts` | Workforce alerts |
| `messages` | Chat messages |
| `incoming-calls` | Voice/video call invites |

All channels use **`sound: 'default'`** (device tone).

Backend push payload should include matching `channelId`.

## Header / safe-area layout

- `BrandHeader`, `DashboardHeader`, `ChatHeader` apply `paddingTop: insets.top` once
- `Screen` component: `headerSafeArea` prop omits top SafeAreaView edge to prevent double inset
- Chat screen: `SafeAreaView edges={['bottom']}` only; header owns top inset

## Horizontal overflow prevention

- Screen roots: `width: '100%'`, `maxWidth: '100%'`, `overflow: 'hidden'`
- Do not use negative horizontal margins on headers outside padded scroll content
- `MetricBentoGrid`: 48% column width with `justifyContent: 'space-between'` (no negative gutter margins)
- Long text: `numberOfLines`, `ellipsizeMode="tail"`, `flexShrink: 1`, `minWidth: 0` on flex children
- Dashboard hero: role badge wraps via `flexWrap: 'wrap'`

## Permissions

| Permission | When requested |
|------------|----------------|
| POST_NOTIFICATIONS | Profile → enable push |
| RECORD_AUDIO | Call start / voice note record |
| CAMERA | Video call |
| Photos | Profile picture picker |

See `ANDROID_PERMISSIONS_QA.md`.

## Sound behavior

- **No custom WAV ringtone** in production foreground path
- `assets/sounds/incoming-call.wav` retained but unused
- `incoming-call-ringtone.ts` → vibration only
- Notification handler: `shouldPlaySound: true` (device default)

## Environment / config

| Variable | Source |
|----------|--------|
| `EXPO_PUBLIC_API_BASE_URL` | EAS env / app.json extra |
| `EXPO_PUBLIC_WS_URL` | EAS env / app.json extra |
| `EXPO_PUBLIC_APP_ENV` | development / preview / production |

Production URLs are fixed in `eas.json` profiles.

## Branding assets

| Asset | Path | Source |
|-------|------|--------|
| App icon | `./assets/icon.png` | Generated from `logo.png` |
| Android adaptive foreground | `./assets/android-icon-foreground.png` | From `logo.png` |
| Adaptive background | `#f9f9ff` | PIMS light theme |
| Favicon | `./assets/favicon.png` | From `logo.png` |
| Splash | `./assets/logo.png` | Native splash |

To rebrand: replace `assets/logo.png`, regenerate icon derivatives (1024 icon, 512 foreground, 48 favicon), update `app.json` if paths change.

## Run development build

```powershell
cd apps/mobile
npm install
npx expo start --dev-client
```

Install matching dev client APK on device; scan QR or enter Metro URL.

## Build preview APK

```powershell
cd apps/mobile
$env:EAS_NO_VCS=1   # if git metadata blocks EAS
eas build --profile preview --platform android
```

## Build production AAB

```powershell
eas build --profile production --platform android
```

## Known limitations

- Legacy React Native architecture (New Arch disabled for WebRTC)
- Expo Go: no calls, no push, limited native modules
- Voice notes blocked until production API accepts `.m4a`
- Bluetooth speaker routing not implemented
- No foreground service for background calls
- Some admin features read-only vs web
- Google Play requires AAB for store; sideloaded APK shows “can’t verify app”
