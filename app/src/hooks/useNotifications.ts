import { useState, useCallback } from 'react';
import type { Notification } from '@/types/os';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback(
    (title: string, message: string, type: Notification['type'] = 'info') => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const notification: Notification = {
        id,
        title,
        message,
        type,
        timestamp: Date.now(),
      };
      setNotifications((prev) => [...prev.slice(-4), notification]);

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 5000);

      return id;
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notifications, notify, dismiss };
}
