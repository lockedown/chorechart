"use server";

import { sql, ensureDb, numify } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { uid, isAdminAction } from "./helpers";
import { approveChore } from "./chores";
import { adminSetBalanceSchema, adminUpdateChoreSchema, adminUpdateRewardSchema, adminOverrideAssignmentSchema, parseFormData } from "@/lib/schemas";
import type {
  Child,
  Chore,
  ChoreAssignmentWithChore,
  Transaction,
  Reward,
  RewardClaimWithReward,
} from "@/lib/types";

// ─── Admin ──────────────────────────────────────────────────

export async function adminResetAllBalances() {
  if (!(await isAdminAction())) return;
  await ensureDb();
  await sql`UPDATE children SET balance = 0, updated_at = NOW()`;
  await sql`DELETE FROM transactions`;
  revalidatePath("/");
  revalidatePath("/children");
  revalidatePath("/admin");
}

export async function adminSetBalance(formData: FormData) {
  if (!(await isAdminAction())) return;
  const parsed = parseFormData(adminSetBalanceSchema, formData);
  if (!parsed) return;
  await ensureDb();
  const { childId, balance: newBalance } = parsed;

  const txnId = uid();
  const desc = `Admin adjustment: balance set to £${newBalance.toFixed(2)}`;

  await sql`
    WITH old AS (
      SELECT id, balance FROM children WHERE id = ${childId}
    ),
    updated AS (
      UPDATE children
      SET balance = ${newBalance}, updated_at = NOW()
      WHERE id = ${childId}
      RETURNING id
    ),
    logged AS (
      INSERT INTO transactions (id, child_id, amount, "type", description)
      SELECT ${txnId}, ${childId}, ${newBalance} - o.balance, 'admin', ${desc}
      FROM old o
      RETURNING id
    )
    SELECT id FROM updated
  `;

  revalidatePath("/");
  revalidatePath(`/children/${childId}`);
  revalidatePath("/admin");
}

export async function adminUpdateChore(formData: FormData) {
  if (!(await isAdminAction())) return;
  const parsed = parseFormData(adminUpdateChoreSchema, formData);
  if (!parsed) return;
  await ensureDb();
  const { choreId, title, value, frequency, description } = parsed;

  await sql`UPDATE chores SET title = ${title}, description = ${description}, value = ${value}, frequency = ${frequency}, updated_at = NOW() WHERE id = ${choreId}`;
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/admin");
}

export async function adminUpdateReward(formData: FormData) {
  if (!(await isAdminAction())) return;
  const parsed = parseFormData(adminUpdateRewardSchema, formData);
  if (!parsed) return;
  await ensureDb();
  const { rewardId, title, cost, icon, description } = parsed;

  await sql`UPDATE rewards SET title = ${title}, description = ${description}, cost = ${cost}, icon = ${icon}, updated_at = NOW() WHERE id = ${rewardId}`;
  revalidatePath("/");
  revalidatePath("/rewards");
  revalidatePath("/admin");
}

export async function adminOverrideAssignment(formData: FormData) {
  if (!(await isAdminAction())) return;
  const parsed = parseFormData(adminOverrideAssignmentSchema, formData);
  if (!parsed) return;
  await ensureDb();
  const { assignmentId, status: newStatus } = parsed;

  if (newStatus === "approved") {
    await approveChore(assignmentId);
  } else if (newStatus === "completed") {
    await sql`UPDATE chore_assignments SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = ${assignmentId}`;
  } else {
    await sql`UPDATE chore_assignments SET status = 'pending', completed_at = NULL, approved_at = NULL, updated_at = NOW() WHERE id = ${assignmentId}`;
  }
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/admin");
}

export async function adminDeleteAssignment(assignmentId: string) {
  if (!(await isAdminAction())) return;
  await ensureDb();
  await sql`DELETE FROM chore_assignments WHERE id = ${assignmentId}`;
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/admin");
}

export async function adminDeleteTransaction(transactionId: string) {
  if (!(await isAdminAction())) return;
  await ensureDb();
  const txnId = uid();

  const rows = await sql`
    WITH target AS (
      SELECT id, child_id, amount FROM transactions WHERE id = ${transactionId}
    ),
    reversed AS (
      UPDATE children
      SET balance = balance - t.amount, updated_at = NOW()
      FROM target t
      WHERE children.id = t.child_id
      RETURNING children.id
    ),
    deleted AS (
      DELETE FROM transactions WHERE id = ${transactionId}
      RETURNING child_id
    )
    SELECT child_id FROM deleted
  `;
  const result = rows[0] as { child_id: string } | undefined;
  if (!result) return;

  revalidatePath("/");
  revalidatePath(`/children/${result.child_id}`);
  revalidatePath("/admin");
}

export async function adminDeleteAllAssignments() {
  if (!(await isAdminAction())) return;
  await ensureDb();
  await sql`DELETE FROM chore_assignments`;
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/admin");
}

export async function adminGetAllData() {
  if (!(await isAdminAction())) {
    return { children: [], chores: [], assignments: [], transactions: [], rewards: [], rewardClaims: [] };
  }
  await ensureDb();
  const [rawChildren, rawChores, rawAssignments, rawTransactions, rawRewards, rawClaims] = await Promise.all([
    sql`SELECT * FROM children ORDER BY name ASC`,
    sql`SELECT * FROM chores ORDER BY title ASC`,
    sql`
      SELECT ca.*, c.title AS chore_title, c.value AS chore_value, ch.name AS child_name
      FROM chore_assignments ca
      JOIN chores c ON ca.chore_id = c.id
      JOIN children ch ON ca.child_id = ch.id
      ORDER BY ca.created_at DESC
    `,
    sql`
      SELECT t.*, ch.name AS child_name
      FROM transactions t JOIN children ch ON t.child_id = ch.id
      ORDER BY t.created_at DESC
    `,
    sql`SELECT * FROM rewards ORDER BY title ASC`,
    sql`
      SELECT rc.*, r.title AS reward_title, ch.name AS child_name
      FROM reward_claims rc
      JOIN rewards r ON rc.reward_id = r.id
      JOIN children ch ON rc.child_id = ch.id
      ORDER BY rc.created_at DESC
    `,
  ]);
  const children = rawChildren.map(r => numify(r, "balance", "allowance_amount")) as Child[];
  const chores = rawChores.map(r => numify(r, "value")) as Chore[];
  const assignments = rawAssignments.map(r => numify(r, "chore_value")) as (ChoreAssignmentWithChore & { child_name: string })[];
  const transactions = rawTransactions.map(r => numify(r, "amount")) as (Transaction & { child_name: string })[];
  const rewards = rawRewards.map(r => numify(r, "cost")) as Reward[];
  const rewardClaims = rawClaims as (RewardClaimWithReward & { child_name: string })[];

  return { children, chores, assignments, transactions, rewards, rewardClaims };
}

export async function adminNukeDatabase() {
  if (!(await isAdminAction())) return;
  await ensureDb();
  await sql`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role != 'admin')`;
  await sql`DELETE FROM users WHERE role != 'admin'`;
  await sql`DELETE FROM reward_claims`;
  await sql`DELETE FROM transactions`;
  await sql`DELETE FROM chore_assignments`;
  await sql`DELETE FROM rewards`;
  await sql`DELETE FROM chores`;
  await sql`DELETE FROM children`;
  revalidatePath("/");
  revalidatePath("/children");
  revalidatePath("/chores");
  revalidatePath("/rewards");
  revalidatePath("/admin");
}
