"use server";

import { sql, ensureDb } from "@/lib/db";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { compareSync, hashSync } from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { User, Session } from "@/lib/types";

const SESSION_COOKIE = "chorechart_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Session helpers ────────────────────────────────────────

async function createSession(userId: string): Promise<string> {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  await sql`INSERT INTO sessions (id, user_id, expires_at) VALUES (${id}, ${userId}, ${expiresAt})`;
  return id;
}

export async function getSession(): Promise<{ user: User } | null> {
  await ensureDb();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sessions = await sql`
    SELECT * FROM sessions WHERE id = ${token} AND expires_at > NOW()
  ` as Session[];
  const session = sessions[0];
  if (!session) return null;

  const users = await sql`SELECT * FROM users WHERE id = ${session.user_id}` as User[];
  const user = users[0];
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
  await ensureDb();
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!username || !password) return { error: "Username and password are required." };

  const users = await sql`SELECT * FROM users WHERE username = ${username}` as User[];
  const user = users[0];
  if (!user || !compareSync(password, user.password_hash)) {
    return { error: "Invalid username or password." };
  }

  const sessionId = await createSession(user.id);
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
  await ensureDb();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await sql`DELETE FROM sessions WHERE id = ${token}`;
  }
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

// ─── Password management ────────────────────────────────────

export async function changePassword(formData: FormData) {
  await ensureDb();
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
  await sql`UPDATE users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${session.user.id}`;
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
  await sql`UPDATE users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${userId}`;
  revalidatePath("/admin");
  return { success: true };
}

export async function getUsers() {
  await ensureDb();
  return await sql`
    SELECT u.id, u.username, u.role, u.child_id, u.created_at, c.name AS child_name
    FROM users u LEFT JOIN children c ON u.child_id = c.id
    ORDER BY u.role DESC, u.username ASC
  ` as (Pick<User, "id" | "username" | "role" | "child_id" | "created_at"> & { child_name: string | null })[];
}
