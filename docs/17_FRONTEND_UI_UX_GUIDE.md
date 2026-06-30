# 17 Frontend UI/UX Guide

The Workforce Intelligence & Execution OS features a premium, professional, and calm design language tailored for a productivity-focused enterprise environment.

## 1. Design Language
*   **Branding**: Paramount Intelligence branding with a clean, deep neutral/slate palette.
*   **Typography**: Uses the **Google Sans -> Roboto -> Arial -> sans-serif** font stack for maximum legibility. High contrast for primary text, muted slate for helper text.
*   **Surfaces**: Soft-shadowed rounded cards (`rounded-xl`) and subtle glassmorphism effects for modals and drawers.
*   **Color Palette**:
    *   **Primary**: Deep Blue / Indigo for actions.
    *   **Success**: Emerald Green for approved/completed states.
    *   **Warning**: Amber for pending/clarification states.
    *   **Danger**: Rose/Red for rejected/blocked/late states.

## 2. Layout Patterns
*   **Sidebar**: Collapsible left navigation with role-specific links and clear active states.
*   **Header**: Sticky top bar with breadcrumbs, current page title, and a simplified profile dropdown.
*   **Dashboard Cards**: Metric-first KPI cards at the top, followed by interactive charts and detailed tables.
*   **Empty States**: Every chart and list widget must have a curated empty state (e.g., "No pending approvals") to avoid broken-looking layouts.

## 3. Component Standards

### Tables
*   **Readability**: Generous padding, no vertical borders, hover states for rows.
*   **Features**: Integrated search, status-based filtering, and sorting.
*   **Responsiveness**: Horizontal scrolling for dense data; prioritized columns for mobile.

### Modals & Drawers
*   **Drawers**: Used for detail views (e.g., Task details, Project summary) to keep the user in context.
*   **Modals**: Used for focused actions (e.g., Check-in confirmation, Leave submission).
*   **Rules**: Z-index management ensures modals always overlap the sidebar on mobile.

### Forms
*   **Validation**: Real-time inline validation using Zod. Action buttons (Save/Submit) should disable if the form is invalid.
*   **Feedback**: Success/Error toasts using **Sonner** after submission.

## 4. Usability Rules
*   **No Raw IDs**: This is a critical rule. UUIDs must never be shown to users. Use Project Titles, Employee Names, and Department Names.
*   **PKT Date Formatting**: All dates must be formatted using system helpers to ensure they match the **Asia/Karachi** offset.
*   **Button Hierarchy**: Clear distinction between Primary (Solid), Secondary (Outline), and Ghost buttons. Destructive actions (Logout, Reject) should use Rose/Red accents.
*   **Loading States**: Use skeleton loaders (`Skeleton` component) that match the layout of the final content to minimize layout shift.

## 5. Mobile Considerations
*   **Tap Targets**: Ensure buttons and links meet minimum size requirements for touch.
*   **Navigation**: Mobile sidebar is controlled via a hamburger menu in the header.
*   **Condensed Data**: Hide non-critical table columns on small screens.

## 6. Known UX Polish Items
*   **Dropdown Clipping**: Ensure Z-index on dropdown menus doesn't get clipped by parent containers with `overflow-hidden`.
*   **Button Readability**: Ensure white text on primary buttons meets WCAG accessibility standards.
*   **Timer Visibility**: The global task timer should be visible or accessible from every page once started.
