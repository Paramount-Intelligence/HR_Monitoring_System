'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import {
  BrowserNotificationProvider,
  useBrowserNotificationsEnabled,
} from '@/components/notifications/BrowserNotificationProvider';
import { RealtimeProvider } from '@/providers/RealtimeProvider';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';
import { unlockSounds } from '@/lib/calls/sounds';

function NotificationBridge() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      setEnabled(useBrowserNotificationsEnabled());
    }
  }, [user]);

  useEffect(() => {
    const handler = () => setEnabled(useBrowserNotificationsEnabled());
    window.addEventListener('pims-browser-notifications-changed', handler);
    return () => window.removeEventListener('pims-browser-notifications-changed', handler);
  }, []);

  if (!user) return null;
  return <BrowserNotificationProvider enabled={enabled} />;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isMessagesRoute = pathname?.startsWith('/messages');

  useEffect(() => {
    const unlock = () => { void unlockSounds(); };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <RealtimeProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)] transition-all duration-300">
        <NotificationBridge />
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={() => setIsSidebarOpen(true)} />
        
        <main
          className={cn(
            'flex-1 relative transition-colors duration-300 min-h-0',
            isMessagesRoute ? 'overflow-hidden bg-[var(--bg-page)]' : 'overflow-y-auto bg-[var(--bg-page)]'
          )}
        >
          {!isMessagesRoute && (
            <div className="absolute inset-0 bg-[linear-gradient(var(--border-subtle)_1px,transparent_1px),linear-gradient(90deg,var(--border-subtle)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-[0.04] dark:opacity-[0.07] transition-opacity duration-300" />
          )}
          
          <div
            className={cn(
              'relative h-full',
              isMessagesRoute ? 'min-h-0 overflow-hidden' : 'mx-auto max-w-7xl px-3 py-5 sm:px-5 lg:px-6'
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
    </RealtimeProvider>
  );
}
