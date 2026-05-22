import logging
import smtplib
from email.message import EmailMessage
from typing import Any

from app.core.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_email(email_to: str, subject: str, html_content: str) -> None:
        if not settings.smtp_host:
            logger.warning(
                f"SMTP_HOST not set. Mocking email send to {email_to}:\n"
                f"Subject: {subject}\n"
                f"Body: {html_content}"
            )
            return

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = f"{settings.emails_from_name} <{settings.emails_from_email}>"
        msg["To"] = email_to
        msg.set_content(html_content, subtype="html")

        # Production-grade retry logic
        max_retries = 3
        retry_delay = 1 # second
        import time

        for attempt in range(max_retries):
            try:
                # We assume TLS for standard SMTP like Gmail/SendGrid
                if settings.smtp_tls:
                    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                        server.starttls()
                        if settings.smtp_user and settings.smtp_password:
                            server.login(settings.smtp_user, settings.smtp_password)
                        server.send_message(msg)
                else:
                    # Fallback for local testing or unencrypted relays
                    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                        if settings.smtp_user and settings.smtp_password:
                            server.login(settings.smtp_user, settings.smtp_password)
                        server.send_message(msg)
                logger.info(f"Successfully sent email to {email_to} on attempt {attempt + 1}")
                return
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed to send email to {email_to}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (attempt + 1))
                else:
                    raise e

    @classmethod
    def send_missing_checkout_alert(cls, user: User, session_id: str) -> None:
        subject = "Reminder: You forgot to check out today"
        dashboard_url = f"{settings.frontend_base_url}/employee/attendance"
        html_content = f"""
        <html>
            <body>
                <h2>Workforce OS Alert</h2>
                <p>Hi {user.full_name},</p>
                <p>Our system detected that you did not check out at the end of your workday.</p>
                <p>Please log in and update your attendance record, or submit a correction request to your manager.</p>
                <br/>
                <a href="{dashboard_url}">Go to Attendance Dashboard</a>
            </body>
        </html>
        """
        cls.send_email(user.email, subject, html_content)

    @classmethod
    def send_overdue_task_alert(cls, manager: User, task: Any, assignee: User) -> None:
        subject = f"Action needed: Task '{task.title}' is overdue"
        dashboard_url = f"{settings.frontend_base_url}/manager/tasks"
        html_content = f"""
        <html>
            <body>
                <h2>Workforce OS Alert</h2>
                <p>Hi {manager.full_name},</p>
                <p>A task assigned to <strong>{assignee.full_name}</strong> is currently overdue.</p>
                <p><strong>Task:</strong> {task.title}</p>
                <p><strong>Due Date:</strong> {task.due_date}</p>
                <br/>
                <a href="{dashboard_url}">Review Team Tasks</a>
            </body>
        </html>
        """
        cls.send_email(manager.email, subject, html_content)

    @classmethod
    def send_pending_approval_reminder(cls, manager: User, count: int) -> None:
        subject = f"Action Required: {count} pending approvals"
        dashboard_url = f"{settings.frontend_base_url}/manager/approvals"
        html_content = f"""
        <html>
            <body>
                <h2>Workforce OS Approval Alert</h2>
                <p>Hi {manager.full_name},</p>
                <p>You have {count} items waiting for your approval in the system.</p>
                <br/>
                <a href="{dashboard_url}">Go to Approvals</a>
            </body>
        </html>
        """
        cls.send_email(manager.email, subject, html_content)

    @classmethod
    def send_announcement_alert(cls, user: User, title: str) -> None:
        subject = f"New Announcement: {title}"
        html_content = f"""
        <html>
            <body>
                <h2>Paramount Intelligence - Announcement</h2>
                <p>Hi {user.full_name},</p>
                <p>A new announcement has been posted: <strong>{title}</strong></p>
                <p>Please check the workforce portal for more details.</p>
            </body>
        </html>
        """
        cls.send_email(user.email, subject, html_content)

    @classmethod
    def send_account_invitation(cls, user: User, token: str, created_by_name: str) -> None:
        subject = "Set up your PIMS account"
        activation_url = f"{settings.frontend_base_url}/activate?token={token}"
        
        # Polished branded template containing the exact required text
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
        .header {{ margin-bottom: 30px; }}
        .logo {{ font-size: 24px; font-weight: bold; color: #0f172a; text-decoration: none; }}
        .card {{ background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
        .greeting {{ font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }}
        .button {{ display: inline-block; background: #0f172a; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; margin-top: 16px; margin-bottom: 16px; }}
        .footer {{ margin-top: 30px; font-size: 13px; color: #94a3b8; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="logo">Paramount Intelligence</span>
        </div>
        <div class="card">
            <div class="greeting">Hello {user.full_name},</div>
            <p>An account has been created for you in PIMS, the Paramount Intelligence Monitoring System.</p>
            <p>Please set your password using the secure link below:</p>
            <p style="text-align: center;">
                <a href="{activation_url}" class="button">Set Up Password</a>
            </p>
            <p style="word-break: break-all; font-size: 13px; color: #64748b;">
                Or copy and paste this link into your browser:<br/>
                <a href="{activation_url}" style="color: #2563eb;">{activation_url}</a>
            </p>
            <p>This link will expire in 24 hours.</p>
            <p>If you were not expecting this invitation, please contact your administrator.</p>
            <p style="margin-top: 24px; font-weight: 600; color: #0f172a;">Paramount Intelligence</p>
        </div>
        <div class="footer">
            &copy; 2026 Paramount Intelligence. All rights reserved.
        </div>
    </div>
</body>
</html>
"""
        cls.send_email(user.email, subject, html_content)

    @classmethod
    def send_password_reset(cls, user: User, token: str) -> None:
        subject = "Workforce OS: Password Reset Request"
        reset_url = f"{settings.frontend_base_url}/reset-password?token={token}"
        
        html_content = f"""
        <html>
            <body style="font-family: sans-serif; line-height: 1.5; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #0f172a;">Password Reset</h2>
                    <p>Hi {user.full_name},</p>
                    <p>You requested to reset your password for your Workforce OS account.</p>
                    <p>Please click the button below to set a new password. This link will expire in 2 hours.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p>If you did not request this, you can safely ignore this email.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #777;">&copy; 2026 Paramount Intelligence. All rights reserved.</p>
                </div>
            </body>
        </html>
        """
        cls.send_email(user.email, subject, html_content)

    @classmethod
    def send_escalation_alert(cls, admin: User, entity_type: str, entity_id: str) -> None:
        subject = f"ESCALATION: {entity_type} approval delayed"
        html_content = f"""
        <html>
            <body>
                <h2>Workforce OS Escalation</h2>
                <p>Hi {admin.full_name},</p>
                <p>A {entity_type} approval (ID: {entity_id}) has been escalated to you due to inactivity.</p>
                <p>Please review and take action.</p>
            </body>
        </html>
        """
        cls.send_email(admin.email, subject, html_content)
