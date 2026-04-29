'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { 
  LayoutDashboard, 
  Clock, 
  Briefcase, 
  CheckSquare, 
  ClipboardCheck, 
  Users, 
  Activity, 
  Bell, 
  ShieldCheck, 
  BarChart3,
  X,
  Network,
  LogOut,
  Calendar,
  Award,
  TrendingUp,
  Building,
  Megaphone,
  Palmtree,
  UserCog,
  FileText,
  Shield,
} from 'lucide-react';
import { Button } from '../ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  permission?: string; // optional permission gate
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const role = user?.role || 'employee';

  const ROLE_BADGE_COLORS: Record<string, string> = {
    admin: 'bg-violet-100 text-violet-700',
    hr_operations: 'bg-rose-100 text-rose-700',
    manager: 'bg-blue-100 text-blue-700',
    team_lead: 'bg-amber-100 text-amber-700',
    employee: 'bg-emerald-100 text-emerald-700',
    intern: 'bg-slate-100 text-slate-600',
    junior_employee: 'bg-slate-100 text-slate-600',
  };

  const ROLE_DISPLAY: Record<string, string> = {
    admin: 'Admin',
    hr_operations: 'HR & Operations',
    manager: 'Manager',
    team_lead: 'Team Lead',
    employee: 'Employee',
    intern: 'Intern',
    junior_employee: 'Junior Employee',
  };

  const basicEmployeeNav: NavItem[] = [
    { title: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
    { title: 'Attendance', href: '/employee/attendance', icon: Clock },
    { title: 'Projects', href: '/employee/projects', icon: Briefcase, permission: 'projects.create' },
    { title: 'Tasks', href: '/employee/tasks', icon: CheckSquare },
    { title: 'Time Logs', href: '/employee/time-logs', icon: Activity },
    { title: 'My EOD', href: '/employee/eod', icon: ShieldCheck },
    { title: 'Leaves', href: '/employee/leaves', icon: Palmtree },
    { title: 'My Growth', href: '/employee/growth', icon: Award },
  ];

  const getNavLinks = (): NavItem[] => {
    switch (role) {
      case 'employee':
      case 'intern':
      case 'junior_employee':
        return basicEmployeeNav;
      case 'team_lead':
        return [
          { title: 'Dashboard', href: '/team-lead/dashboard', icon: LayoutDashboard },
          { title: 'My Attendance', href: '/employee/attendance', icon: Clock },
          { title: 'My Tasks', href: '/employee/tasks', icon: CheckSquare },
          { title: 'Team Tasks', href: '/manager/tasks', icon: CheckSquare, permission: 'tasks.view_team' },
          { title: 'My EOD', href: '/employee/eod', icon: ShieldCheck },
          { title: 'Leaves', href: '/employee/leaves', icon: Palmtree },
          { title: 'My Growth', href: '/employee/growth', icon: Award },
        ];
      case 'manager':
        return [
          { title: 'Team Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
          { title: 'My Attendance', href: '/manager/my-attendance', icon: Clock },
          { title: 'My Tasks', href: '/manager/my-tasks', icon: CheckSquare },
          { title: 'Team Projects', href: '/manager/projects', icon: Briefcase },
          { title: 'EOD Reviews', href: '/manager/eod-reviews', icon: ClipboardCheck },
          { title: 'Team Approvals', href: '/manager/approvals', icon: ClipboardCheck },
          { title: 'Leaves', href: '/manager/leaves', icon: Palmtree },
          { title: 'Team Growth', href: '/manager/growth', icon: Award },
          { title: 'Team Members', href: '/manager/team', icon: Users },
          { title: 'Team Tasks', href: '/manager/tasks', icon: CheckSquare },
          { title: 'Analytics', href: '/manager/analytics', icon: TrendingUp },
          { title: 'Alerts', href: '/manager/alerts', icon: Bell },
        ];
      case 'hr_operations':
        return [
          { title: 'HR Dashboard', href: '/hr/dashboard', icon: LayoutDashboard },
          { title: 'All Users', href: '/admin/users', icon: Users },
          { title: 'Attendance', href: '/manager/approvals', icon: Clock },
          { title: 'Leave Management', href: '/hr/leaves', icon: Palmtree },
          { title: 'Organization', href: '/admin/organization', icon: Building },
          { title: 'Holidays', href: '/admin/holidays', icon: Calendar },
          { title: 'Announcements', href: '/admin/announcements', icon: Megaphone },
          { title: 'Reports', href: '/hr/reports', icon: FileText },
          { title: 'Alerts', href: '/manager/alerts', icon: Bell },
        ];
      case 'admin':
      default:
        return [
          { title: 'Org Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { title: 'Users & Teams', href: '/admin/users', icon: Users },
          { title: 'All Projects', href: '/admin/projects', icon: Briefcase },
          { title: 'Organization', href: '/admin/organization', icon: Building },
          { title: 'Holidays', href: '/admin/holidays', icon: Calendar },
          { title: 'Announcements', href: '/admin/announcements', icon: Megaphone },
          { title: 'Permissions', href: '/admin/permissions', icon: Shield },
          { title: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldCheck },
          { title: 'Alerts', href: '/admin/alerts', icon: Bell },
        ];
    }
  };

  const navLinks = getNavLinks().filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  const roleBadgeClass = ROLE_BADGE_COLORS[role] || 'bg-slate-100 text-slate-600';
  const roleLabel = ROLE_DISPLAY[role] || role;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-900 text-slate-100 transition-transform duration-200 ease-in-out md:relative md:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-6 bg-slate-950">
          <Link href={`/${role === 'admin' ? 'admin' : role === 'manager' ? 'manager' : role === 'hr_operations' ? 'hr' : role === 'team_lead' ? 'team-lead' : 'employee'}/dashboard`} className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg overflow-hidden shrink-0 bg-white shadow-sm border border-slate-200">
              <img src="/logo.png" alt="Paramount Logo" className="h-full w-full object-contain p-1" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Paramount</span>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden text-slate-400 hover:text-white" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Role Badge */}
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Signed in as</p>
              <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'User'}</p>
            </div>
            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full", roleBadgeClass)}>
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <nav className="space-y-1">
            {navLinks.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-blue-600 text-white shadow-sm" 
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400")} />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* Footer / Logout */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800/50 flex flex-col gap-4">
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 transition-colors w-full"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
          <div className="text-xs text-slate-600 flex flex-col gap-1 px-1">
            <span className="font-semibold text-slate-500">Paramount Intelligence</span>
            <span>Workforce OS v2.0</span>
          </div>
        </div>
      </aside>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Any unsaved changes may be lost. You will need to log in again to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => logout(true)}
              className="bg-red-600 hover:bg-red-700 text-white border-none"
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
