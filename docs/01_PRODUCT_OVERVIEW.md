# 01 Product Overview

## Product Vision
**Workforce Intelligence & Execution OS** is an internal workforce operations platform designed to capture employee work activity, govern project and task execution, and turn operational data into actionable performance and workload insights.

This is **not** a surveillance app or a simple timesheet system. It is a work execution intelligence layer that focuses on actionability, fair performance scoring, and workload visibility.

## Company Context
*   **Company**: Paramount Intelligence
*   **Target Audience**: Internal operations and workforce management.

## Core Modules
1.  **Attendance & Work Sessions**: Structured check-in/out with PKT timezone support and automatic classification (Full Day, Half Day, etc.).
2.  **Break Tracking**: Paid break management (Dinner, Prayer, etc.) integrated into attendance sessions.
3.  **Project Governance**: Employee-initiated project requests with manager-based approval workflows.
4.  **Task Management**: Comprehensive task lifecycle (Created → In Progress → Completed) with complexity scoring.
5.  **Leave & WFH Management**: Atomic submission and approval flow for leaves, work-from-home, and half-day requests.
6.  **Time Tracking**: Real-time timer and manual logging for task-specific duration tracking.
7.  **Analytics Dashboards**: Role-specific dashboards (Admin, Manager, Employee) with KPI cards and trend charts.
8.  **Alerts & Audit Logs**: Automated email alerts for exceptions (missing checkouts, overdue tasks) and detailed audit trails for governance.

## Supported Roles
*   **Admin**: Full system control and organization-wide visibility.
*   **HR / Operations**: User management, reports, and organization configuration.
*   **Manager**: Team oversight, project/leave approvals, and workload balancing.
*   **Team Lead**: Subset of manager permissions for specific teams.
*   **Employee**: Daily work execution, attendance, and task logging.
*   **Intern / Junior Employee**: Specialized roles with scoped activity.

## Current Maturity Level
The product is currently in **Beta / Production Pilot Ready** state.

*   **Implemented**: Core auth, attendance, project/task flows, leave management, basic analytics, and admin bootstrap.
*   **Evolving**: Advanced reporting, predictive AI insights, and cross-module anomaly detection.
*   **Planned**: Full mobile-responsive optimization and deeper integration with external communication tools (email only for now).

## Operating Model
The system operates on a **Task-First** philosophy. While raw hours are captured, productivity is measured through complexity-adjusted output and consistency. All operational exceptions are surfaced via **Email Alerts** to minimize dashboard fatigue.
