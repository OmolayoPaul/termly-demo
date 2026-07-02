import { KEYS, read, write, type User } from "./storage";

export type Role = "admin" | "teacher" | "parent" | "student";

export type Session = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
};

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  return read<Session | null>(KEYS.currentUser, null);
}

export function setSession(s: Session) {
  write(KEYS.currentUser, s);
}

export function clearSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEYS.currentUser);
}

export const demoCreds: Record<Role, { email: string; password: string; name: string }> = {
  admin: { email: "admin@termly.com", password: "Termly2026", name: "School Administrator" },
  parent: { email: "parent@termly.com", password: "Parent2026", name: "Mr. Chidi Okonkwo" },
  teacher: { email: "teacher@termly.com", password: "Teacher2026", name: "Mr. Adewale Okafor" },
  student: { email: "student@termly.com", password: "Student2026", name: "Emeka Okonkwo" },
};

export function authenticate(email: string, password: string, role: Role): Session | null {
  const demo = demoCreds[role];
  if (email === demo.email && password === demo.password) {
    return { id: `demo-${role}`, name: demo.name, email, role };
  }
  const users = read<User[]>(KEYS.users, []);
  const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password && x.role === role);
  if (u) return { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone };
  return null;
}

export function dashboardPathFor(role: Role): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "parent") return "/parent/dashboard";
  if (role === "student") return "/student/dashboard";
  return "/teacher/dashboard";
}