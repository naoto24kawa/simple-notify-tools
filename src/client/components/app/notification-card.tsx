import type { Notification } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
  onFocusWindow?: (projectDir: string) => void;
  serverHostname?: string | null;
}

export function NotificationCard({
  notification,
  onMarkAsRead,
  onRemove,
  onFocusWindow,
  serverHostname,
}: NotificationCardProps) {
  const timeAgo = formatTimeAgo(notification.createdAt);
  const projectDir =
    typeof notification.metadata.project === "string" ? notification.metadata.project : null;
  const notifHostname =
    typeof notification.metadata.hostname === "string" ? notification.metadata.hostname : null;
  const isLocal = !!serverHostname && notifHostname === serverHostname;
  const canFocus = !!projectDir && !!onFocusWindow && isLocal;

  return (
    <Card className={`p-4 ${notification.read ? "opacity-60" : "border-l-4 border-l-primary"}`}>
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
      <div className="flex items-center gap-2 mt-2">
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
        <div className="flex gap-1 ml-auto">
          {canFocus && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onFocusWindow(projectDir)}
            >
              Open in VS Code
            </Button>
          )}
          {!notification.read && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onMarkAsRead(notification.id)}
            >
              Mark read
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => onRemove(notification.id)}
          >
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
