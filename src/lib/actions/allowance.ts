"use server";

import { sql, ensureDb, numify } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { uid, isAdminAction } from "./helpers";
import { updateAllowanceSchema } from "@/lib/schemas";
import type { Child } from "@/lib/types";

// ─── Recurring Allowance ─────────────────────────────────────

export async function updateAllowance(childId: string, amount: number, frequency: string, startDate: string) {
  const validated = updateAllowanceSchema.safeParse({ childId, amount, frequency, startDate });
  if (!validated.success) return;
  if (!(await isAdminAction())) return;
  await ensureDb();
  if (frequency === "none") {
    await sql`
      UPDATE children
      SET allowance_amount = 0, allowance_frequency = 'none', allowance_start_date = NULL, last_allowance_date = NULL, updated_at = NOW()
      WHERE id = ${childId}
    `;
  } else {
    await sql`
      UPDATE children
      SET allowance_amount = ${amount}, allowance_frequency = ${frequency}, allowance_start_date = ${startDate}, last_allowance_date = ${startDate}, updated_at = NOW()
      WHERE id = ${childId}
    `;
  }
  revalidatePath("/");
  revalidatePath(`/children/${childId}`);
  revalidatePath("/children");
  revalidatePath("/my");
}

export async function processAllowances() {
  await ensureDb();
  const rows = await sql`SELECT * FROM children WHERE allowance_frequency != 'none' AND allowance_amount > 0`;
  const children = rows.map(r => numify(r, "balance", "allowance_amount")) as Child[];
  if (children.length === 0) {
    return {
      checkedChildren: 0,
      depositedChildren: 0,
      totalDeposited: 0,
      baselineSeeded: 0,
      transactionsCreated: 0,
    };
  }

  let checkedChildren = 0;
  let depositedChildren = 0;
  let totalDeposited = 0;
  let baselineSeeded = 0;
  let transactionsCreated = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  for (const child of children) {
    checkedChildren++;
    // Skip if start date is in the future
    if (child.allowance_start_date && child.allowance_start_date > todayStr) continue;

    const lastDate = child.last_allowance_date ?? child.allowance_start_date ?? todayStr;
    let depositCount = 0;

    const last = new Date(lastDate);
    last.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - last.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (child.allowance_frequency === "weekly") {
      depositCount = Math.floor(diffDays / 7);
    } else if (child.allowance_frequency === "monthly") {
      let months = (today.getFullYear() - last.getFullYear()) * 12 + (today.getMonth() - last.getMonth());
      if (today.getDate() < last.getDate()) months--;
      depositCount = Math.max(0, months);
    }

    if (depositCount <= 0) {
      if (!child.last_allowance_date) {
        const seeded = await sql`
          UPDATE children
          SET last_allowance_date = ${lastDate}, updated_at = NOW()
          WHERE id = ${child.id} AND last_allowance_date IS NULL
          RETURNING id
        `;
        if (seeded.length > 0) baselineSeeded++;
      }
      continue;
    }

    const totalDeposit = child.allowance_amount * depositCount;
    const txnId = uid();
    const label = child.allowance_frequency === "weekly" ? "week" : "month";
    const desc = depositCount === 1
      ? `Allowance (${label}ly)`
      : `Allowance: ${depositCount} ${label}s`;

    const applied = await sql`
      WITH updated AS (
        UPDATE children
        SET balance = balance + ${totalDeposit}, last_allowance_date = ${todayStr}, updated_at = NOW()
        WHERE id = ${child.id}
          AND last_allowance_date IS NOT DISTINCT FROM ${child.last_allowance_date}
          AND allowance_amount = ${child.allowance_amount}
          AND allowance_frequency = ${child.allowance_frequency}
        RETURNING id
      ),
      logged AS (
        INSERT INTO transactions (id, child_id, amount, "type", description)
        SELECT ${txnId}, ${child.id}, ${totalDeposit}, 'allowance', ${desc}
        FROM updated
        RETURNING id
      )
      SELECT
        (SELECT COUNT(*)::int FROM updated) AS updated_count,
        (SELECT COUNT(*)::int FROM logged) AS logged_count
    `;

    const stats = applied[0] as { updated_count: number; logged_count: number } | undefined;
    const updatedCount = Number(stats?.updated_count ?? 0);
    const loggedCount = Number(stats?.logged_count ?? 0);
    if (updatedCount > 0) {
      depositedChildren += updatedCount;
      totalDeposited += totalDeposit;
      transactionsCreated += loggedCount;
    }
  }

  return { checkedChildren, depositedChildren, totalDeposited, baselineSeeded, transactionsCreated };
}
