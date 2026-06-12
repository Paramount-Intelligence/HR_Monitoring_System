# PIMS Mobile — Release Notes

## Version 1.0.0 (versionCode 1)

**Initial public release** — Google Play internal testing track.

### New

- Secure employee login with protected session handling
- Dashboard with role-appropriate overview
- Attendance check-in, check-out, and history
- Profile viewing and editing with profile photo upload
- Real-time team messaging
- Alerts and notification center
- Push notification support (Android 13+ permission prompt)
- Offline-aware messaging with sync on reconnect
- Manager and admin workflows: team view, approvals, reports (role-based)
- Voice and video calling for supported conversations
- Security and role-based access throughout

### Improvements

- Polished mobile UI aligned with workforce platform
- Network status awareness and offline queue handling
- Production-hardened authentication and token storage

### Known limitations

- Call recording on mobile captures local microphone only (organization policy applies)
- Push notifications require physical device and granted permission
- Employer-issued account required (no public registration)

---

## Play Console release notes (short — paste into internal track)

```
Initial PIMS mobile release:
• Secure login and attendance
• Messages, alerts, and push notifications
• Manager/admin approvals and reports
• Voice/video calls
• Stability and security improvements
```

---

## Version history

| Version | versionCode | Date | Track | Notes |
|---------|-------------|------|-------|-------|
| 1.0.0 | 1 | _TBD_ | Internal testing | First AAB upload |

**Next upload:** Increment `android.versionCode` in `app.json` before each Play Console upload.
