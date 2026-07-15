export function requestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, options);
      } catch (err) {
        console.error('Failed to trigger browser notification:', err);
      }
    }
  }
}
