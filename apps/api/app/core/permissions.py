"""Permission definitions and role-permission mapping.

This module defines all available permission keys and maps them to roles.
Intern and Junior Employee share the BASIC_EMPLOYEE_RESTRICTED bundle.
"""
from __future__ import annotations

from app.models.enums import UserRole

# ------------------------------------------------------------------
# All available permission keys
# ------------------------------------------------------------------

ALL_PERMISSIONS: list[tuple[str, str]] = [
    # User management
    ("users.view_all", "View all users in the org"),
    ("users.create", "Create new user accounts"),
    ("users.edit", "Edit user profiles and settings"),
    ("users.deactivate", "Deactivate user accounts"),
    ("users.suspend", "Suspend user accounts"),
    ("users.manage_roles", "Assign and change user roles"),
    # Attendance
    ("attendance.view_own", "View own attendance records"),
    ("attendance.view_team", "View team attendance records"),
    ("attendance.view_org", "View org-wide attendance"),
    ("attendance.approve_correction", "Approve attendance corrections"),
    # Leave
    ("leave.apply", "Apply for leave"),
    ("leave.approve", "Approve leave requests"),
    ("leave.view_team", "View team leave requests"),
    ("leave.view_org", "View all org leave requests"),
    # Projects
    ("projects.create", "Create new projects"),
    ("projects.approve", "Approve project proposals"),
    ("projects.view_all", "View all projects"),
    # Tasks
    ("tasks.create_own", "Create tasks for self"),
    ("tasks.create_team", "Create/assign tasks for team members"),
    ("tasks.set_priority", "Set task priority levels"),
    ("tasks.set_complexity", "Set task complexity"),
    ("tasks.view_team", "View team tasks"),
    # EOD
    ("eod.submit", "Submit End of Day reports"),
    ("eod.review", "Review EOD submissions"),
    ("eod.approve", "Approve EOD reports"),
    # Reports
    ("reports.view_own", "View own performance reports"),
    ("reports.view_team", "View team reports"),
    ("reports.view_org", "View org-wide reports"),
    # Org management
    ("announcements.create", "Create company announcements"),
    ("holidays.manage", "Manage holiday calendar"),
    ("shifts.manage", "Manage work shifts"),
    ("departments.manage", "Manage departments"),
    # System
    ("audit.view", "View audit trail logs"),
    ("permissions.manage", "Manage role permissions"),
    ("analytics.view_team", "View team analytics"),
    ("analytics.view_org", "View org analytics"),
]

# ------------------------------------------------------------------
# Role → Permission bundles
# ------------------------------------------------------------------

# Shared bundle for INTERN and JUNIOR_EMPLOYEE
BASIC_EMPLOYEE_RESTRICTED = [
    "attendance.view_own",
    "leave.apply",
    "tasks.create_own",
    "eod.submit",
    "reports.view_own",
]

ROLE_PERMISSIONS: dict[str, list[str]] = {
    UserRole.ADMIN: [p[0] for p in ALL_PERMISSIONS],  # Full access

    UserRole.HR_OPERATIONS: [
        "users.view_all",
        "users.create",
        "users.edit",
        "users.deactivate",
        "attendance.view_own",
        "attendance.view_team",
        "attendance.view_org",
        "attendance.approve_correction",
        "leave.apply",
        "leave.approve",
        "leave.view_team",
        "leave.view_org",
        "reports.view_own",
        "reports.view_team",
        "reports.view_org",
        "announcements.create",
        "holidays.manage",
        "shifts.manage",
        "departments.manage",
        "eod.submit",
        "analytics.view_team",
        "analytics.view_org",
    ],

    UserRole.MANAGER: [
        "users.create",
        "users.edit",
        "attendance.view_own",
        "attendance.view_team",
        "attendance.approve_correction",
        "leave.apply",
        "leave.approve",
        "leave.view_team",
        "projects.create",
        "projects.approve",
        "tasks.create_own",
        "tasks.create_team",
        "tasks.set_priority",
        "tasks.set_complexity",
        "tasks.view_team",
        "eod.submit",
        "eod.review",
        "eod.approve",
        "reports.view_own",
        "reports.view_team",
        "analytics.view_team",
    ],

    UserRole.TEAM_LEAD: [
        "attendance.view_own",
        "attendance.view_team",
        "leave.apply",
        "leave.view_team",
        "projects.create",
        "tasks.create_own",
        "tasks.create_team",
        "tasks.set_priority",
        "tasks.view_team",
        "eod.submit",
        "eod.review",
        "reports.view_own",
        "reports.view_team",
        "analytics.view_team",
    ],

    UserRole.EMPLOYEE: [
        "attendance.view_own",
        "leave.apply",
        "projects.create",
        "tasks.create_own",
        "eod.submit",
        "reports.view_own",
    ],

    UserRole.INTERN: BASIC_EMPLOYEE_RESTRICTED,

    UserRole.JUNIOR_EMPLOYEE: BASIC_EMPLOYEE_RESTRICTED,  # Same as INTERN
}
