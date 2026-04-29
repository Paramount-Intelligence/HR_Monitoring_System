# User Flows and Dashboard Specifications

## 1. Employee core flows

### Flow A: Daily attendance
1. user signs in
2. employee lands on overview page
3. primary card prompts check in if not checked in
4. user chooses work mode: office or WFH
5. check in completes and dashboard updates
6. at end of day user checks out
7. if user forgets, system later emails reminder

### Flow B: Submit project request
1. employee opens projects page
2. clicks create project
3. completes form
4. project saved as pending approval
5. manager receives email alert
6. employee sees pending badge in own list

### Flow C: Create and work on task
1. employee opens a project
2. adds a task or opens assigned task
3. task details page shows status and timer
4. employee clicks start timer
5. timer runs globally in header
6. employee stops timer when done
7. task time summary updates

## 2. Manager core flows

### Flow A: Review pending approvals
1. manager opens approvals page
2. sees queue sorted by oldest first
3. opens project detail drawer
4. approves or rejects with reason
5. email confirmation is sent where applicable
6. audit log recorded

### Flow B: Define complexity
1. manager opens team task
2. sets complexity level
3. sets expected duration
4. task scoring logic becomes available

### Flow C: Review workload
1. manager opens workload page
2. sees all direct reports with active tasks and estimated load
3. identifies overloaded employee
4. reassigns task or updates plan

## 3. Admin core flows

### Flow A: Create accounts
1. admin opens users page
2. clicks create user
3. selects role and reporting manager
4. system sends invitation or temporary credentials email
5. audit log records creation

### Flow B: Review org performance
1. admin opens org overview
2. filters by date range
3. reviews KPI cards, trends, comparisons
4. opens risk list or alerts
5. drills into specific manager or employee

## 4. Dashboard specifications

## Employee dashboard

### Section A: Today at a glance
- check in status
- check out status
- work mode
- active timer state
- total time today
- productive time today

### Section B: My tasks
- in progress
- due soon
- blocked
- recently completed

### Section C: Weekly trends
- daily productive minutes
- task completion trend
- work mode days summary

### Section D: My performance
- output score trend
- utilization score trend
- consistency notes

## Manager dashboard

### Section A: Team KPI cards
- team members checked in today
- tasks overdue
- tasks blocked
- pending approvals
- overloaded employees
- average utilization

### Section B: Exceptions
- overdue tasks list
- blocked tasks list
- suspicious activity alerts
- missing check out list

### Section C: Workload distribution
- bar chart by employee
- active tasks count
- assigned estimated hours
- actual logged hours

### Section D: Team performance
- comparison chart by employee
- trend over last 7 or 30 days
- WFH vs office comparison

## Admin dashboard

### Section A: Org KPIs
- active employees today
- average productive hours
- open alerts
- average approval turnaround
- average utilization
- top managers by team output

### Section B: Org analytics
- trend line for productive hours
- manager comparison chart
- department comparison chart
- WFH vs office distribution

### Section C: Performance and risk
- top performers table
- low utilization table
- delayed approvals
- suspicious logging patterns

### Section D: Operational controls
- quick links to users, alerts, audit logs, settings

## 5. Detail pages

### Task detail page
- title and project context
- owner and assignee
- complexity and expected time
- actual time logged
- status history
- timer controls
- comments
- manager actions if authorized

### Project detail page
- title and description
- owner and approver
- approval status
- timeline
- task list
- progress summary

## 6. Empty states
Every list and dashboard section must define empty state copy.
Examples:
- "No tasks due today"
- "No pending approvals right now"
- "No alerts in the selected period"

## 7. Loading states
Use skeleton loading for:
- KPI cards
- tables
- charts
- drawers

## 8. Error states
- actionable messages
- retry option where relevant
- do not expose raw backend errors to users
