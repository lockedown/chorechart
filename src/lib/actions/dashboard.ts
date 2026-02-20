"use server";

import { sql, ensureDb, numify } from "@/lib/db";
import type { Child } from "@/lib/types";

// ─── Dashboard stats ────────────────────────────────────────

export async function getDashboardStats() {
  await ensureDb();
  const [rawChildren, pendingRow, choreRow, rewardRow, proposalRow, cashOutRow] = await Promise.all([
    sql`SELECT * FROM children ORDER BY name ASC`,
    sql`SELECT COUNT(*) AS cnt FROM chore_assignments WHERE status = 'completed'`,
    sql`SELECT COUNT(*) AS cnt FROM chores`,
    sql`SELECT COUNT(*) AS cnt FROM rewards`,
    sql`SELECT COUNT(*) AS cnt FROM chore_proposals WHERE status IN ('pending', 'countered')`,
    sql`SELECT COUNT(*) AS cnt FROM cash_out_requests WHERE status = 'pending'`,
  ]);
  const children = rawChildren.map(r => numify(r, "balance", "allowance_amount")) as Child[];
  const pendingApprovals = Number(pendingRow[0].cnt);
  const totalChores = Number(choreRow[0].cnt);
  const rewardCount = Number(rewardRow[0].cnt);
  const pendingProposals = Number(proposalRow[0].cnt);
  const pendingCashOuts = Number(cashOutRow[0].cnt);
  const totalBalance = children.reduce((sum, c) => sum + c.balance, 0);
  return { children, pendingApprovals, totalChores, totalBalance, rewardCount, pendingProposals, pendingCashOuts };
}
