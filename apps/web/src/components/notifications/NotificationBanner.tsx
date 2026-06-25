'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Notification } from '@/lib/api/notifications';

interface NotificationBannerProps {
  notification: Notification | null;
  onDismiss: () => void;
  onOpen: (notification: Notification) => void;
}

export function NotificationBanner({ notification, onDismiss, onOpen }: NotificationBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!notification) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification || !visible) return null;

  return (
    <div className="fixed top-4 right-4 z-[70] w-[min(360px,calc(100vw-2rem))] animate-in slide-in-from-top-2">
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="w-full text-left rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-lg p-4 pr-10 hover:bg-[var(--bg-sidebar-hover)] transition-colors"
      >
        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{notification.title}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{notification.message}</p>
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2 right-2 h-7 w-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
