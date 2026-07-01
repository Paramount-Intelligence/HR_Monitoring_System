import type { ElementType } from 'react';
import {
  LayoutDashboard,
  Clock,
  Briefcase,
  CheckSquare,
  ClipboardCheck,
  Users,
  Activity,
  ShieldCheck,
  BarChart3,
  Calendar,
  Award,
  Building,
  Palmtree,
  FileText,
  Settings,
  HelpCircle,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { isOrganizationNavActive } from '@/lib/navigation/organization-nav';

export interface SidebarNavItem {
  title: string;
  href: string;
  icon: ElementType;
  permission?: string;
}

/** Sidebar titles removed from navigation (routes may still exist). */
export const REMOVED_SIDEBAR_TITLES = [
  'Permissions',
  'Alerts',
  'Holidays',
  'Announcements',
] as const;

export function getSidebarNavItems(role: string): SidebarNavItem[] {
  let baseLinks: SidebarNavItem[] = [];

  switch (role) {
    case 'employee':
    case 'intern':
    case 'junior_employee':
      baseLinks = [
        { title: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
        { title: 'Attendance', href: '/employee/attendance', icon: Clock },
        { title: 'Projects', href: '/employee/projects', icon: Briefcase, permission: 'projects.create' },
        { title: 'Tasks', href: '/employee/tasks', icon: CheckSquare },
        { title: 'Time Logs', href: '/employee/time-logs', icon: Activity },
        { title: 'My EOD', href: '/employee/eod', icon: ShieldCheck },
        { title: 'Leaves', href: '/employee/leaves', icon: Palmtree },
        { title: 'My Growth', href: '/employee/growth', icon: Award },
      ];
      break;
    case 'team_lead':
      baseLinks = [
        { title: 'Dashboard', href: '/team-lead/dashboard', icon: LayoutDashboard },
        { title: 'My Attendance', href: '/employee/attendance', icon: Clock },
        { title: 'My Tasks', href: '/employee/tasks', icon: CheckSquare },
        { title: 'Team Tasks', href: '/manager/tasks', icon: CheckSquare, permission: 'tasks.view_team' },
        { title: 'My EOD', href: '/employee/eod', icon: ShieldCheck },
        { title: 'Leaves', href: '/employee/leaves', icon: Palmtree },
        { title: 'My Growth', href: '/employee/growth', icon: Award },
      ];
      break;
    case 'manager':
      baseLinks = [
        { title: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
        { title: 'Team Members', href: '/manager/team', icon: Users },
        { title: 'Projects', href: '/manager/projects', icon: Briefcase },
        { title: 'Tasks', href: '/manager/tasks', icon: CheckSquare },
        { title: 'Reports', href: '/manager/reports', icon: BarChart3 },
        { title: 'Settings', href: '/profile', icon: Settings },
        { title: 'My Attendance', href: '/manager/my-attendance', icon: Clock },
        { title: 'My Tasks', href: '/manager/my-tasks', icon: CheckSquare },
        { title: 'Approvals', href: '/manager/approvals', icon: ClipboardCheck },
        { title: 'Attendance Exceptions', href: '/manager/attendance-exceptions', icon: AlertTriangle },
        { title: 'My EOD', href: '/manager/eod', icon: ShieldCheck },
        { title: 'EOD Reviews', href: '/manager/eod-reviews', icon: Activity },
      ];
      break;
    case 'hr_operations':
      baseLinks = [
        { title: 'HR Dashboard', href: '/hr/dashboard', icon: LayoutDashboard },
        { title: 'All Users', href: '/admin/users', icon: Users },
        { title: 'Attendance & Leaves', href: '/manager/approvals', icon: Clock },
        { title: 'Attendance Exceptions', href: '/hr/attendance-exceptions', icon: AlertTriangle },
        { title: 'Approvals', href: '/hr/approvals', icon: ClipboardCheck },
        { title: 'Organization', href: '/admin/organization', icon: Building },
        { title: 'Reports', href: '/admin/reports', icon: FileText },
      ];
      break;
    case 'admin':
      baseLinks = [
        { title: 'Org Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { title: 'Users & Teams', href: '/admin/users', icon: Users },
        { title: 'All Projects', href: '/admin/projects', icon: Briefcase },
        { title: 'Tasks', href: '/admin/tasks', icon: CheckSquare },
        { title: 'Organization', href: '/admin/organization', icon: Building },
        { title: 'EOD Reviews', href: '/admin/eod-reviews', icon: Activity },
        { title: 'Approvals', href: '/admin/approvals', icon: ClipboardCheck },
        { title: 'Attendance Exceptions', href: '/admin/attendance-exceptions', icon: AlertTriangle },
        { title: 'Reports', href: '/admin/reports', icon: FileText },
        { title: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldCheck },
        { title: 'Call Recordings', href: '/admin/call-recordings', icon: Activity, permission: 'call_recordings.view' },
      ];
      break;
    default:
      break;
  }

  return [
    ...baseLinks,
    { title: 'Messages', href: '/messages', icon: MessageSquare },
    { title: 'Calendar', href: '/calendar', icon: Calendar },
    { title: 'Help & Support', href: '/help-support', icon: HelpCircle },
  ];
}

export function isSidebarNavItemActive(
  pathname: string | null | undefined,
  item: SidebarNavItem
): boolean {
  if (!pathname) return false;
  if (item.href === '/admin/organization') {
    return isOrganizationNavActive(pathname);
  }
  return pathname.startsWith(item.href);
}
