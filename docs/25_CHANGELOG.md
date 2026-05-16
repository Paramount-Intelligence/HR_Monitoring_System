# 25 Changelog

All significant changes to the **Workforce Intelligence & Execution OS** will be documented in this file.

## [v2.0.0-beta.2] - 2026-05-14
### Added
*   Comprehensive documentation overhaul (Files 00-25).
*   AI Agent Implementation Guide for standardized development.
*   UAT Test Script for production readiness validation.

### Fixed
*   **Leave Request Atomicity**: Implemented atomic transaction pattern (`flush`/`commit`) in `LeaveService` to prevent orphaned records and resolve "Network Errors".
*   **UUID Visibility**: Replaced raw database IDs with human-readable labels (User Names, Project Titles) in dropdowns, tables, and time logs.
*   **Overlap Validation**: Refactored leave overlap logic to correctly handle 409 Conflict states and provide specific error feedback.
*   **Sidebar Navigation**: Dynamic role-based navigation with correct badge colors and permission gates.

## [v2.0.0-beta.1] - 2026-05-01
### Added
*   Production target: Railway with PostgreSQL.
*   Alembic migration support for production schema.
*   Idempotent Admin Bootstrapper for system initialization.
*   Core Attendance & Break tracking logic.
*   Project & Task lifecycle management.

### Changed
*   Restructured monorepo into `apps/web` and `apps/api`.
*   Moved from local session storage to JWT-based authentication with refresh tokens.

## [v1.0.0] - Pre-Release
*   Initial MVP with basic attendance and user management.
