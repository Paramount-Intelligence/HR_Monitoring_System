import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { notificationsApi, Notification } from '@/lib/api/notifications';
import { Breadcrumbs } from './Breadcrumbs';
import { HeaderTimer } from './HeaderTimer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, 
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Menu, LogOut, User as UserIcon, Bell, Check, 
  MessageSquare, Calendar, ShieldCheck, MailOpen, AlertCircle, Settings 
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { messagesApi } from '@/lib/api/messages';
import { useRealtimeEvent, useRealtimeStatus } from '@/hooks/useRealtime';


interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Notifications states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [notifError, setNotifError] = useState<string | null>(null);
  const { isConnected } = useRealtimeStatus();

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res.count);
    } catch (err) {
      console.error('[Header] Failed to load unread count:', err);
    }
  };

  const fetchUnreadMsgCount = async () => {
    try {
      const res = await messagesApi.getUnreadMessageCount();
      setUnreadMsgCount(res.unread_conversations);
    } catch (err) {
      console.error('[Header] Failed to load message unread count:', err);
    }
  };

  const loadNotifications = async () => {
    try {
      setNotifLoading(true);
      setNotifError(null);
      const data = await notificationsApi.getNotifications(8);
      setNotifications(data);
    } catch (err) {
      console.error('[Header] Failed to load notifications:', err);
      setNotifError('Could not load notifications.');
    } finally {
      setNotifLoading(false);
    }
  };

  useRealtimeEvent(
    ['notification_created', 'notifications_count_updated', 'notification_read'],
    () => {
      fetchUnreadCount();
    }
  );

  useRealtimeEvent(['new_message', 'conversation_updated'], () => {
    fetchUnreadMsgCount();
  });

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      fetchUnreadMsgCount();
      const pollMs = isConnected ? 60000 : 30000;
      const interval = setInterval(() => {
        fetchUnreadCount();
        fetchUnreadMsgCount();
      }, pollMs);

      const handleUpdate = () => {
        fetchUnreadMsgCount();
      };
      window.addEventListener('pims-messages-unread-update', handleUpdate);

      return () => {
        clearInterval(interval);
        window.removeEventListener('pims-messages-unread-update', handleUpdate);
      };
    }
  }, [user, isConnected]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('[Header] Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    try {
      if (!n.is_read) {
        await notificationsApi.markRead(n.id);
        fetchUnreadCount();
      }
      
      // Dynamic navigation
      const route = n.route || (
        n.related_entity_type === 'meeting' ? '/calendar'
        : n.related_entity_type === 'support_ticket' ? '/help-support'
        : n.notification_type?.startsWith('meeting') ? '/calendar'
        : null
      );
      if (route) {
        router.push(route);
      }
    } catch (err) {
      console.error('[Header] Failed to process notification click:', err);
    }
  };

  const getIconForNotif = (type: string) => {
    switch (type) {
      case 'meeting_invite':
      case 'meeting_updated':
        return <Calendar className="h-4 w-4 text-[var(--accent-primary)]" />;
      case 'meeting_cancelled':
        return <AlertCircle className="h-4 w-4 text-[var(--status-danger-text)]" />;
      case 'support_ticket':
        return <MessageSquare className="h-4 w-4 text-[var(--status-warning-text)]" />;
      default:
        return <Bell className="h-4 w-4 text-[var(--text-secondary)]" />;
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout(true);
    setIsLoggingOut(false);
  };

  return (
    <>
      <header className="app-header backdrop-blur-xl px-3 sm:px-5 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar-hover)]" 
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
          
          <div className="hidden md:block">
            <Breadcrumbs />
          </div>

          <div className="flex items-center md:hidden gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg overflow-hidden shrink-0 bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-[var(--shadow-soft)]">
              <img src="/logo.png" alt="PIMS Logo" className="h-full w-full object-contain p-1" />
            </div>
            <span className="font-extrabold text-[var(--text-primary)] tracking-tight text-sm">PIMS</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <HeaderTimer />

          <div className="h-6 w-px bg-[var(--border-default)] hidden sm:block" />

          <ThemeToggle />

          <div className="h-6 w-px bg-[var(--border-default)] hidden sm:block" />

          {/* Message Indicator Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/messages')}
            className="relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar-hover)] h-9 w-9 rounded-xl transition-all focus:outline-none"
          >
            <MessageSquare className="h-5 w-5" />
            {unreadMsgCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] text-[10px] font-black border-2 border-[var(--bg-surface)] flex items-center justify-center">
                {unreadMsgCount}
              </span>
            )}
          </Button>

          <div className="h-6 w-px bg-[var(--border-default)] hidden sm:block" />

          {/* Notification Bell Dropdown */}
          <DropdownMenu onOpenChange={(open) => { if (open) loadNotifications(); }}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar-hover)] h-9 w-9 rounded-xl transition-all focus:outline-none"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] text-[10px] font-black border-2 border-[var(--bg-surface)] flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 mt-2 p-1.5 rounded-2xl shadow-[var(--shadow-card)] border border-[var(--border-default)] backdrop-blur-xl bg-[var(--bg-elevated)] text-[var(--text-primary)]" align="end">
              <DropdownMenuLabel className="p-3 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-black text-[var(--accent-primary)] hover:underline flex items-center gap-1 leading-none"
                  >
                    <MailOpen className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[var(--border-subtle)]" />
              
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1 py-1">
                {notifLoading ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)] font-semibold">
                    Syncing updates...
                  </div>
                ) : notifError ? (
                  <div className="py-8 text-center text-xs text-red-500 font-semibold">
                    {notifError}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)] italic font-semibold">
                    No active notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`focus:bg-[var(--bg-sidebar-hover)] m-1 rounded-xl cursor-pointer p-3 flex gap-3 text-left transition-colors duration-150 relative ${
                        n.is_read ? 'opacity-70' : 'border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5'
                      }`}
                    >
                      <div className="h-7 w-7 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center shrink-0">
                        {getIconForNotif(n.notification_type)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex justify-between items-start gap-1">
                          <p className="text-xs font-black text-[var(--text-primary)] truncate leading-none">
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] shrink-0 mt-0.5" />
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-6 w-px bg-[var(--border-default)] hidden sm:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="group relative flex items-center gap-3 rounded-full py-1 pl-1 pr-3 hover:bg-[var(--bg-subtle)] transition-all focus:outline-none ring-1 ring-transparent hover:ring-[var(--border-default)] text-left">
                <UserProfilePicture
                  user={user}
                  name={user?.full_name || 'User'}
                  size="default"
                  className="h-8 w-8 border-2 border-[var(--bg-elevated)] shadow-sm ring-1 ring-[var(--border-default)] group-hover:ring-[var(--accent-primary)] transition-all"
                />
                <div className="hidden sm:flex flex-col items-start leading-none">
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[100px]">
                    {user?.full_name?.split(' ')[0]}
                  </span>
                  <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-0.5">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 mt-2 p-1.5 rounded-2xl shadow-[var(--shadow-card)] border border-[var(--border-default)] backdrop-blur-xl bg-[var(--bg-elevated)] text-[var(--text-primary)]" align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1.5">
                    <p className="text-sm font-bold leading-none text-[var(--text-primary)]">{user?.full_name}</p>
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)] truncate flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success-text)] animate-pulse" />
                      {user?.email || 'Active Session'}
                    </p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-[var(--border-subtle)]" />

              <DropdownMenuItem asChild className="focus:bg-[var(--bg-sidebar-hover)] m-1 rounded-xl cursor-pointer font-bold text-xs py-2.5 px-3 group flex items-center gap-2 transition-colors duration-150 text-[var(--text-primary)]">
                <Link href="/profile">
                  <UserIcon className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="focus:bg-[var(--bg-sidebar-hover)] m-1 rounded-xl cursor-pointer font-bold text-xs py-2.5 px-3 group flex items-center gap-2 transition-colors duration-150 text-[var(--text-primary)]">
                <Link href="/profile">
                  <Settings className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-[var(--border-subtle)]" />

              <DropdownMenuItem 
                onClick={() => setShowLogoutDialog(true)} 
                className="text-[var(--status-danger-text)] focus:text-[var(--status-danger-text)] focus:bg-[var(--status-danger-bg)] m-1 rounded-xl cursor-pointer font-bold text-xs py-2.5 px-3 group flex items-center gap-2 transition-colors duration-150"
              >
                <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                <span>Sign Out Account</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        title="Confirm Logout"
        description="Are you sure you want to log out? Your active tracking session will be preserved, but you'll need to log in again to access the dashboard."
        confirmLabel="Logout"
        confirmVariant="destructive"
        onConfirm={handleLogout}
        isLoading={isLoggingOut}
      />
    </>
  );
}
