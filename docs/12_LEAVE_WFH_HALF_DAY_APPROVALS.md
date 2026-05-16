# 12 Leave, WFH, and Half-Day Approvals

The Leave Management module handles various types of time-off and work-from-home requests, ensuring they follow a strict approval hierarchy and do not conflict with existing records.

## 1. Request Types
*   **Leave**: Full-day absence (Sick, Casual, Annual).
*   **WFH (Work From Home)**: Remote work request (Full day).
*   **Half-Day**: Partial absence (either `first_half` or `second_half` of the shift).

## 2. Approval Workflow
1.  **Submission**: Employee submits a request via the dashboard.
2.  **Routing**: The request is automatically routed to the user's **Reporting Manager**. If no manager is assigned, it falls back to **HR/Ops** or **Admin**.
3.  **Timeline**: Every action (Creation, Approval, Rejection, Cancellation) is recorded in the `approval_timeline` for auditability.
4.  **Notification**: An email is sent to the manager notifying them of the new request.
5.  **Decision**: Manager approves or rejects (with a reason).
6.  **Resolution**: The employee receives an email with the decision.

## 3. Conflict Validation
The system prevents overlapping requests to maintain data integrity.
*   **Full-Day vs Full-Day**: Cannot overlap.
*   **Full-Day vs Half-Day**: Cannot overlap on the same date.
*   **Half-Day vs Half-Day**: Allowed on the same date **only if** they are for different periods (e.g., First Half + Second Half).
*   **Conflicts**: Attempting to submit an overlapping request returns a `409 Conflict` error with a readable message.

## 4. Technical Implementation: Atomic Transactions
To prevent data corruption (e.g., creating a Leave Request without a corresponding Timeline entry), the system uses an atomic persistence pattern in the `LeaveService`:

```python
# Create primary request
req = LeaveRequest(...)
self.db.add(req)
self.db.flush() # Assigns ID without committing

# Create timeline entry referencing the request ID
self.approval_service.create_timeline_entry(
    entity_id=req.id, 
    ...
)

# Single commit for both entities
self.db.commit()
```
> [!IMPORTANT]
> This pattern ensures that "Network Errors" (caused by backend 500s during partial commits) are eliminated. If any step fails, the entire transaction is rolled back.

## 5. Cancellation & Escalation
*   **Cancellation**: Employees can cancel `pending` requests. Once approved or rejected, a request cannot be cancelled (must be handled via HR).
*   **Escalation**: If a manager does not act within a configured threshold, the request may be escalated to the Admin or HR role.
*   **Clarification**: Managers can request "Clarification" instead of a flat rejection, allowing the employee to update their reason or dates.

## 6. Business Rules
*   **Overlap Check**: Validation covers Pending, Approved, Escalated, and Needs Clarification statuses. Rejected and Cancelled requests are ignored during overlap checks.
*   **PKT Boundaries**: Requests are handled based on calendar dates in the **Asia/Karachi** timezone.

## 7. Known Issues & Fixes
*   **Transaction Fix**: Recently resolved an issue where orphaned `LeaveRequest` rows were created if the timeline log failed.
*   **Conflict UI**: Updated frontend to explicitly handle 409 errors and show the conflicting request details instead of a generic error.
