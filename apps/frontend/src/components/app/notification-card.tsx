import type { Notification } from "@repo/types/notification";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}

export function NotificationCard({ notification, onMarkAsRead, onRemove }: NotificationCardProps) {
  const timeAgo = formatTimeAgo(notification.createdAt);

  return (
    <Card className={`p-4 ${notification.read ? "opacity-60" : "border-l-4 border-l-primary"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate">{notification.title}</h3>
            <Badge variant="secondary" className="text-xs shrink-0">
              {notification.category}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{notification.message}</p>
          {Object.keys(notification.metadata).length > 0 && (
            <pre className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded overflow-x-auto">
              {JSON.stringify(notification.metadata, null, 2)}
            </pre>
          )}
          <p className="text-xs text-muted-foreground mt-2">{timeAgo}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {!notification.read && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMarkAsRead(notification.id)}
            >
              Mark read
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(notification.id)}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
