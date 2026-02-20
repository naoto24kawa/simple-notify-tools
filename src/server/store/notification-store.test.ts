import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { NotificationStore } from "./notification-store";

const TEST_DIR = "data/test";
const TEST_FILE = `${TEST_DIR}/notifications-test.json`;

describe("NotificationStore", () => {
  let store: NotificationStore;

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    store = new NotificationStore(TEST_FILE);
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  test("add creates a notification with generated id and timestamp", () => {
    const notification = store.add({
      title: "Test",
      message: "Hello",
    });

    expect(notification.id).toBeDefined();
    expect(notification.title).toBe("Test");
    expect(notification.message).toBe("Hello");
    expect(notification.category).toBe("info");
    expect(notification.metadata).toEqual({});
    expect(notification.read).toBe(false);
    expect(notification.createdAt).toBeDefined();
  });

  test("getAll returns all notifications sorted by createdAt desc", () => {
    store.add({ title: "First", message: "1" });
    store.add({ title: "Second", message: "2" });

    const all = store.getAll();
    expect(all).toHaveLength(2);
    expect(all[0]?.title).toBe("Second");
    expect(all[1]?.title).toBe("First");
  });

  test("markAsRead sets read to true", () => {
    const notification = store.add({ title: "Test", message: "msg" });

    const updated = store.markAsRead(notification.id);
    expect(updated?.read).toBe(true);
  });

  test("markAsRead returns null for non-existent id", () => {
    const result = store.markAsRead("non-existent");
    expect(result).toBeNull();
  });

  test("remove deletes a notification", () => {
    const notification = store.add({ title: "Test", message: "msg" });

    const removed = store.remove(notification.id);
    expect(removed).toBe(true);
    expect(store.getAll()).toHaveLength(0);
  });

  test("remove returns false for non-existent id", () => {
    const result = store.remove("non-existent");
    expect(result).toBe(false);
  });

  test("persists data to JSON file", () => {
    store.add({ title: "Persisted", message: "data" });

    const store2 = new NotificationStore(TEST_FILE);
    const all = store2.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.title).toBe("Persisted");
  });

  test("handles missing file gracefully", () => {
    const store = new NotificationStore(`${TEST_DIR}/non-existent.json`);
    expect(store.getAll()).toEqual([]);
  });

  test("update sets summary on a notification", () => {
    const notification = store.add({ title: "Test", message: "long message" });
    const updated = store.update(notification.id, { summary: "short" });
    expect(updated?.summary).toBe("short");
  });

  test("update returns null for non-existent id", () => {
    const result = store.update("non-existent", { summary: "short" });
    expect(result).toBeNull();
  });

  test("update persists to file", () => {
    const notification = store.add({ title: "Test", message: "msg" });
    store.update(notification.id, { summary: "summarized" });
    const store2 = new NotificationStore(TEST_FILE);
    const all = store2.getAll();
    expect(all[0]?.summary).toBe("summarized");
  });

  test("add with custom category and metadata", () => {
    const notification = store.add({
      title: "Custom",
      message: "msg",
      category: "task_complete",
      metadata: { project: "my-project" },
    });

    expect(notification.category).toBe("task_complete");
    expect(notification.metadata).toEqual({ project: "my-project" });
  });
});
