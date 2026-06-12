# PIMS — Play Store Screenshots Plan

Capture on a **physical Android device** using **preview or production internal build**. Use demo/sanitized data only.

---

## Requirements (Google Play)

| Asset | Minimum | Recommended |
|-------|---------|-------------|
| Phone screenshots | 2 | 4–8 |
| 7-inch tablet | Optional | 1+ if supporting tablets |
| 10-inch tablet | Optional | 1+ if supporting tablets |
| Feature graphic | 1024×500 | Required for store listing |
| App icon | 512×512 | Upload high-res from design source |

Format: PNG or JPEG, no alpha on feature graphic.

---

## Screenshot list

### Employee flow (required)

| # | Screen | Route / action | Data rules |
|---|--------|----------------|------------|
| 1 | Login | `/(auth)/login` | Show app branding; no real password visible |
| 2 | Dashboard | `/(tabs)/` home | Use demo name; hide real company secrets |
| 3 | Attendance | Attendance tab | Show check-in state; no real GPS if unused |
| 4 | Messages | Conversations list | **Fake names and message previews only** |
| 5 | Chat | Single conversation | Sanitized thread; no private client data |
| 6 | Alerts | Alerts tab | Generic alert titles |
| 7 | Profile | Profile tab | Demo user; blur or use stock avatar |

### Manager / admin flow (if targeting full org rollout)

| # | Screen | Notes |
|---|--------|-------|
| 8 | Manage hub | Manager or admin test account |
| 9 | Approvals | Pending item with sanitized details |
| 10 | Reports | Team or workforce summary (non-sensitive aggregates) |

### Calls (only if stable in production build)

| # | Screen | Notes |
|---|--------|-------|
| 11 | Voice call in progress | Two demo participants; no real phone numbers |
| 12 | Video call (optional) | Camera permission already granted |

---

## Capture guidelines

1. **Status bar:** Full signal/Wi‑Fi/battery; avoid low-battery/do-not-disturb icons.
2. **Time:** Consistent time across shots (e.g. 10:00 AM).
3. **Dark mode:** Match app default (light UI).
4. **Sensitive data:** No real employee emails, salaries, medical info, or client names.
5. **Messages:** Pre-seed demo conversations via staging or manual entry before capture.
6. **Device frames:** Optional; Play accepts raw screenshots.
7. **Localization:** Capture in default language (English) first.

---

## Feature graphic concept

- Background: brand navy `#08204a`
- Title: **PIMS**
- Subtitle: *Workforce Intelligence*
- Simple icon or abstract workforce imagery
- No small unreadable text

---

## Storage

Save masters in a folder **outside git** (e.g. `play-store-assets/`) or a dedicated design repo.

Suggested naming:

```
01-login.png
02-dashboard.png
03-attendance.png
...
feature-graphic-1024x500.png
icon-512.png
```

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Product | | | |
| Legal/Privacy | | | |
| Design | | | |
