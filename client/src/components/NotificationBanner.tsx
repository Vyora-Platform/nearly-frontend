import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NotificationBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setIsSupported(true);

      // Show banner if permission is default (not granted or denied)
      if (Notification.permission === 'default') {
        // Small delay to avoid showing immediately on page load
        const timer = setTimeout(() => setShowBanner(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Show a test notification
        new Notification('Nearly', {
          body: 'Notifications enabled! Stay connected with local events and updates.',
          icon: '/icon-192x192.png', // You'll need to add this icon
          badge: '/icon-192x192.png'
        });
      }
    } catch (error) {
      console.error('Notification permission request failed:', error);
    }
    setShowBanner(false);
  };

  const dismiss = () => {
    setShowBanner(false);
    // Remember dismissal for this session
    sessionStorage.setItem('notification-banner-dismissed', 'true');
  };

  // Don't show if not supported or already dismissed
  if (!isSupported || !showBanner || sessionStorage.getItem('notification-banner-dismissed')) {
    return null;
  }

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 bg-gradient-primary text-white px-4 py-3 safe-area-top",
      "transform transition-transform duration-300",
      showBanner ? "translate-y-0" : "-translate-y-full"
    )}>
      <div className="max-w-md mx-auto flex items-center gap-3">
        <Bell className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            Stay updated with local events and discussions
          </p>
          <p className="text-xs opacity-90">
            Get notified about nearby activities and community updates
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={requestPermission}
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-white/30 h-8 px-3 text-xs"
          >
            Enable
          </Button>
          <button
            onClick={dismiss}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}