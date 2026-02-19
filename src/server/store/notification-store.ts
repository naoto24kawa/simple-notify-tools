import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CreateNotificationPayload, Notification } from "@shared/types";

export class NotificationStore {
  private notifications: Notification[] = [];
  private readonly filePath: string;
  private writing = false;
  private pendingWrite = false;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  add(payload: CreateNotificationPayload): Notification {
    const notification: Notification = {
      id: crypto.randomUUID(),
      title: payload.title,
      message: payload.message,
      category: payload.category ?? "info",
      metadata: payload.metadata ?? {},
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.push(notification);
    this.save();
    return notification;
  }

  getAll(): Notification[] {
    return [...this.notifications]
      .map((n, i) => ({ n, i }))
      .sort((a, b) => {
        const timeDiff = new Date(b.n.createdAt).getTime() - new Date(a.n.createdAt).getTime();
        return timeDiff !== 0 ? timeDiff : b.i - a.i;
      })
      .map(({ n }) => n);
  }

  markAsRead(id: string): Notification | null {
    const notification = this.notifications.find((n) => n.id === id);
    if (!notification) return null;
    notification.read = true;
    this.save();
    return notification;
  }

  remove(id: string): boolean {
    const index = this.notifications.findIndex((n) => n.id === id);
    if (index === -1) return false;
    this.notifications.splice(index, 1);
    this.save();
    return true;
  }

  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        const data = readFileSync(this.filePath, "utf-8");
        this.notifications = JSON.parse(data);
      }
    } catch {
      this.notifications = [];
    }
  }

  private save(): void {
    if (this.writing) {
      this.pendingWrite = true;
      return;
    }
    this.writing = true;
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.filePath, JSON.stringify(this.notifications, null, 2));
    } finally {
      this.writing = false;
      if (this.pendingWrite) {
        this.pendingWrite = false;
        this.save();
      }
    }
  }
}
