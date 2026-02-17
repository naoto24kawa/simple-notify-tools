export interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface CreateNotificationPayload {
  title: string;
  message: string;
  category?: string;
  metadata?: Record<string, unknown>;
}
