# 24 AI Agent Implementation Guide

This guide is for AI agents (and human developers) contributing to the Workforce Intelligence & Execution OS. Adherence to these rules ensures consistency, security, and data integrity.

## 1. Technical Best Practices

### Atomic Transactions
When creating or updating multiple related entities, **you must use atomic transactions**.
*   **Do**: Use `db.flush()` to obtain IDs, then create related records, then `db.commit()`.
*   **Don't**: Perform multiple commits within a single logical action.
*   **Reference**: See [Doc 12: Leaves & Approvals](file:///d:/HR%20Monitoring%20System/docs/12_LEAVE_WFH_HALF_DAY_APPROVALS.md#4-technical-implementation-atomic-transactions) for the pattern.

### Validation Overlap
Always implement server-side validation to prevent logical overlaps (Attendance, Leaves, Time Logs).
*   Use the `Service` layer for these checks, not the API route directly.
*   Return a `409 Conflict` if an overlap is detected.

### Timezone Handling
*   **Database**: Always store `DateTime` in UTC.
*   **Logic**: Use `Asia/Karachi` (PKT) for business logic (e.g., "Is it after 5 PM PKT?").
*   **Frontend**: Display all times in PKT using the provided date helpers.

## 2. UI/UX Rules

### No Raw IDs
**Crucial Rule**: Never display UUIDs in the user interface as labels.
*   **Correct**: "Project: Website Redesign"
*   **Incorrect**: "Project: 550e8400-e29b-41d4-a716-446655440000"
*   In dropdowns, the `value` is the ID, but the `label` must be a human-readable string.

### Design System Consistency
*   Use **Tailwind CSS** only.
*   Leverage existing **shadcn/ui** components.
*   Maintain the **rounded-xl** and **slate-based** theme.
*   Use **Lucide React** for icons.

### Feedback Loop
*   Always show a loading state (Skeleton or Spinner) during async actions.
*   Provide success/error toasts for all mutations.

## 3. Workflow Implementation
*   **Services**: Encapsulate all business logic in `apps/api/app/services`.
*   **Models**: Define all schema changes in `apps/api/app/models` and generate a migration using `alembic revision --autogenerate`.
*   **Schemas**: Use Pydantic for all request/response bodies in `apps/api/app/schemas`.

## 4. Communication Guidelines
*   **Email Templates**: If adding a new notification, create a corresponding Jinja2 template in `apps/api/app/templates`.
*   **Audit Logs**: Every sensitive action **must** trigger an audit log entry via the `AuditLogService`.

## 5. Pre-Commit Checklist for AI Agents
- [ ] Are all database operations atomic?
- [ ] Is the code free of hardcoded raw IDs in the UI?
- [ ] Did I handle Asia/Karachi timezone correctly?
- [ ] Is there an audit log for this action?
- [ ] Did I follow the existing directory structure and naming conventions?
