"use server";

import { sql, ensureDb, numify } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { uid, canMutateChild, getSignedInChildId } from "./helpers";
import { createSavingsGoalSchema, parseFormData } from "@/lib/schemas";
import type { SavingsGoal } from "@/lib/types";

// ─── Savings Goals ─────────────────────────────────────────

export async function getChildSavingsGoals(childId: string) {
  await ensureDb();
  const rows = await sql`SELECT * FROM savings_goals WHERE child_id = ${childId} ORDER BY created_at DESC`;
  return rows.map(r => numify(r, "target_amount")) as SavingsGoal[];
}

export async function createSavingsGoal(formData: FormData) {
  const parsed = parseFormData(createSavingsGoalSchema, formData);
  if (!parsed) return;
  await ensureDb();
  const id = uid();
  const childId = await getSignedInChildId();
  if (!childId) return;
  if (parsed.childId && parsed.childId !== childId) return;
  const { title, targetAmount } = parsed;
  await sql`INSERT INTO savings_goals (id, child_id, title, target_amount) VALUES (${id}, ${childId}, ${title}, ${targetAmount})`;
  revalidatePath("/my");
  revalidatePath(`/children/${childId}`);
}

export async function deleteSavingsGoal(goalId: string) {
  await ensureDb();
  const rows = await sql`SELECT child_id FROM savings_goals WHERE id = ${goalId}`;
  const goal = rows[0] as { child_id: string } | undefined;
  if (!goal) return;
  if (!(await canMutateChild(goal.child_id))) return;
  await sql`DELETE FROM savings_goals WHERE id = ${goalId}`;
  revalidatePath("/my");
  revalidatePath(`/children/${goal.child_id}`);
}
