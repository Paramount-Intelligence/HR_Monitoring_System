/* PIMS Web Push service worker — app-closed notifications when VAPID is configured. */
const DEFAULT_ICON = '/logo.png';
const DEFAULT_URL = '/notifications';

function parsePushData(event) {
  const fallback = {
    title: 'PIMS',
    body: 'New notification',
    url: DEFAULT_URL,
    tag: 'pims-notification',
    notification_id: null,
    type: 'system',
    created_at: null,
  };

  if (!event.data) {
    return fallback;
  }

  try {
    const parsed = event.data.json();
    return {
      ...fallback,
      ...parsed,
      title: parsed.title || fallback.title,
      body: parsed.body || fallback.body,
      url: parsed.url || DEFAULT_URL,
      tag: parsed.tag || fallback.tag,
    };
  } catch {
    return fallback;
  }
}

self.addEventListener('push', (event) => {
  const data = parsePushData(event);

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: DEFAULT_ICON,
      badge: DEFAULT_ICON,
      tag: data.tag,
      data: {
        url: data.url,
        notification_id: data.notification_id,
        type: data.type,
        created_at: data.created_at,
      },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || DEFAULT_URL;
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            return client.navigate(absoluteUrl).then(() => client.focus());
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }
    })
  );
});
