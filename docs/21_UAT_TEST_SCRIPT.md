# 21 UAT Test Script

This script provides a comprehensive set of manual tests to verify the system's readiness for production. Tests are grouped by module and role.

## 🔑 1. Authentication & Security
| Role | Test Case | Expected Result |
|---|---|---|
| Guest | Login with invalid email | Error: "User not found" (mapped to 401/404) |
| Guest | Login with invalid password | Error: "Invalid credentials" |
| Admin | Login with bootstrap admin | Successful redirect to `/admin/dashboard` |
| Admin | Create new Manager user | User created, audit log recorded, status is `invited` |
| Invited | Activate account via email link | Set password successfully, status becomes `active` |
| All | Access `/admin` without admin role | Redirect to `/unauthorized` |
| All | Token refresh test | Stay logged in after 15 mins (if refresh works) |

## 🕒 2. Attendance & Breaks
| Role | Test Case | Expected Result |
|---|---|---|
| Employee | Check-in (Office mode) | Session status `active`, dashboard shows "Checked In" |
| Employee | Double Check-in | Error: "Active session already exists" |
| Employee | Start Prayer Break | Header shows "Break in Progress", break timer runs |
| Employee | End Prayer Break | Break duration saved, header returns to normal |
| Employee | Check-out | Session status `completed`, classification calculated (e.g., `FULL_DAY`) |
| Employee | Submit Correction Request | Request saved, manager notified |

## 🌴 3. Leaves & WFH
| Role | Test Case | Expected Result |
|---|---|---|
| Employee | Submit WFH request (Overlapping) | Error: `409 Conflict` with detail of existing request |
| Employee | Submit Half-Day request | Request saved, period (`first_half`) recorded |
| Manager | Approve Leave request | Status becomes `approved`, Timeline entry created, Email sent |
| Manager | Reject Leave (No reason) | Error: "Reason is required for rejection" |
| Employee | Cancel Pending Request | Request status becomes `cancelled` |

## 🏗️ 4. Projects & Tasks
| Role | Test Case | Expected Result |
|---|---|---|
| Employee | Create Project request | Status `pending_approval` |
| Manager | Approve Project | Project status `approved`, available for tasks |
| Employee | Create Task under Project | Task created with `created` status |
| Manager | Set Task Complexity | Complexity (e.g., 3) and Duration saved |
| Employee | Start Task Timer | Global timer starts, no other timer can start |
| Employee | Stop Task Timer | Duration added to task, `actual_duration` updated |
| Employee | Block Task | Prompt for reason, status becomes `blocked` |

## 📊 5. Reports & Analytics
| Role | Test Case | Expected Result |
|---|---|---|
| Admin | View Org Analytics | Charts load, KPI cards show data, No raw IDs visible |
| Manager | View Team Growth | Table shows direct reports with task/complexity stats |
| Employee | View Personal Growth | Personal goals and completed tasks visible |
| All | Dashboard Skeleton check | No jarring layout shifts during data loading |

## 📢 6. Organization & Announcements
| Role | Test Case | Expected Result |
|---|---|---|
| HR/Ops | Create Announcement (Dept specific) | Announcement saved, visible only to that Dept |
| Admin | Create Global Holiday | Holiday saved, added to org calendar |

## 🛡️ 7. Governance
| Role | Test Case | Expected Result |
|---|---|---|
| Admin | View Audit Logs | Role changes and approvals visible with Old/New values |
| Admin | View Alerts | Missing checkout and overdue tasks listed correctly |
| Manager | Resolve Alert | Alert status becomes `resolved` |

---

## Final Validation Sign-off
- [ ] No raw UUIDs visible in UI.
- [ ] All dates are in PKT format.
- [ ] Emails are being queued/sent (check worker logs).
- [ ] Mobile responsive layout usable for Check-in/out.
