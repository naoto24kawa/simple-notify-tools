import { useEffect, useRef, useState } from "react";

interface SSEOptions {
  url: string;
  onMessage?: (event: string, data: string) => void;
}

export function useSSE({ url, onMessage }: SSEOptions) {
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    const handleEvent = (type: string) => (event: MessageEvent) => {
      onMessageRef.current?.(type, event.data);
    };

    eventSource.addEventListener("created", handleEvent("created"));
    eventSource.addEventListener("read", handleEvent("read"));
    eventSource.addEventListener("deleted", handleEvent("deleted"));
    eventSource.addEventListener("updated", handleEvent("updated"));

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [url]);

  return { connected };
}
