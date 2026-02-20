import { afterEach, describe, expect, test } from "bun:test";
import { isSummarizationEnabled, summarizeMessage } from "./summarize";

describe("summarize", () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (originalEnv) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  test("isSummarizationEnabled returns false when API key is not set", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(isSummarizationEnabled()).toBe(false);
  });

  test("isSummarizationEnabled returns true when API key is set", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    expect(isSummarizationEnabled()).toBe(true);
  });

  test("summarizeMessage returns null when API key is not set", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await summarizeMessage(
      "some long message that should be summarized by the AI service",
    );
    expect(result).toBeNull();
  });

  test("summarizeMessage returns null for short messages", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const result = await summarizeMessage("short msg");
    expect(result).toBeNull();
  });
});
