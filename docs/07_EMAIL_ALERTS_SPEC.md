# Email Alerts Specification

## 1. Alerting principles
- email is the only delivery channel
- alerts must be useful, not noisy
- deduplicate repeated alerts
- group low priority alerts where appropriate
- critical alerts should send immediately
- less urgent summaries can be batched

## 2. Alert categories

### Employee alerts
- missing check out reminder
- active timer still running
- incomplete daily logs
- project approved or rejected
- correction request response

### Manager alerts
- new project awaiting approval
- overdue task
- blocked task
- task exceeding expected duration
- employee inactive after check in
- overloaded employee
- suspicious logging pattern in team

### Admin alerts
- organization level anomaly
- persistent low utilization in a team
- approval backlog above threshold
- repeated suspicious logging across users
- email delivery failures if operationally important

## 3. Delivery timing
- immediate for critical workflow alerts
- hourly or daily digest for low severity summaries
- missing check out reminder at configured end of day buffer
- overdue task alert when threshold crossed and not already sent recently

## 4. Template requirements
Every alert email must include:
- clear subject line
- short explanation
- relevant user, task, or project context
- direct CTA link to dashboard page
- timestamp
- organization branding

## 5. Example subject lines
- Action needed: New project awaiting approval
- Reminder: You forgot to check out today
- Alert: Task has exceeded expected duration
- Warning: Team workload imbalance detected

## 6. Deduplication rules
- do not send the same alert type for same entity to same user multiple times within a cooldown window
- update dashboard alert status even when email is suppressed by cooldown
- log all attempted sends and outcomes

## 7. Failure handling
- retry failed emails with backoff
- store provider response
- surface persistent failures in admin operational alerts if needed

## 8. Preference model
For MVP:
- email alerts are system controlled by role and severity
- no end user custom preference center required

## 9. AI agent implementation notes
- isolate templates in a dedicated mailer module
- use strongly typed payloads per alert
- keep subject generation deterministic
- include absolute URLs via environment config
