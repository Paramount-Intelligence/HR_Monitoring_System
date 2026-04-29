# Security and Governance

## 1. Security goals
- protect employee data
- enforce strict role boundaries
- maintain auditability for sensitive changes
- avoid accidental data exposure across teams
- secure credentials, sessions, and email workflows

## 2. Authentication requirements
- hashed passwords using secure algorithm
- secure reset tokens
- short lived access tokens
- refresh token rotation if used
- session invalidation on logout

## 3. Authorization requirements
- RBAC for all protected routes
- ownership and team scope checks in addition to role checks
- no trust in frontend role hiding alone
- manager access restricted to direct reports or scoped team members

## 4. Sensitive actions requiring audit log
- user creation
- user deactivation
- role changes
- manager mapping changes
- project approval decision
- complexity changes
- manual time edits by privileged roles

## 5. Data integrity rules
- no overlapping time logs
- no multiple active attendance sessions
- no timer start without approved project and valid task
- rejected projects cannot accept active tasks
- manual edits should preserve history or be audited

## 6. Privacy and employee trust
Because this product touches employee activity:
- keep copy neutral and professional
- avoid invasive tracking features in MVP
- make performance logic understandable at a high level
- provide correction flows for genuine mistakes
- do not market the system as surveillance internally

## 7. Operational security
- secrets in environment or secret manager only
- email provider credentials secured
- database backups enabled
- staging and production separation
- least privilege for service accounts

## 8. Recommended headers and protections
- CSRF mitigation where needed
- rate limiting on auth routes
- input validation on all write endpoints
- output filtering for personally scoped data
- secure cookies if using cookie sessions

## 9. Governance settings admin should control
- expected workday hours
- missing checkout threshold
- overdue task thresholds
- alert cooldown rules
- complexity scale configuration
- approval aging thresholds

## 10. Compliance ready behavior
Even if formal compliance is not in scope now, design as if audits may happen later:
- stable audit logs
- immutable event history for key actions
- traceable approval records
- consistent timestamp storage in UTC
