# 14 Reporting and Analytics

The Analytics module transforms raw activity data into actionable insights through various dashboard views and automated reports.

## 1. Dashboard Views

### Admin Dashboard
*   **KPIs**: Total active employees, average productive hours, open critical alerts, and department-wide output scores.
*   **Charts**: Trend line for productive hours across the organization, manager-level output comparison, and WFH vs. Office distribution.
*   **Risk Visibility**: Lists top performers and employees with persistent low utilization or overdue tasks.

### Manager Dashboard
*   **KPIs**: Team check-in status (checked-in vs. total), pending project/leave approvals, and count of overdue/blocked tasks.
*   **Charts**: Individual team member workload distribution and task completion trends.
*   **Activity Logs**: Real-time feed of team activity (check-ins, timer starts).

### Employee Dashboard
*   **KPIs**: Current day check-in/out status, total time worked today, and productive time (timer-based).
*   **Trends**: Weekly trend of productive minutes and task completion status.
*   **Growth**: Current progress towards goals and summary of complexity-adjusted output.

## 2. Data Sources & Aggregation
*   **DailyStats**: A summary table updated asynchronously that aggregates minutes, tasks, and breaks for each user per day.
*   **Attendance Sessions**: Primary source for raw presence data.
*   **Time Logs**: Primary source for "Productive Time" calculations.
*   **Performance Metrics**: A dedicated engine calculates scores (Utilization, Consistency, Output) based on weighted combinations of the above.

## 3. Leave & Correction Impact
*   **Leaves/WFH**: Reports correctly adjust "Expected Hours" based on approved leaves. A user on approved leave is not marked as under-utilized.
*   **Corrections**: When an attendance correction is approved, the corresponding `DailyStats` and performance scores are automatically recalculated.

## 4. UI Patterns for Analytics
*   **Charts**: Powered by **Recharts**.
*   **Empty States**: All chart and table widgets must include helpful empty states (e.g., "No activity recorded for this period").
*   **Skeletons**: Used during data fetching to prevent layout shift.
*   **Drill-down**: Clicking a KPI or chart segment should ideally navigate to a filtered detail view (Implementation ongoing).

## 5. Known Data Limitations
*   **Real-time Lag**: Aggregated stats (like `DailyStats`) may have a slight lag (up to 5 mins) as they are processed by the worker.
*   **Manual Entry Bias**: Performance scoring distinguishes between `timer` logs and `manual` logs to discourage unverified time entries.
*   **Incomplete Sessions**: Metrics for the current day are "Estimated" until the session is closed and classification is finalized.

## 6. Future Enhancements
*   **AI Summarization**: Natural language summaries of team performance (e.g., "Team Alpha was 15% more productive this week due to project X completion").
*   **Export to PDF/CSV**: Planned feature for HR and Admin reporting.
