import { notificationsApi, WebPushSubscriptionPayload } from '@/lib/api/notifications';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function subscriptionToPayload(sub: PushSubscription): WebPushSubscriptionPayload | null {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return null;
  }
  return {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  };
}

export type EnsureWebPushResult = {
  subscribed: boolean;
  serverConfigured: boolean;
  localOnly: boolean;
  error?: string;
};

export async function ensureWebPushSubscription(): Promise<EnsureWebPushResult> {
  if (!isWebPushSupported()) {
    return { subscribed: false, serverConfigured: false, localOnly: false, error: 'not_supported' };
  }

  const pushKey = await notificationsApi.getPushPublicKey();
  if (!pushKey.configured || !pushKey.public_key) {
    return { subscribed: false, serverConfigured: false, localOnly: true };
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const applicationServerKey = urlBase64ToUint8Array(pushKey.public_key);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const payload = subscriptionToPayload(sub);
    if (!payload) {
      return {
        subscribed: false,
        serverConfigured: true,
        localOnly: false,
        error: 'invalid_subscription',
      };
    }

    await notificationsApi.registerPushSubscription(payload);
    return { subscribed: true, serverConfigured: true, localOnly: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Web Push subscribe failed';
    return {
      subscribed: false,
      serverConfigured: true,
      localOnly: false,
      error: message,
    };
  }
}

export async function revokeWebPushSubscription(): Promise<void> {
  if (!isWebPushSupported()) {
    return;
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) {
      return;
    }

    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      return;
    }

    const payload = subscriptionToPayload(sub);
    if (payload) {
      try {
        await notificationsApi.unregisterPushSubscription(payload);
      } catch {
        /* backend revoke is best-effort */
      }
    }

    await sub.unsubscribe();
  } catch {
    /* unsubscribe is best-effort */
  }
}

export async function syncWebPushSubscriptionIfEnabled(
  desktopNotificationsEnabled: boolean
): Promise<void> {
  if (!desktopNotificationsEnabled) {
    return;
  }
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }
  if (!isWebPushSupported()) {
    return;
  }

  await ensureWebPushSubscription();
}
