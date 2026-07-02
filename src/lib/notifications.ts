const STATE_KEY = "termly_savings_notif_state";

type SavingsNotifState = "low" | "normal" | "reached";

function readStateMap(): Record<string, SavingsNotifState> {
  if (typeof window === "undefined") return {};
  try {
    const v = window.localStorage.getItem(STATE_KEY);
    return v ? (JSON.parse(v) as Record<string, SavingsNotifState>) : {};
  } catch {
    return {};
  }
}

function writeStateMap(map: Record<string, SavingsNotifState>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STATE_KEY, JSON.stringify(map));
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  const result = await Notification.requestPermission();
  return result;
}

export function sendBrowserNotification(title: string, body: string, tag?: string) {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/logo.png",
      tag,
    });
  } catch {
    // some browsers throw if used outside a service worker in certain contexts — ignore
  }
}

function pctFor(balance: number, goal: number): number {
  return goal > 0 ? Math.min(100, Math.round((balance / goal) * 100)) : 0;
}

function classify(pct: number): SavingsNotifState {
  if (pct >= 100) return "reached";
  if (pct < 25) return "low";
  return "normal";
}

export function checkAndNotifySavingsThreshold(opts: {
  studentId: string;
  studentName: string;
  balance: number;
  goal: number;
}) {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  const pct = pctFor(opts.balance, opts.goal);
  const nextState = classify(pct);
  const map = readStateMap();
  const prevState = map[opts.studentId];

  if (prevState === nextState) return;

  if (nextState === "reached" && prevState !== "reached") {
    sendBrowserNotification(
      "🎉 Savings Goal Reached!",
      `${opts.studentName}'s savings now fully covers the fee goal.`,
      `savings-${opts.studentId}`,
    );
  } else if (nextState === "low" && prevState !== "low") {
    sendBrowserNotification(
      "⚠️ Low Savings Alert",
      `${opts.studentName}'s savings balance is running low — top up to stay on track.`,
      `savings-${opts.studentId}`,
    );
  }

  map[opts.studentId] = nextState;
  writeStateMap(map);
}
