import { afterEach, describe, expect, test } from "bun:test";
import { isSummarizationEnabled, summarizeMessage } from "./summarize";

describe("summarize", () => {
  const originalEnv = process.env.NOTIFY_SUMMARIZE;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NOTIFY_SUMMARIZE = originalEnv;
    } else {
      delete process.env.NOTIFY_SUMMARIZE;
    }
  });

  test("isSummarizationEnabled returns true by default", () => {
    delete process.env.NOTIFY_SUMMARIZE;
    expect(isSummarizationEnabled()).toBe(true);
  });

  test("isSummarizationEnabled returns false when NOTIFY_SUMMARIZE=false", () => {
    process.env.NOTIFY_SUMMARIZE = "false";
    expect(isSummarizationEnabled()).toBe(false);
  });

  test("summarizeMessage returns null when disabled", async () => {
    process.env.NOTIFY_SUMMARIZE = "false";
    const result = await summarizeMessage(
      "some long message that should be summarized by the AI service",
    );
    expect(result).toBeNull();
  });

  test("summarizeMessage returns null for short messages", async () => {
    const result = await summarizeMessage("short msg");
    expect(result).toBeNull();
  });
});
