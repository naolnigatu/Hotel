/**
 * Utility for requesting native browser notification permissions and displaying native desktop/mobile toasts.
 */

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notifications.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function showNativeBrowserNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        ...options,
      });

      notif.onclick = () => {
        window.focus();
      };
    } catch (e) {
      console.error('Error showing native notification:', e);
    }
  }
}
