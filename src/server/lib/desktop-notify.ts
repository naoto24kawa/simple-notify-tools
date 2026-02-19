type SpawnFn = (args: string[]) => void;

interface DesktopNotifyOptions {
  title: string;
  message: string;
  group?: string;
  execute?: string;
}

interface DesktopNotifyDeps {
  spawn?: SpawnFn;
  available?: boolean;
}

function buildOsascript(opts: DesktopNotifyOptions): string[] {
  let script = `display notification "${opts.message}" with title "${opts.title}"`;
  if (opts.group) {
    script += ` subtitle "${opts.group}"`;
  }
  return ["osascript", "-e", script];
}

const defaultSpawn: SpawnFn = (args) => {
  Bun.spawn(args, {
    stdio: ["ignore", "ignore", "ignore"],
  });
};

export async function checkNotifier(): Promise<boolean> {
  // osascript is always available on macOS
  return process.platform === "darwin";
}

export async function sendDesktopNotification(
  opts: DesktopNotifyOptions,
  deps: DesktopNotifyDeps = {},
): Promise<void> {
  const spawn = deps.spawn ?? defaultSpawn;
  const available = deps.available ?? (await checkNotifier());

  if (!available) return;

  const args = buildOsascript(opts);

  try {
    spawn(args);
  } catch (err) {
    console.warn("[desktop-notify] Failed to send notification:", err);
  }

  // osascript display notification does not support click actions.
  // When execute is specified, run the command directly.
  if (opts.execute) {
    try {
      const parts = opts.execute.split(" ");
      spawn(parts);
    } catch (err) {
      console.warn("[desktop-notify] Failed to execute command:", err);
    }
  }
}
