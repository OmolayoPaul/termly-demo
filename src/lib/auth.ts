export type Role = "admin" | "teacher" | "parent";

const KEY = "termly_auth";

export type Session = { role: Role; email: string };

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(window.localStorage.getItem(KEY) || "null"); } catch { return null; }
}

export function setSession(s: Session) {
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  window.localStorage.removeItem(KEY);
}

export const demoCreds: Record<Role, { email: string; password: string }> = {
  admin: { email: "admin@termly.com", password: "admin123" },
  teacher: { email: "teacher@termly.com", password: "teacher123" },
  parent: { email: "parent@termly.com", password: "parent123" },
};