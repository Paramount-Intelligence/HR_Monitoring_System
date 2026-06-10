'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'pims_messages_notification_prompt_dismissed';

interface MessagesNotificationPromptProps {
  onEnable: () => void;
}

export function MessagesNotificationPrompt({ onEnable }: MessagesNotificationPromptProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    const granted = Notification.permission === 'granted';
    setVisible(!dismissed && !granted);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setVisible(false);
  };

  const enable = async () => {
    onEnable();
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      localStorage.setItem(DISMISS_KEY, 'true');
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="shrink-0 mx-3 mb-2 mt-1 flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
      <div className="flex items-start gap-2 min-w-0">
        <Bell className="h-4 w-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
          Enable browser notifications for real-time message alerts.
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button size="sm" className="h-7 rounded-md text-[10px] px-2" onClick={enable}>
          Enable
        </Button>
        <button
          type="button"
          onClick={dismiss}
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
          aria-label="Dismiss notification prompt"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
