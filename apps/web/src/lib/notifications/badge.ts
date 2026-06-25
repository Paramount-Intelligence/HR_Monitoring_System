import type { NotificationPreferences } from './notification-preferences';
import { isWithinQuietHours } from './delivery';

export async function setAppBadge(count: number): Promise<void> {
  if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return;
  try {
    await (navigator as Navigator & { setAppBadge: (n: number) => Promise<void> }).setAppBadge(
      count
    );
  } catch {
    /* silent */
  }
}

export async function clearAppBadge(): Promise<void> {
  if (typeof navigator === 'undefined' || !('clearAppBadge' in navigator)) return;
  try {
    await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
  } catch {
    /* silent */
  }
}

export function shouldUpdateTaskbarBadge(
  preferences: NotificationPreferences | null,
  documentVisible: boolean
): boolean {
  if (!preferences) return true;
  if (preferences.taskbarBadgeMode === 'never') return false;
  if (preferences.taskbarBadgeMode === 'app_open' && !documentVisible) return false;
  if (isWithinQuietHours(preferences)) return false;
  return true;
}

export async function syncTaskbarBadge(
  count: number,
  preferences: NotificationPreferences | null
): Promise<void> {
  const visible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;
  if (!shouldUpdateTaskbarBadge(preferences, visible)) {
    await clearAppBadge();
    return;
  }
  if (count <= 0) {
    await clearAppBadge();
    return;
  }
  await setAppBadge(count);
}
