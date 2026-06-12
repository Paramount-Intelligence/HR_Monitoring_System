import {
  getStoredPermissionRequested,
  isNotificationApiSupported,
  markPermissionRequested,
  readBrowserNotificationPermission,
} from '@/hooks/useBrowserNotifications';

/** Request browser notification permission once after login (non-React contexts). */
export async function autoRequestBrowserNotificationsAfterLogin(): Promise<void> {
  if (!isNotificationApiSupported()) return;
  if (getStoredPermissionRequested()) return;
  if (readBrowserNotificationPermission() !== 'default') {
    markPermissionRequested();
    return;
  }

  markPermissionRequested();
  try {
    await Notification.requestPermission();
    window.dispatchEvent(new CustomEvent('pims-browser-notifications-changed'));
  } catch {
    /* user dismissed or browser blocked */
  }
}
