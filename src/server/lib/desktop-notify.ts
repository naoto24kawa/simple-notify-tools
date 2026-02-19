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

const defaultSpawn: SpawnFn = (args) => {
  Bun.spawn(["terminal-notifier", ...args], {
    stdio: ["ignore", "ignore", "ignore"],
  });
};

let cachedAvailable: boolean | null = null;

export async function checkTerminalNotifier(): Promise<boolean> {
  if (cachedAvailable !== null) return cachedAvailable;
  try {
    const proc = Bun.spawn(["which", "terminal-notifier"], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    const code = await proc.exited;
    cachedAvailable = code === 0;
  } catch {
    cachedAvailable = false;
  }
  if (!cachedAvailable) {
    console.warn("[desktop-notify] terminal-notifier not found. Desktop notifications disabled.");
  }
  return cachedAvailable;
}

export async function sendDesktopNotification(
  opts: DesktopNotifyOptions,
  deps: DesktopNotifyDeps = {},
): Promise<void> {
  const spawn = deps.spawn ?? defaultSpawn;
  const available = deps.available ?? (await checkTerminalNotifier());

  if (!available) return;

  const args: string[] = ["-title", opts.title, "-message", opts.message];

  if (opts.group) {
    args.push("-group", opts.group);
  }

  if (opts.execute) {
    args.push("-execute", opts.execute);
  }

  try {
    spawn(args);
  } catch (err) {
    console.warn("[desktop-notify] Failed to send notification:", err);
  }
}
