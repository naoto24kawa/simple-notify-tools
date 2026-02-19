import type { Notification } from "@repo/types/notification";
import { NotificationCard } from "./notification-card";

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
  onFocusWindow?: (projectDir: string) => void;
  serverHostname?: string | null;
}

export function NotificationList({
  notifications,
  onMarkAsRead,
  onRemove,
  onFocusWindow,
  serverHostname,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No notifications yet
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] overflow-y-auto">
      <div className="space-y-2">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onMarkAsRead={onMarkAsRead}
            onRemove={onRemove}
            onFocusWindow={onFocusWindow}
            serverHostname={serverHostname}
          />
        ))}
      </div>
    </div>
  );
}
