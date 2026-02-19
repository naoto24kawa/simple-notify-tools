import type { Notification } from "@repo/types/notification";
import { useCallback, useEffect, useState } from "react";
import { useSSE } from "./use-sse";

const API_BASE = import.meta.env.VITE_API_URL || "";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`);
      const data = await res.json();
      setNotifications(data.notifications);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const { connected } = useSSE({
    url: `${API_BASE}/api/events`,
    onMessage: (event, data) => {
      if (event === "created") {
        const notification: Notification = JSON.parse(data);
        setNotifications((prev) => [notification, ...prev]);
        showDesktopNotification(notification);
      } else if (event === "read") {
        const notification: Notification = JSON.parse(data);
        setNotifications((prev) => prev.map((n) => (n.id === notification.id ? notification : n)));
      } else if (event === "deleted") {
        const { id } = JSON.parse(data);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    },
  });

  const markAsRead = useCallback(async (id: string) => {
    await fetch(`${API_BASE}/api/notifications/${id}/read`, {
      method: "PATCH",
    });
  }, []);

  const remove = useCallback(async (id: string) => {
    await fetch(`${API_BASE}/api/notifications/${id}`, {
      method: "DELETE",
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const focusWindow = useCallback(async (projectDir: string) => {
    try {
      await fetch(`${API_BASE}/api/focus-window`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectDir }),
      });
    } catch (err) {
      console.error("Failed to focus window:", err);
    }
  }, []);

  return { notifications, unreadCount, loading, connected, markAsRead, remove, focusWindow };
}

function showDesktopNotification(notification: Notification) {
  if (Notification.permission === "granted") {
    new Notification(notification.title, {
      body: notification.message,
      tag: notification.id,
    });
  }
}
