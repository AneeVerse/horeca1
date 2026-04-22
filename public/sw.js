self.addEventListener('push', event => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Horeca1', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Horeca1', {
      body: data.body || '',
      icon: '/horeca1_logo.jpg',
      badge: '/horeca1_logo.jpg',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const url = event.notification.data?.url || '/';
      for (const client of list) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
