const API_URL = '';

/**
 * Converte la chiave pubblica VAPID da Base64 a Uint8Array
 */
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Registra il Service Worker e sottoscrive l'utente alle notifiche push
 */
export async function subscribeToPushNotifications(token: string) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Push notifications non supportate dal browser o contesto non sicuro (serve HTTPS).');
        console.warn('Push notifications non supportate dal browser.');
        return false;
    }

    if (!window.isSecureContext) {
        console.warn('Le notifiche Push richiedono HTTPS o localhost per funzionare.');
        return false;
    }

    try {
        // 1. Richiedi permesso
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            console.warn('Permesso notifiche negato:', permission);
            return false;
        }

        // 2. Registra Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');

        // 3. Recupera Public Key dal backend
        const response = await fetch(`${API_URL}/api/push/key`);
        if (!response.ok) throw new Error(`Errore recupero chiave: ${response.status}`);
        const { publicKey } = await response.json();

        // 4. Sottoscrizione
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        // 5. Invia al backend
        const subResponse = await fetch(`${API_URL}/api/push/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ subscription })
        });

        return subResponse.ok;
    } catch (error: any) {
        console.error('Errore durante la registrazione push:', error);
        return false;
    }
}

/**
 * Verifica se l'utente è già sottoscritto
 */
export async function checkPushSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
}
