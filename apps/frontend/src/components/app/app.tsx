import { useEffect } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationBadge } from "./notification-badge";
import { NotificationList } from "./notification-list";

export function App() {
  const { notifications, unreadCount, loading, connected, markAsRead, remove } = useNotifications();

  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Notifications</h1>
          <NotificationBadge count={unreadCount} connected={connected} />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            Loading...
          </div>
        ) : (
          <NotificationList
            notifications={notifications}
            onMarkAsRead={markAsRead}
            onRemove={remove}
          />
        )}
      </main>
    </div>
  );
}
