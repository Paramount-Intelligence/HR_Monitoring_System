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
  LogOut,
  Calendar,
  Award,
  TrendingUp,
  Building,
  Megaphone,
  Palmtree,
  Shield,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const role = user?.role || 'employee';

  const ROLE_CONFIG: Record<string, { label: string, color: string }> = {
    admin: { label: 'Admin', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
    hr_operations: { label: 'HR & Ops', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    manager: { label: 'Manager', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    team_lead: { label: 'Team Lead', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    employee: { label: 'Employee', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    intern: { label: 'Intern', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    junior_employee: { label: 'Junior', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  };

  const getNavLinks = (): NavItem[] => {
    switch (role) {
      case 'employee':
      case 'intern':
      case 'junior_employee':
        return [
          { title: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
          { title: 'Attendance', href: '/employee/attendance', icon: Clock },
          { title: 'Projects', href: '/employee/projects', icon: Briefcase, permission: 'projects.create' },
          { title: 'Tasks', href: '/employee/tasks', icon: CheckSquare },
          { title: 'Time Logs', href: '/employee/time-logs', icon: Activity },
          { title: 'My EOD', href: '/employee/eod', icon: ShieldCheck },
          { title: 'Leaves', href: '/employee/leaves', icon: Palmtree },
          { title: 'My Growth', href: '/employee/growth', icon: Award },
        ];
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
          { title: 'Command Center', href: '/manager/dashboard', icon: LayoutDashboard },
          { title: 'Team Roster', href: '/manager/team', icon: Users },
          { title: 'Project Pipeline', href: '/manager/projects', icon: Briefcase },
          { title: 'Task Queue', href: '/manager/tasks', icon: CheckSquare },
          { title: 'Operational Approvals', href: '/manager/approvals', icon: ClipboardCheck },
          { title: 'EOD Reviews', href: '/manager/eod-reviews', icon: Activity },
          { title: 'Intelligence & Analytics', href: '/manager/analytics', icon: TrendingUp },
          { title: 'System Alerts', href: '/admin/alerts', icon: Bell },
          { title: 'My Attendance', href: '/manager/my-attendance', icon: Clock },
          { title: 'My Tasks', href: '/manager/my-tasks', icon: CheckSquare },
        ];
      case 'hr_operations':
        return [
          { title: 'HR Dashboard', href: '/hr/dashboard', icon: LayoutDashboard },
          { title: 'All Users', href: '/admin/users', icon: Users },
          { title: 'Attendance & Leaves', href: '/manager/approvals', icon: Clock },
          { title: 'Organization', href: '/admin/organization', icon: Building },
          { title: 'Holidays', href: '/admin/holidays', icon: Calendar },
          { title: 'Announcements', href: '/admin/announcements', icon: Megaphone },
          { title: 'Reports', href: '/admin/reports', icon: FileText },
          { title: 'Alerts', href: '/admin/alerts', icon: Bell },
        ];
      case 'admin':
        return [
          { title: 'Org Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { title: 'Users & Teams', href: '/admin/users', icon: Users },
          { title: 'All Projects', href: '/admin/projects', icon: Briefcase },
          { title: 'Organization', href: '/admin/organization', icon: Building },
          { title: 'Holidays', href: '/admin/holidays', icon: Calendar },
          { title: 'Announcements', href: '/admin/announcements', icon: Megaphone },
          { title: 'Permissions', href: '/admin/permissions', icon: Shield },
          { title: 'Reports', href: '/admin/reports', icon: FileText },
          { title: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldCheck },
          { title: 'Alerts', href: '/admin/alerts', icon: Bell },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks().filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.employee;

  const SidebarContent = ({ collapsed = false }) => (
    <div className="flex h-full flex-col bg-[#0f172a] text-slate-400">
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-between px-6 bg-[#0f172a] border-b border-slate-800/40">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white shadow-[0_0_15px_rgba(255,255,255,0.1)] ring-1 ring-slate-700 overflow-hidden shrink-0">
            <img src="/logo.png" alt="Paramount" className="h-full w-full object-contain p-1" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-white">Paramount</span>
          )}
        </Link>
        {!collapsed && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden md:flex text-slate-500 hover:text-white hover:bg-slate-800/50 h-8 w-8"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
        <nav className="space-y-1.5">
          {navLinks.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative",
                  isActive 
                    ? "bg-slate-800/50 text-white shadow-sm ring-1 ring-slate-700/50" 
                    : "text-slate-400 hover:bg-slate-800/30 hover:text-slate-200"
                )}
                title={collapsed ? item.title : undefined}
              >
                <Icon className={cn(
                  "h-5 w-5 shrink-0 transition-colors", 
                  isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                )} />
                {!collapsed && <span>{item.title}</span>}
                {isActive && (
                  <>
                    {!collapsed && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                    )}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.4)]" />
                  </>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* Footer / User Area */}
      <div className="mt-auto border-t border-slate-800/40 bg-slate-900/40 p-4">
        {!collapsed ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/30 ring-1 ring-slate-700/30">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white ring-2 ring-[#0f172a] shadow-lg shrink-0">
                {user?.full_name?.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate leading-none mb-1">
                  {user?.full_name}
                </span>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border w-fit leading-none",
                  roleConfig.color
                )}>
                  {roleConfig.label}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setShowLogoutDialog(true)}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 w-full border border-slate-800/50 hover:border-rose-500/20 group"
            >
              <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              LOGOUT SESSION
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 pb-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-slate-500 hover:text-white hover:bg-slate-800/50"
              onClick={() => setIsCollapsed(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <button 
              onClick={() => setShowLogoutDialog(true)}
              className="p-2 text-slate-500 hover:text-rose-400 transition-all hover:bg-rose-500/10 rounded-lg"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        title="End Session?"
        description="Your active progress is saved. You can resume your workflow anytime."
        confirmLabel="Logout"
        confirmVariant="destructive"
        onConfirm={async () => {
          setIsLoggingOut(true);
          await logout(true);
          setIsLoggingOut(false);
        }}
        isLoading={isLoggingOut}
      />
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="left" className="p-0 w-72 border-none">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen transition-all duration-300 ease-in-out border-r border-slate-800/40 bg-[#0f172a]",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent collapsed={isCollapsed} />
      </aside>
    </>
  );
}
