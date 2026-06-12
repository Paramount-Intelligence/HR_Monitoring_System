import { EmployeeDashboard } from './EmployeeDashboard';

interface InternDashboardProps {
  unreadMessages: number;
  unreadAlerts: number;
  roleLabel?: string;
}

export function InternDashboard({
  unreadMessages,
  unreadAlerts,
  roleLabel = 'Intern',
}: InternDashboardProps) {
  return (
    <EmployeeDashboard
      unreadMessages={unreadMessages}
      unreadAlerts={unreadAlerts}
      roleLabel={roleLabel}
    />
  );
}
