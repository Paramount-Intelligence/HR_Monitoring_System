# Test Plan and Acceptance Criteria

## 1. Test strategy
Use:
- unit tests for business logic
- integration tests for API workflows
- end to end tests for critical user journeys
- visual QA for dashboard polish and responsive behavior

## 2. Critical acceptance criteria

### Auth
- user can sign in with valid credentials
- invalid credentials show proper error
- inactive users cannot sign in

### User management
- admin can create managers and employees
- manager can create employees
- manager cannot create admin or other managers
- role and scope checks enforced

### Attendance
- employee can check in once per active session
- employee cannot create second active session
- employee can check out properly
- missing checkout sessions can be detected

### Projects
- employee can submit project request
- manager can approve or reject
- rejected project requires reason
- only approved or active projects can accept production task tracking

### Tasks
- task can be created under approved project
- manager can set complexity and expected duration
- blocked task requires blocked reason
- completed task timestamps correctly

### Timer and time logs
- only one active timer per user
- timer cannot overlap
- manual time log cannot overlap
- stopping timer calculates duration correctly
- time links back to task and user correctly

### Dashboards
- employee sees own data only
- manager sees scoped team data only
- admin sees org wide data
- charts and tables render without broken states

### Alerts
- email alerts generate for configured cases
- duplicate alert suppression works
- alert status can be resolved or dismissed in system
- failed sends are tracked

### Audit logs
- approval action creates audit log
- role changes create audit log
- manual edits create audit log

## 3. UX acceptance criteria
- primary actions visible without hunting
- forms validated inline
- tables are readable and filterable
- empty states are present
- loading states do not flash raw layouts
- mobile view remains usable for key screens

## 4. Test datasets
Need coverage for:
- normal employee
- underutilized employee
- overloaded employee
- overdue tasks
- blocked tasks
- missing checkout
- suspicious overlapping manual entries attempt
- manager with mixed team state

## 5. Automation targets
- auth
- attendance
- approval flows
- timer rules
- RBAC boundaries
- alert generation logic
