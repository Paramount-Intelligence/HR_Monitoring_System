# 16 Email and SMTP

Email is the primary communication channel for operational alerts, workflow approvals, and account management.

## 1. SMTP Configuration
The system uses standard SMTP for sending emails. Configuration is managed via environment variables:

| Variable | Description | Example (Gmail) |
|---|---|---|
| `SMTP_HOST` | SMTP server address | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (usually 587 or 465) | `587` |
| `SMTP_TLS` | Enable/Disable TLS encryption | `True` |
| `SMTP_USER` | Authenticated email address | `your_email@gmail.com` |
| `SMTP_PASSWORD` | App-specific password | `xxxx xxxx xxxx xxxx` |
| `EMAILS_FROM_EMAIL` | "From" address displayed to users | `hr.picentral@gmail.com` |
| `EMAILS_FROM_NAME` | "From" name displayed to users | `Workforce OS` |

## 2. Core Email Types
*   **Account Invitation**: Sent to new users with an activation link.
*   **Password Reset**: Sent when a user requests a reset.
*   **Approval Pending**: Notifies a Manager of a new Project or Leave request.
*   **Approval Decision**: Notifies an Employee when their request is Approved or Rejected.
*   **Operational Alerts**: Notifies Managers/Admins of exceptions (Missing Checkout, Overdue Task).

## 3. Implementation Logic
*   **Template Engine**: Uses Jinja2 templates for rendering HTML emails.
*   **Asynchronous Delivery**: Emails are offloaded to a **Celery Worker** to prevent blocking the main API response.
*   **Verification**: SMTP is marked as **"Requires Verification"** in the initial pilot setup. Ensure the worker is running and connected to Redis to process the email queue.

## 4. Testing SMTP
### Local Development
*   Recommend using **Mailtrap** or **MailHog** to capture outgoing emails without sending them to real addresses.
*   Check backend logs for "Successfully sent email" or SMTP-specific error messages.

### Gmail Specific Notes
*   If using a personal Gmail account, you **must** use an **App Password**. Regular passwords will be blocked by Google's security.
*   Ensure "Less secure apps" (legacy) or 2FA + App Passwords are configured.

## 5. Common Issues & Debugging
*   **Emails not sending**:
    *   Verify `SMTP_USER` and `SMTP_PASSWORD` in `.env`.
    *   Check if the Celery worker is running (`python -m celery -A app.worker worker ...`).
    *   Check for firewall restrictions on port 587.
*   **Broken Links**: Ensure `FRONTEND_BASE_URL` is correctly set in the environment (e.g., `https://your-app.up.railway.app`).
*   **Network Error**: If the API crashes during email queuing, check Redis connection.

## 6. Production Readiness Checklist
- [ ] Valid SMTP provider configured (e.g., SendGrid, Postmark, or dedicated Gmail).
- [ ] SPF/DKIM records set up for the sending domain (if using a custom domain).
- [ ] `EMAILS_FROM_EMAIL` matches the authenticated SMTP user.
- [ ] Test invitation flow end-to-end.
- [ ] Test password reset flow end-to-end.
