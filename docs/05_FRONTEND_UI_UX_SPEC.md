# Frontend UI and UX Specification

## 1. UX philosophy
The UI should feel:
- modern
- calm
- clean
- highly legible
- slightly premium
- fast to use

This is an internal productivity system. It must look trustworthy, not noisy or playful.

## 2. Design direction
- spacious layout
- strong typography hierarchy
- rounded cards
- soft shadows
- restrained color palette
- clear status chips
- dense data without feeling crowded
- mobile responsive but desktop first

## 3. Global design system guidance

### Layout
- max content width per dashboard section
- sticky page header where useful
- left navigation for desktop
- collapsible sidebar
- top utility bar for profile, filters, notifications

### Spacing
- use consistent 4/8 based spacing system
- avoid cramped tables
- allow generous padding in cards and drawers

### Components
Required components:
- KPI cards
- tables with filters
- side drawers
- tabs
- status badges
- alert banners
- progress bars
- timer controls
- approvals list
- timeline entries
- empty states
- confirmation modals

### Typography
- clear distinction between page titles, section headings, table labels, helper text
- avoid tiny body text
- emphasize critical metrics with larger numeric typography

### Color
Use a professional palette:
- deep neutral or slate base
- one primary accent
- semantic states: success, warning, danger, info
- charts should use consistent series colors
- keep contrast high for accessibility

### Icons
Use a clean outline icon set.

## 4. Navigation structure

### Employee
- Overview
- Attendance
- Projects
- Tasks
- Time Logs
- My Performance

### Manager
- Team Overview
- Approvals
- Team Tasks
- Projects
- Workload
- Alerts
- Team Performance

### Admin
- Org Overview
- Users
- Teams
- Projects
- Analytics
- Alerts
- Audit Logs
- Settings

## 5. Screen level UX requirements

### Login page
- clean centered card
- company branding
- helpful validation states
- forgot password link

### Employee overview
Must show:
- current day check in and check out state
- current active timer card
- today summary
- tasks in progress
- tasks due soon
- weekly trend chart

### Manager overview
Must show:
- KPI cards at top
- pending approvals
- overdue tasks
- blocked tasks
- workload distribution chart
- low activity or anomaly cards

### Admin overview
Must show:
- company KPI cards
- department and manager comparison
- org trend charts
- open alerts
- top performers and risk flags
- WFH vs office comparison

## 6. Dashboard principles
- put top actions and urgent exceptions above fold
- charts should answer a specific question
- each table should have filters and sensible defaults
- avoid overwhelming users with too many chart types on one page
- use drawers or modals for detail instead of excessive page hopping

## 7. Chart guidance
Use charts intentionally:
- line chart for trends over time
- bar chart for manager or team comparisons
- stacked bar for work mode distribution
- donut only for very small category counts
- heatmap later for attendance consistency

Do not:
- place too many colors in one chart
- use 3D effects
- use unlabeled ambiguous charts

## 8. Table guidance
Tables should support:
- search
- sort
- filter
- pagination
- row click to detail drawer
- status chip rendering
- date formatting
- export later

## 9. Forms
- use clear labels and helper text
- inline validation
- grouped fields
- save / cancel always visible
- auto focus sensible first field
- prevent confusing long forms where possible

## 10. Employee trust requirements
Because the system can feel sensitive, the UX should explicitly communicate:
- why data is being collected
- how scores are derived at a high level
- what the employee can control
- correction options for mistakes

## 11. Accessibility
- keyboard navigable
- semantic form labels
- accessible color contrast
- visible focus states
- screen reader friendly table labels where feasible

## 12. Suggested component stack
- Tailwind CSS
- shadcn/ui or equivalent
- Recharts
- React Hook Form
- Zod validation
- TanStack Table

## 13. Definition of polished
A screen is polished when:
- visual hierarchy is obvious in 3 seconds
- major actions are easy to find
- spacing feels deliberate
- tables and charts look consistent
- empty states are useful
- loading states are graceful
- success and error states are clear
