self.addEventListener('push', function (event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const title = data.title || 'Chrono Stellar';
            const options = {
                body: data.body || 'Nuova notifica disponibile',
                icon: '/logo.png',
                badge: '/logo.png',
                data: {
                    url: data.url || '/'
                },
                vibrate: [100, 50, 100],
                actions: [
                    { action: 'open', title: 'Apri' }
                ]
            };

            event.waitUntil(
                self.registration.showNotification(title, options)
            );
        } catch (e) {
            console.error('Push data error:', e);
        }
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    let url = '/';
    if (event.notification.data && event.notification.data.url) {
        url = event.notification.data.url;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            // Se c'è già una finestra aperta, focalizzala
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Altrimenti aprine una nuova
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
