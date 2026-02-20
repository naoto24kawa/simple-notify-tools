import Anthropic from "@anthropic-ai/sdk";

const MIN_MESSAGE_LENGTH = 80;

let client: Anthropic | null = null;

export function isSummarizationEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export async function summarizeMessage(message: string): Promise<string | null> {
  if (!isSummarizationEnabled()) return null;
  if (message.length <= MIN_MESSAGE_LENGTH) return null;

  try {
    const response = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `Summarize the following notification message in one concise sentence (max 100 chars). Output ONLY the summary, no explanation.\n\n${message}`,
        },
      ],
    });

    const block = response.content[0];
    if (block && block.type === "text") {
      return block.text.trim();
    }
    return null;
  } catch (err) {
    console.warn("[summarize] AI summarization failed:", err);
    return null;
  }
}
