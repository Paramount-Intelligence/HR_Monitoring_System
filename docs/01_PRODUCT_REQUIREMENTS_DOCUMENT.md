# Product Requirements Document
## Workforce Intelligence & Execution OS

## 1. Product vision
Build an internal workforce intelligence platform that captures employee work activity, governs project and task execution, and turns operational data into actionable performance and workload insights for managers and leadership.

This is not a surveillance app and not just a timesheet system. It is a work execution intelligence layer.

## 2. Goals
- capture attendance, tasks, projects, and time logs in a structured way
- enforce manager approvals and role based permissions
- generate fair performance metrics using complexity adjusted logic
- provide admin and manager dashboards with graphs, tables, and exception visibility
- send email based alerts for important operational events
- maintain a polished and user friendly UI that employees will actually adopt

## 3. Non goals for initial release
- payroll processing
- Slack or Teams integrations
- invasive desktop surveillance
- browser extension monitoring
- full HRIS replacement
- external client billing
- mobile app native build

## 4. Users and roles

### Admin
Responsibilities:
- create manager and employee accounts
- view all system analytics
- configure system rules
- manage alert thresholds
- access audit logs
- review organization level performance

### Manager
Responsibilities:
- create employee accounts
- approve or reject employee created projects
- define task complexity
- track team workload and performance
- review pending approvals and alerts

### Employee
Responsibilities:
- check in and check out
- choose work mode: office or WFH
- create project requests
- create and update tasks
- run task timers
- log manual time if needed
- review own productivity and activity

## 5. Core modules
- authentication and access control
- user and team management
- attendance and work session management
- project management with manager approval
- task management with lifecycle states
- time tracking
- analytics dashboards
- email alerts
- audit logging
- performance scoring
- workload intelligence

## 6. Functional requirements

### 6.1 Authentication
- users can sign in with email and password
- secure session management is required
- password reset flow must exist
- inactive users cannot sign in

### 6.2 User management
- admin can create managers and employees
- manager can create employees only
- users have department, designation, status, reporting manager
- users can be activated or deactivated

### 6.3 Attendance and work sessions
- employee can check in
- employee can check out
- employee selects work mode on check in
- system records timestamps
- system detects missing check out
- employee can request correction for incomplete sessions
- admin and manager can view attendance records

### 6.4 Projects
- employee can submit a project request
- project requires manager approval before active use
- manager can approve or reject with reason
- approved project becomes available for tasks
- project has title, description, priority, due date, owner, status

### 6.5 Tasks
- employee can create tasks under approved projects
- manager defines complexity and expected duration
- task statuses: created, approved, in_progress, blocked, completed, reviewed, reopened
- blocked tasks require a reason
- tasks support notes and comments
- tasks can have due dates and priorities

### 6.6 Time tracking
- employee starts and stops a task timer
- manual log entry supported as fallback
- one active timer per user
- system stores time per task and per project
- overlapping time entries are not allowed

### 6.7 Dashboards
- employee sees own attendance, tasks, work time, and trends
- manager sees team activity, approvals, workload distribution, bottlenecks
- admin sees organization performance, comparisons, alerts, and trends

### 6.8 Alerts
Email only.
Examples:
- missing check out
- overdue task
- task exceeding expected duration
- no activity after check in
- approval pending too long
- suspicious logging patterns

### 6.9 Performance metrics
Metrics should not rely on hours alone.
Include:
- output score
- efficiency score
- utilization score
- consistency score
- composite score

### 6.10 Audit logging
Record:
- login and logout events
- project approvals
- task status changes
- role changes
- time log edits
- account creation and deactivation

## 7. User stories

### Employee
- as an employee, I want to check in quickly so that daily logging is easy
- as an employee, I want to start a task timer so that my work time is captured accurately
- as an employee, I want to see my own task and time summary so that I understand my work pattern

### Manager
- as a manager, I want to approve projects and define complexity so that work is structured correctly
- as a manager, I want to see who is overloaded so that I can rebalance work
- as a manager, I want email alerts for overdue or blocked work so that I can act fast

### Admin
- as an admin, I want a company wide dashboard so that I can assess organizational health
- as an admin, I want audit logs so that important actions are traceable
- as an admin, I want configurable thresholds so that the system fits policy needs

## 8. Success metrics
- daily active usage by employees
- percentage of sessions with valid check in and check out
- percentage of time logs attached to tasks
- manager approval turnaround time
- overdue task reduction
- workload balance improvement
- email alert delivery success rate

## 9. UX requirements
- the most common actions must take one or two clicks
- the interface must look modern, clear, and calm
- use clear hierarchy, whitespace, rounded cards, and helpful empty states
- avoid admin heavy complexity in employee views
- dashboards should surface exceptions before dense detail
- use human labels, not technical field names
- support dark mode later, but design system should be ready now

## 10. Release phases

### Phase 1
- auth
- user roles
- attendance
- projects
- tasks
- basic timer
- basic dashboards

### Phase 2
- approvals
- audit logs
- workload views
- validation rules
- correction requests

### Phase 3
- metrics engine
- email alerts
- performance scoring
- WFH vs office analysis

### Phase 4
- AI summarization
- anomaly detection
- predictive workload and delay insights
