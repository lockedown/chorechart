"use server";

import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { compareSync, hashSync } from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { User, Session } from "@/lib/types";

const SESSION_COOKIE = "chorechart_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Session helpers ────────────────────────────────────────

function createSession(userId: string): string {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(id, userId, expiresAt);
  return id;
}

export async function getSession(): Promise<{ user: User } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = db.prepare(
    "SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')"
  ).get(token) as Session | undefined;
  if (!session) return null;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user_id) as User | undefined;
  if (!user) return null;

  return { user };
}

export async function requireAuth(): Promise<User> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== "admin") redirect("/");
  return user;
}

// ─── Login / Logout ─────────────────────────────────────────

export async function login(formData: FormData) {
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!username || !password) return { error: "Username and password are required." };

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as User | undefined;
  if (!user || !compareSync(password, user.password_hash)) {
    return { error: "Invalid username or password." };
  }

  const sessionId = createSession(user.id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });

  if (user.role === "admin") {
    redirect("/");
  } else {
    redirect(`/my`);
  }
}

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
  }
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

// ─── Password management ────────────────────────────────────

export async function changePassword(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword) return { error: "All fields are required." };
  if (newPassword.length < 4) return { error: "New password must be at least 4 characters." };
  if (newPassword !== confirmPassword) return { error: "Passwords do not match." };
  if (!compareSync(currentPassword, session.user.password_hash)) {
    return { error: "Current password is incorrect." };
  }

  const hash = hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, session.user.id);
  revalidatePath("/admin");
  return { success: true };
}

// ─── Admin user management ──────────────────────────────────

export async function adminResetUserPassword(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const newPassword = formData.get("newPassword") as string;
  if (!userId || !newPassword || newPassword.length < 4) return { error: "Invalid input." };

  const hash = hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, userId);
  revalidatePath("/admin");
  return { success: true };
}

export async function getUsers() {
  return db.prepare(
    `SELECT u.id, u.username, u.role, u.child_id, u.created_at, c.name AS child_name
     FROM users u LEFT JOIN children c ON u.child_id = c.id
     ORDER BY u.role DESC, u.username ASC`
  ).all() as (Pick<User, "id" | "username" | "role" | "child_id" | "created_at"> & { child_name: string | null })[];
}
