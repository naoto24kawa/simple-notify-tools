import { execFile, spawn } from "node:child_process";
import { tmpdir } from "node:os";

const MIN_MESSAGE_LENGTH = 40;

let claudePath: string | null = null;

async function findClaude(): Promise<string | null> {
  if (claudePath) return claudePath;

  return new Promise((resolve) => {
    execFile("which", ["claude"], (err, stdout) => {
      if (err || !stdout.trim()) {
        resolve(null);
        return;
      }
      claudePath = stdout.trim();
      resolve(claudePath);
    });
  });
}

export function isSummarizationEnabled(): boolean {
  return process.env.NOTIFY_SUMMARIZE !== "false";
}

export async function summarizeMessage(message: string): Promise<string | null> {
  if (!isSummarizationEnabled()) return null;
  if (message.length <= MIN_MESSAGE_LENGTH) return null;

  const bin = await findClaude();
  if (!bin) {
    console.warn("[summarize] claude CLI not found, skipping summarization");
    return null;
  }

  const prompt = `Summarize in under 40 characters. Output ONLY the summary, nothing else:\n${message}`;

  const env = { ...process.env };
  delete env.CLAUDECODE;

  return new Promise((resolve) => {
    const child = spawn(bin, ["-p", "--model", "haiku", "--output-format", "text"], {
      env,
      cwd: tmpdir(),
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30_000,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", (err) => {
      console.warn("[summarize] claude spawn error:", err.message);
      resolve(null);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.warn(`[summarize] claude -p exited with code ${code}`);
        if (stderr) console.warn("[summarize] stderr:", stderr.trim());
        resolve(null);
        return;
      }
      const result = stdout.trim();
      resolve(result || null);
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}
