# Database Schema Specification

## 1. Design principles
- normalize transactional data
- preserve auditability
- support time series reporting
- avoid business critical logic in UI only
- use enums carefully and consistently

## 2. Core tables

### users
| column | type | notes |
|---|---|---|
| id | uuid pk | primary key |
| full_name | varchar | required |
| email | varchar unique | required |
| password_hash | varchar | required |
| role | enum | admin, manager, employee |
| manager_id | uuid fk users.id | nullable for admin |
| department | varchar | optional initially |
| designation | varchar | optional initially |
| status | enum | active, inactive |
| created_by | uuid fk users.id | creator |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### teams
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | varchar | |
| manager_id | uuid fk users.id | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### attendance_sessions
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk users.id | |
| check_in_at | timestamptz | required |
| check_out_at | timestamptz | nullable until checkout |
| work_mode | enum | office, wfh |
| session_status | enum | active, completed, incomplete, corrected |
| correction_requested | boolean | default false |
| correction_reason | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### projects
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| title | varchar | |
| description | text | |
| owner_id | uuid fk users.id | creator / requester |
| manager_id | uuid fk users.id | approver |
| priority | enum | low, medium, high, critical |
| approval_status | enum | pending, approved, rejected |
| project_status | enum | draft, pending_approval, approved, active, on_hold, completed, rejected, archived |
| due_date | date | nullable |
| approved_at | timestamptz | nullable |
| rejected_reason | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### tasks
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| project_id | uuid fk projects.id | |
| assigned_to | uuid fk users.id | employee |
| created_by | uuid fk users.id | creator |
| title | varchar | |
| description | text | |
| complexity_level | int | e.g. 1,2,3,5 |
| expected_duration_minutes | int | |
| actual_duration_minutes | int | derived or cached |
| priority | enum | low, medium, high, critical |
| status | enum | created, approved, in_progress, blocked, completed, reviewed, reopened |
| blocked_reason | text | nullable |
| due_date | date | nullable |
| completed_at | timestamptz | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### time_logs
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| task_id | uuid fk tasks.id | |
| user_id | uuid fk users.id | |
| started_at | timestamptz | |
| ended_at | timestamptz | nullable while active |
| duration_minutes | int | computed on close |
| source_type | enum | timer, manual |
| notes | text | nullable |
| status | enum | active, completed, invalid |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### approvals
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| entity_type | enum | project, timesheet, task |
| entity_id | uuid | polymorphic reference tracked by entity_type |
| requested_by | uuid fk users.id | |
| decided_by | uuid fk users.id | nullable |
| decision | enum | pending, approved, rejected |
| reason | text | nullable |
| created_at | timestamptz | |
| decided_at | timestamptz | nullable |

### alerts
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| alert_type | enum | missing_checkout, overdue_task, idle_after_checkin, suspicious_logging, approval_delay, blocked_task, workload_overload |
| severity | enum | low, medium, high, critical |
| recipient_user_id | uuid fk users.id | |
| related_entity_type | enum | attendance_session, project, task, user, approval |
| related_entity_id | uuid | |
| email_status | enum | queued, sent, failed, dismissed |
| status | enum | open, resolved, dismissed |
| title | varchar | |
| message | text | |
| created_at | timestamptz | |
| resolved_at | timestamptz | nullable |

### performance_metrics_daily
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk users.id | |
| metric_date | date | |
| total_session_minutes | int | |
| productive_minutes | int | |
| output_score | numeric | |
| efficiency_score | numeric | |
| utilization_score | numeric | |
| consistency_score | numeric | |
| composite_score | numeric | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| unique(user_id, metric_date) |  | |

### audit_logs
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| actor_user_id | uuid fk users.id | |
| action_type | varchar | e.g. PROJECT_APPROVED |
| entity_type | varchar | |
| entity_id | uuid | |
| old_value | jsonb | nullable |
| new_value | jsonb | nullable |
| metadata | jsonb | nullable |
| created_at | timestamptz | |

## 3. Important constraints
- only one active time log per user
- check_out_at must be after check_in_at
- duration_minutes cannot be negative
- tasks must belong to approved or active projects for timer start
- manager scoping enforced at API layer and query layer
- email alert deduplication required for repeated anomaly conditions

## 4. Recommended indexes
- users(email)
- users(manager_id)
- attendance_sessions(user_id, check_in_at desc)
- projects(owner_id, approval_status)
- tasks(project_id, assigned_to, status)
- time_logs(user_id, started_at desc)
- time_logs(task_id)
- approvals(entity_type, entity_id)
- alerts(recipient_user_id, status, created_at desc)
- performance_metrics_daily(user_id, metric_date desc)
- audit_logs(entity_type, entity_id, created_at desc)

## 5. Derived logic notes
- actual_duration_minutes on tasks can be updated asynchronously from completed time_logs
- performance_metrics_daily should be built by worker jobs
- team level and company level rollups can be computed from daily metrics tables

## 6. Suggested enum values
Keep enum values backend safe and frontend friendly. Frontend labels should map from enums, not display raw enum text.
