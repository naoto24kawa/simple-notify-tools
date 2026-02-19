interface NotificationBadgeProps {
  count: number;
  connected: boolean;
}

export function NotificationBadge({ count, connected }: NotificationBadgeProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-xs text-muted-foreground">
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>
      {count > 0 && (
        <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}
