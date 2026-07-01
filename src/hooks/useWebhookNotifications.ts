import { useCallback, useEffect, useRef, useState } from "react";

export interface RecentWebhookEvent {
  orderReference: string;
  transactionRef: string;
  amount: number;
  status: string;
  type: string;
  receivedAt: number;
}

const STORAGE_KEY = "termly_notif_seen_at";
const POLL_INTERVAL = 30_000;

function getLastSeenAt(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function setLastSeenAt(ts: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(ts));
  } catch {
    // ignore
  }
}

export function useWebhookNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [events, setEvents] = useState<RecentWebhookEvent[]>([]);
  const lastSeenRef = useRef<number>(getLastSeenAt());

  const fetchRecent = useCallback(async () => {
    try {
      const since = lastSeenRef.current;
      const res = await fetch(`/api/webhooks/recent?since=${since}`);
      if (!res.ok) return;
      const data: { events: RecentWebhookEvent[]; count: number } = await res.json();
      setEvents(data.events);
      setUnreadCount(data.count);
    } catch {
      // network error — swallow silently
    }
  }, []);

  useEffect(() => {
    fetchRecent();
    const id = setInterval(fetchRecent, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchRecent]);

  const dismiss = useCallback(() => {
    const now = Date.now();
    lastSeenRef.current = now;
    setLastSeenAt(now);
    setUnreadCount(0);
    setEvents([]);
  }, []);

  return { unreadCount, events, dismiss };
}
