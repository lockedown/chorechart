"use server";

import { sql, ensureDb, numify } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { hashSync } from "bcryptjs";
import { uid, isAdminAction } from "./helpers";
import { createChildSchema, parseFormData } from "@/lib/schemas";
import type {
  Child,
  ChoreAssignmentWithChore,
  Transaction,
  RewardClaimWithReward,
} from "@/lib/types";

// ─── Children ───────────────────────────────────────────────

export async function getChildren() {
  await ensureDb();
  const [rawChildren, rawAllChores] = await Promise.all([
    sql`SELECT * FROM children ORDER BY name ASC`,
    sql`
      SELECT ca.*, c.title AS chore_title, c.value AS chore_value, c.description AS chore_description
      FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id
      ORDER BY ca.created_at DESC
    `,
  ]);
  const children = rawChildren.map(r => numify(r, "balance", "allowance_amount")) as Child[];
  const allChores = rawAllChores.map(r => numify(r, "chore_value")) as ChoreAssignmentWithChore[];
  const choresByChild = new Map<string, ChoreAssignmentWithChore[]>();
  for (const chore of allChores) {
    const list = choresByChild.get(chore.child_id) || [];
    list.push(chore);
    choresByChild.set(chore.child_id, list);
  }
  return children.map(child => ({ ...child, assignedChores: choresByChild.get(child.id) || [] }));
}

export async function getChild(id: string) {
  await ensureDb();
  const rows = await sql`SELECT * FROM children WHERE id = ${id}`;
  const child = rows[0] ? numify(rows[0], "balance", "allowance_amount") as Child : null;
  if (!child) return null;

  const [rawAssigned, rawTxns, rawClaims] = await Promise.all([
    sql`
      SELECT ca.*, c.title AS chore_title, c.value AS chore_value, c.description AS chore_description
      FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id
      WHERE ca.child_id = ${id} ORDER BY ca.created_at DESC
    `,
    sql`SELECT * FROM transactions WHERE child_id = ${id} ORDER BY created_at DESC`,
    sql`
      SELECT rc.*, r.title AS reward_title
      FROM reward_claims rc JOIN rewards r ON rc.reward_id = r.id
      WHERE rc.child_id = ${id} ORDER BY rc.created_at DESC
    `,
  ]);
  const assignedChores = rawAssigned.map(r => numify(r, "chore_value")) as ChoreAssignmentWithChore[];
  const transactions = rawTxns.map(r => numify(r, "amount")) as Transaction[];
  const rewardClaims = rawClaims as RewardClaimWithReward[];

  return { ...child, assignedChores, transactions, rewardClaims };
}

export async function createChild(formData: FormData) {
  if (!(await isAdminAction())) return;
  const parsed = parseFormData(createChildSchema, formData);
  if (!parsed) return;
  await ensureDb();
  const { name, avatar } = parsed;
  const childId = uid();

  // Generate a unique username from the child's name
  const baseUsername = name.trim().toLowerCase().replace(/\s+/g, ".");
  let username = baseUsername;
  let suffix = 1;
  let existing = await sql`SELECT id FROM users WHERE username = ${username}`;
  while (existing.length > 0) {
    username = `${baseUsername}${suffix}`;
    suffix++;
    existing = await sql`SELECT id FROM users WHERE username = ${username}`;
  }

  const defaultPassword = hashSync(name.trim().toLowerCase(), 10);
  const userId = uid();

  await sql`INSERT INTO children (id, name, avatar) VALUES (${childId}, ${name}, ${avatar})`;
  await sql`INSERT INTO users (id, username, password_hash, role, child_id) VALUES (${userId}, ${username}, ${defaultPassword}, 'child', ${childId})`;

  revalidatePath("/");
  revalidatePath("/children");
  revalidatePath("/admin");
}

export async function deleteChild(id: string) {
  if (!(await isAdminAction())) return;
  await ensureDb();
  await sql`DELETE FROM users WHERE child_id = ${id}`;
  await sql`DELETE FROM children WHERE id = ${id}`;
  revalidatePath("/");
  revalidatePath("/children");
  revalidatePath("/admin");
}
