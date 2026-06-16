import { LoadingSkeletonList } from '../ui/LoadingSkeleton';
import type { DashboardRole } from '../../auth/role-utils';
import { AdminDashboard } from './AdminDashboard';
import { HRDashboard } from './HRDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { TeamLeadDashboard } from './TeamLeadDashboard';
import { EmployeeDashboard } from './EmployeeDashboard';
import { InternDashboard } from './InternDashboard';

export interface DashboardRouterProps {
  role: DashboardRole;
  roleLabel: string;
  unreadMessages: number;
  unreadAlerts: number;
}

export function DashboardRouter({
  role,
  roleLabel,
  unreadMessages,
  unreadAlerts,
}: DashboardRouterProps) {
  const common = { unreadMessages, unreadAlerts };

  switch (role) {
    case 'admin':
      return <AdminDashboard {...common} />;
    case 'hr_operations':
      return <HRDashboard {...common} />;
    case 'manager':
      return <ManagerDashboard {...common} />;
    case 'team_lead':
      return <TeamLeadDashboard {...common} />;
    case 'intern':
      return <InternDashboard {...common} roleLabel={roleLabel} />;
    case 'employee':
    default:
      return <EmployeeDashboard {...common} roleLabel={roleLabel} />;
  }
}

export function DashboardBodySkeleton() {
  return <LoadingSkeletonList count={4} />;
}
