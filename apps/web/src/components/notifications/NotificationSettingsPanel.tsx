'use client';

import {
  Bell,
  MessageSquare,
  Users,
  AtSign,
  Phone,
  CheckSquare,
  ClipboardCheck,
  Clock,
  Megaphone,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import type { NotificationPreferences } from '@/lib/notifications/notification-preferences';
import { BrowserNotificationPermissionCard } from './BrowserNotificationPermissionCard';
import { NotificationModeSelector } from './NotificationModeSelector';
import { NotificationPreferenceRow } from './NotificationPreferenceRow';
import { toast } from 'sonner';

interface NotificationSettingsPanelProps {
  context?: 'profile' | 'messages';
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] space-y-4">
      <div>
        <h3 className="text-base font-extrabold text-[var(--text-primary)]">{title}</h3>
        {description ? (
          <p className="text-xs text-[var(--text-muted)] mt-1">{description}</p>
        ) : null}
      </div>
      <div className="space-y-1">{children}</div>
    </Card>
  );
}

export function NotificationSettingsPanel({ context = 'profile' }: NotificationSettingsPanelProps) {
  const { preferences, loading, updatePreferences } = useNotificationPreferences();

  const patch = (data: Partial<NotificationPreferences>) => {
    void updatePreferences(data).catch(() => toast.error('Could not save notification settings'));
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8 text-sm text-[var(--text-muted)]">
        Loading notification settings…
      </div>
    );
  }

  return (
    <div className="space-y-6" data-notification-settings-context={context}>
      <BrowserNotificationPermissionCard />

      <SettingsSection
        title="Delivery"
        description="Control how in-app banners and taskbar badges appear."
      >
        <NotificationModeSelector
          id="banner-mode"
          label="Show notification banner"
          value={preferences.bannerMode}
          onChange={(bannerMode) => patch({ bannerMode })}
        />
        <NotificationModeSelector
          id="taskbar-badge-mode"
          label="Show taskbar notification badge"
          value={preferences.taskbarBadgeMode}
          onChange={(taskbarBadgeMode) => patch({ taskbarBadgeMode })}
        />
        <NotificationPreferenceRow
          label="Show previews"
          subtitle="Preview message text inside message notifications."
          icon={<MessageSquare className="h-5 w-5" />}
          checked={preferences.showPreviews}
          onCheckedChange={(showPreviews) => patch({ showPreviews })}
        />
      </SettingsSection>

      <SettingsSection
        title="Messages and calls"
        description="Choose which conversation alerts you receive."
      >
        <NotificationPreferenceRow
          label="Messages"
          icon={<MessageSquare className="h-5 w-5" />}
          checked={preferences.messageNotificationsEnabled}
          onCheckedChange={(messageNotificationsEnabled) => patch({ messageNotificationsEnabled })}
        />
        <NotificationPreferenceRow
          label="Groups"
          icon={<Users className="h-5 w-5" />}
          checked={preferences.groupNotificationsEnabled}
          onCheckedChange={(groupNotificationsEnabled) => patch({ groupNotificationsEnabled })}
        />
        <NotificationPreferenceRow
          label="Mentions"
          icon={<AtSign className="h-5 w-5" />}
          checked={preferences.mentionNotificationsEnabled}
          onCheckedChange={(mentionNotificationsEnabled) => patch({ mentionNotificationsEnabled })}
        />
        <NotificationPreferenceRow
          label="Calls"
          icon={<Phone className="h-5 w-5" />}
          checked={preferences.callNotificationsEnabled}
          onCheckedChange={(callNotificationsEnabled) => patch({ callNotificationsEnabled })}
        />
      </SettingsSection>

      <SettingsSection
        title="Work notifications"
        description="Alerts for tasks, approvals, attendance, and announcements."
      >
        <NotificationPreferenceRow
          label="Tasks"
          icon={<CheckSquare className="h-5 w-5" />}
          checked={preferences.taskNotificationsEnabled}
          onCheckedChange={(taskNotificationsEnabled) => patch({ taskNotificationsEnabled })}
        />
        <NotificationPreferenceRow
          label="Approvals"
          icon={<ClipboardCheck className="h-5 w-5" />}
          checked={preferences.approvalNotificationsEnabled}
          onCheckedChange={(approvalNotificationsEnabled) => patch({ approvalNotificationsEnabled })}
        />
        <NotificationPreferenceRow
          label="Attendance"
          icon={<Clock className="h-5 w-5" />}
          checked={preferences.attendanceNotificationsEnabled}
          onCheckedChange={(attendanceNotificationsEnabled) =>
            patch({ attendanceNotificationsEnabled })
          }
        />
        <NotificationPreferenceRow
          label="Announcements"
          icon={<Megaphone className="h-5 w-5" />}
          checked={preferences.announcementNotificationsEnabled}
          onCheckedChange={(announcementNotificationsEnabled) =>
            patch({ announcementNotificationsEnabled })
          }
        />
      </SettingsSection>

      <SettingsSection title="Sounds" description="Message send and receive sounds in PIMS.">
        <NotificationPreferenceRow
          label="Play sound for incoming messages"
          icon={<Bell className="h-5 w-5" />}
          checked={preferences.incomingSoundEnabled}
          onCheckedChange={(incomingSoundEnabled) => patch({ incomingSoundEnabled })}
        />
        <NotificationPreferenceRow
          label="Play sound for outgoing messages"
          icon={<Bell className="h-5 w-5" />}
          checked={preferences.outgoingSoundEnabled}
          onCheckedChange={(outgoingSoundEnabled) => patch({ outgoingSoundEnabled })}
        />
      </SettingsSection>

      <SettingsSection
        title="Quiet hours"
        description="Suppress notification sounds during selected hours."
      >
        <NotificationPreferenceRow
          label="Quiet hours"
          icon={<Clock className="h-5 w-5" />}
          checked={preferences.quietHoursEnabled}
          onCheckedChange={(quietHoursEnabled) => patch({ quietHoursEnabled })}
        />
        {preferences.quietHoursEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <label className="text-xs font-bold text-[var(--text-secondary)]">
              Start time
              <input
                type="time"
                value={preferences.quietHoursStart?.slice(0, 5) || '22:00'}
                onChange={(e) => patch({ quietHoursStart: `${e.target.value}:00` })}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </label>
            <label className="text-xs font-bold text-[var(--text-secondary)]">
              End time
              <input
                type="time"
                value={preferences.quietHoursEnd?.slice(0, 5) || '07:00'}
                onChange={(e) => patch({ quietHoursEnd: `${e.target.value}:00` })}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </label>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
