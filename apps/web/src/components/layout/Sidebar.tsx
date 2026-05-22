'use client';

import { useState, useEffect } from 'react';
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
  Settings,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { messagesApi } from '@/lib/api/messages';
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

  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    if (user) {
      const fetchCount = async () => {
        try {
          const res = await messagesApi.getUnreadMessageCount();
          setUnreadMsgCount(res.unread_conversations);
        } catch (err) {
          console.warn('[Sidebar] Failed to load message unread count:', err);
        }
      };
      fetchCount();
      const interval = setInterval(fetchCount, 30000); // poll every 30s

      const handleUpdate = () => {
        fetchCount();
      };
      window.addEventListener('pims-messages-unread-update', handleUpdate);

      return () => {
        clearInterval(interval);
        window.removeEventListener('pims-messages-unread-update', handleUpdate);
      };
    }
  }, [user]);

  const ROLE_CONFIG: Record<string, { label: string, color: string }> = {
    admin: { label: 'Admin', color: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]' },
    hr_operations: { label: 'HR & Ops', color: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]' },
    manager: { label: 'Manager', color: 'bg-[var(--bg-subtle)] text-[var(--accent-primary)] border-[var(--border-strong)]/30' },
    team_lead: { label: 'Team Lead', color: 'bg-[var(--bg-subtle)] text-[var(--accent-primary)] border-[var(--border-strong)]/20' },
    employee: { label: 'Employee', color: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]' },
    intern: { label: 'Intern', color: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]' },
    junior_employee: { label: 'Junior', color: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]' },
  };

  const getNavLinks = (): NavItem[] => {
    let baseLinks: NavItem[] = [];
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
          { title: 'EOD Reviews', href: '/manager/eod-reviews', icon: Activity },
        ];
        break;
      case 'hr_operations':
        baseLinks = [
          { title: 'HR Dashboard', href: '/hr/dashboard', icon: LayoutDashboard },
          { title: 'All Users', href: '/admin/users', icon: Users },
          { title: 'Attendance & Leaves', href: '/manager/approvals', icon: Clock },
          { title: 'Organization', href: '/admin/organization', icon: Building },
          { title: 'Holidays', href: '/admin/holidays', icon: Calendar },
          { title: 'Announcements', href: '/admin/announcements', icon: Megaphone },
          { title: 'Reports', href: '/admin/reports', icon: FileText },
          { title: 'Alerts', href: '/admin/alerts', icon: Bell },
        ];
        break;
      case 'admin':
        baseLinks = [
          { title: 'Org Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { title: 'Users & Teams', href: '/admin/users', icon: Users },
          { title: 'All Projects', href: '/admin/projects', icon: Briefcase },
          { title: 'Tasks', href: '/admin/tasks', icon: CheckSquare },
          { title: 'Organization', href: '/admin/organization', icon: Building },
          { title: 'Holidays', href: '/admin/holidays', icon: Calendar },
          { title: 'Announcements', href: '/admin/announcements', icon: Megaphone },
          { title: 'Permissions', href: '/admin/permissions', icon: Shield },
          { title: 'Reports', href: '/admin/reports', icon: FileText },
          { title: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldCheck },
          { title: 'Alerts', href: '/admin/alerts', icon: Bell },
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
  };

  const navLinks = getNavLinks().filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.employee;

  const SidebarContent = ({ collapsed = false, onLinkClick }: { collapsed?: boolean; onLinkClick?: () => void }) => (
    <div className="flex h-full flex-col bg-[var(--bg-sidebar)] text-[var(--text-sidebar)] transition-all duration-300">
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-between px-4 bg-[var(--bg-sidebar)] border-b border-[var(--border-subtle)] transition-all duration-300">
        <Link href="/" onClick={onLinkClick} className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-[var(--bg-soft)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--border-subtle)] overflow-hidden shrink-0">
            <img src="/logo.png" alt="Paramount Logo" className="h-full w-full object-contain p-1" />
          </div>
          {!collapsed && (
            <span className="text-base font-extrabold tracking-tight text-[var(--text-sidebar)]">PIMS</span>
          )}
        </Link>
        {!collapsed && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden md:flex text-[var(--text-sidebar-muted)] hover:text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-hover)] h-8 w-8 rounded-lg transition-colors"
            onClick={() => setIsCollapsed(true)}
            aria-label="Collapse Sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
        <nav className="space-y-1">
          {navLinks.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 group relative",
                  isActive 
                    ? "bg-[var(--bg-sidebar-active)] text-[var(--text-sidebar)] shadow-[var(--shadow-soft)] border border-[var(--border-subtle)]" 
                    : "text-[var(--text-sidebar-muted)] hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--text-sidebar)]"
                )}
                title={collapsed ? item.title : undefined}
              >
                <Icon className={cn(
                  "h-5 w-5 shrink-0 transition-colors", 
                  isActive ? "text-[var(--text-sidebar)]" : "text-[var(--text-sidebar-muted)] group-hover:text-[var(--text-sidebar)]"
                )} />
                {!collapsed && <span>{item.title}</span>}
                {item.title === 'Messages' && unreadMsgCount > 0 && (
                  <span className="ml-auto h-5 min-w-[20px] px-1.5 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] text-[10px] font-black flex items-center justify-center border border-[var(--status-danger-border)]">
                    {unreadMsgCount}
                  </span>
                )}
                {isActive && (
                  <>
                    {!collapsed && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_rgba(30,102,193,0.5)]" />
                    )}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[var(--accent-primary)] rounded-r-full" />
                  </>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* Footer / User Area */}
      <div className="mt-auto border-t border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4 transition-all duration-300">
        {!collapsed ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-soft)] border border-[var(--border-subtle)] shadow-[var(--shadow-soft)]">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--text-secondary)] flex items-center justify-center text-xs font-black text-white ring-2 ring-[var(--bg-sidebar)] shadow-lg shrink-0">
                {user?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-[var(--text-sidebar)] truncate leading-none mb-1.5">
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
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-sidebar-muted)] hover:bg-[var(--status-danger-bg)]/40 hover:text-[var(--status-danger-text)] transition-all duration-200 w-full border border-[var(--border-subtle)] hover:border-[var(--status-danger-border)] group bg-[var(--bg-soft)] shadow-[var(--shadow-soft)]"
            >
              <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 shrink-0 text-[var(--text-sidebar-muted)] group-hover:text-[var(--status-danger-text)]" />
              LOGOUT SESSION
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 pb-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-[var(--text-sidebar-muted)] hover:text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-hover)]"
              onClick={() => setIsCollapsed(false)}
              aria-label="Expand Sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <button 
              onClick={() => setShowLogoutDialog(true)}
              className="p-2 text-[var(--text-sidebar-muted)] hover:text-[var(--status-danger-text)] transition-all hover:bg-[var(--status-danger-bg)]/30 rounded-lg"
              aria-label="Logout Session"
              title="Logout"
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
          <SidebarContent onLinkClick={onClose} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen transition-all duration-300 ease-in-out border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)]",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent collapsed={isCollapsed} />
      </aside>
    </>
  );
}
