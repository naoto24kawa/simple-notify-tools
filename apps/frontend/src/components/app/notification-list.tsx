import type { Notification } from "@repo/types/notification";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationCard } from "./notification-card";

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}

export function NotificationList({ notifications, onMarkAsRead, onRemove }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No notifications yet
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="space-y-2 pr-4">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onMarkAsRead={onMarkAsRead}
            onRemove={onRemove}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
