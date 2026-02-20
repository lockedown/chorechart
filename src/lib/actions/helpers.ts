"use server";

import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import type { User } from "@/lib/types";

export function uid() {
  return randomUUID();
}

export async function getActionUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export async function isAdminAction(): Promise<boolean> {
  const user = await getActionUser();
  return !!user && user.role === "admin";
}

export async function canMutateChild(childId: string): Promise<boolean> {
  const user = await getActionUser();
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.child_id === childId;
}

export async function isChildOwnerAction(childId: string): Promise<boolean> {
  const user = await getActionUser();
  return !!user && user.role === "child" && user.child_id === childId;
}

export async function getSignedInChildId(): Promise<string | null> {
  const user = await getActionUser();
  if (!user || user.role !== "child" || !user.child_id) return null;
  return user.child_id;
}
