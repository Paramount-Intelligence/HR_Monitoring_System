# 04 Frontend Architecture

The frontend is a modern React application built with **Next.js**, leveraging the **App Router** for robust routing and server-side optimizations.

## Core Structure
The application code is located in `apps/web/src`.

```text
/src
  /app                  # Next.js App Router (Routes & Pages)
    /(auth)             # Login, Forgot Password, Reset
    /(dashboard)        # Protected Dashboard Routes
      /admin            # Admin-only views
      /hr               # HR/Operations views
      /manager          # Manager views
      /team-lead        # Team Lead views
      /employee         # Employee views
    /layout.tsx         # Root layout with providers
  /components           # Reusable UI components
    /ui                 # shadcn/ui base components
    /layout             # Sidebar, Header, PageShell
    /dashboard          # Feature-specific dashboard widgets
  /lib                  # Utilities and core logic
    /auth               # AuthContext and token handling
    /api                # API client (Axios/Fetch)
    /utils.ts           # Helper functions
  /hooks                # Custom React hooks
```

## Routing and Protection
*   **Route Groups**: Parentheses `()` are used to organize routes without affecting the URL structure.
*   **Role-Based Access**: Access is controlled via a combination of `AuthContext` and route-specific guards. 
*   **RoleGuard**: A higher-order component or layout wrapper that redirects users if they lack the required role for a page.
*   **Sidebar Navigation**: The sidebar dynamically renders links based on the user's role and permissions.

## State Management
*   **Authentication**: Managed via `AuthContext`. It handles user state, login/logout logic, and token refresh.
*   **Data Fetching**: Primarily uses `Axios` for API requests. (Consider adding React Query if complex caching is needed).
*   **Local State**: Standard React `useState` and `useReducer` for component-level UI state (modals, form inputs).

## Key UI Components
*   **Sidebar**: Persistent navigation with role-based badges and links.
*   **Header**: Displays page title, breadcrumbs, and user profile actions.
*   **KPI Cards**: Standardized metrics display with trends and icons.
*   **Data Tables**: Filterable and sortable tables for attendance, tasks, and users.
*   **Modals/Drawers**: Used for adding/editing entities without leaving the context.

## Design System
*   **Styling**: Vanilla **Tailwind CSS** for all styling.
*   **Components**: Built on top of **shadcn/ui** (Radix UI primitives).
*   **Icons**: **Lucide React**.
*   **Fonts**: **Inter** (via Next.js Font optimization).

## Important Patterns
1.  **Date Formatting**: All dates are formatted using local helpers to ensure consistent **PKT (Asia/Karachi)** display while handling UTC from the backend.
2.  **Form Validation**: Uses **React Hook Form** combined with **Zod** schemas for client-side validation.
3.  **Error Handling**: Centralized error mapping that transforms backend error codes into user-friendly toast notifications.
4.  **Loading States**: Skeleton screens are used for dashboard cards and tables to provide a smooth transition.
5.  **No Raw IDs**: Component logic should ensure that UUIDs are never displayed to the user; instead, labels from related entities are shown.

## Performance & Optimization
*   **Image Optimization**: Next.js `next/image`.
*   **Code Splitting**: Automatic per-page splitting via App Router.
*   **Dynamic Imports**: Used for heavy components like charts (Recharts) to improve initial load time.
