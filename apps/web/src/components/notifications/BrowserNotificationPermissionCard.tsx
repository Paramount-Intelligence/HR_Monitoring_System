'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import {
  readBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  isNotificationApiSupported,
} from '@/lib/notifications/browserNotifications';
import { notificationsApi } from '@/lib/api/notifications';
import {
  ensureWebPushSubscription,
  isWebPushSupported,
  revokeWebPushSubscription,
  syncWebPushSubscriptionIfEnabled,
} from '@/lib/notifications/web-push';
import { NotificationPreferenceToggle } from './NotificationPreferenceToggle';
import { toast } from 'sonner';

export function BrowserNotificationPermissionCard() {
  const { preferences, updatePreferences } = useNotificationPreferences();
  const [enabling, setEnabling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [testing, setTesting] = useState(false);
  const [serverPushConfigured, setServerPushConfigured] = useState<boolean | null>(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  const permission = readBrowserNotificationPermission();
  const supported = isNotificationApiSupported();
  const desktopEnabled =
    preferences.desktopNotificationsEnabled && permission === 'granted';

  const refreshPushStatus = useCallback(async () => {
    try {
      const key = await notificationsApi.getPushPublicKey();
      setServerPushConfigured(key.configured);
    } catch {
      setServerPushConfigured(false);
    }

    if (isWebPushSupported() && permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        setPushSubscribed(Boolean(sub));
      } catch {
        setPushSubscribed(false);
      }
    } else {
      setPushSubscribed(false);
    }
  }, [permission]);

  useEffect(() => {
    void refreshPushStatus();
  }, [refreshPushStatus]);

  useEffect(() => {
    if (!preferences.desktopNotificationsEnabled || permission !== 'granted') {
      return;
    }
    void syncWebPushSubscriptionIfEnabled(true).then(() => refreshPushStatus());
  }, [preferences.desktopNotificationsEnabled, permission, refreshPushStatus]);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const result = await requestBrowserNotificationPermission();
      if (result === 'granted') {
        await updatePreferences({ desktopNotificationsEnabled: true });

        const pushResult = await ensureWebPushSubscription();
        await refreshPushStatus();

        if (pushResult.subscribed) {
          toast.success('Browser notifications enabled');
        } else if (pushResult.localOnly) {
          toast.success('Browser notifications enabled');
          toast.message('App-closed push is not configured on the server yet.');
        } else if (pushResult.error) {
          toast.success('Browser notifications enabled for this tab');
          toast.error(`Web Push subscribe failed: ${pushResult.error}`);
        } else {
          toast.success('Browser notifications enabled');
        }
      } else if (result === 'denied') {
        toast.error('Browser notifications are blocked. Enable them from browser site settings.');
      }
    } finally {
      setEnabling(false);
    }
  };

  const handleDisable = async () => {
    setDisabling(true);
    try {
      await revokeWebPushSubscription();
      await updatePreferences({ desktopNotificationsEnabled: false });
      await refreshPushStatus();
      toast.success('Desktop notifications disabled');
    } catch {
      toast.error('Could not disable browser notifications');
    } finally {
      setDisabling(false);
    }
  };

  const handleTestPush = async () => {
    setTesting(true);
    try {
      const result = await notificationsApi.sendTestWebPush();
      if (!result.configured) {
        toast.error(result.message || 'Web Push is not configured on the server');
        return;
      }
      if (result.sent > 0) {
        toast.success('Test push sent — check your system notifications');
      } else if (result.subscriptions === 0) {
        toast.error('No active browser push subscription. Re-enable notifications.');
      } else {
        toast.error('Test push failed to deliver');
      }
    } catch {
      toast.error('Could not send test push');
    } finally {
      setTesting(false);
    }
  };

  const permissionHint = !supported
    ? 'Browser notifications are not supported in this browser.'
    : permission === 'denied'
      ? 'Browser notifications are blocked. Enable them from browser site settings.'
      : permission !== 'granted'
        ? 'Allow browser notifications to receive desktop alerts while PIMS is open or in the background.'
        : serverPushConfigured === false
          ? 'Desktop alerts work while PIMS is open. App-closed push is not configured on the server yet.'
          : pushSubscribed
            ? 'Desktop and app-closed Web Push alerts are enabled for this browser.'
            : 'Desktop alerts are allowed for this browser.';

  return (
    <Card className="p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5 text-[var(--accent-primary)]" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-[var(--text-primary)]">Browser notifications</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">{permissionHint}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">Desktop notifications</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            {desktopEnabled
              ? 'Enabled — alerts appear outside the PIMS tab when permitted.'
              : 'Disabled — in-app banners and sounds still follow your preferences below.'}
          </p>
        </div>
        <NotificationPreferenceToggle
          checked={desktopEnabled}
          disabled={enabling || disabling}
          onCheckedChange={(enabled) => {
            if (enabled && permission !== 'granted') {
              void handleEnable();
              return;
            }
            if (!enabled) {
              void handleDisable();
              return;
            }
            void updatePreferences({ desktopNotificationsEnabled: true })
              .then(() => ensureWebPushSubscription())
              .then(() => refreshPushStatus())
              .catch(() => toast.error('Could not save notification settings'));
          }}
        />
      </div>

      {supported && permission !== 'granted' && (
        <Button
          type="button"
          disabled={enabling}
          onClick={() => void handleEnable()}
          className="w-full sm:w-auto rounded-xl font-bold text-xs"
        >
          {enabling ? 'Requesting permission…' : 'Enable browser notifications'}
        </Button>
      )}

      {desktopEnabled && serverPushConfigured && (
        <Button
          type="button"
          variant="outline"
          disabled={testing}
          onClick={() => void handleTestPush()}
          className="w-full sm:w-auto rounded-xl font-bold text-xs"
        >
          {testing ? 'Sending test…' : 'Send test push'}
        </Button>
      )}
    </Card>
  );
}
