"use server";

import { sql, ensureDb, numify } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { uid, isAdminAction, canMutateChild, getSignedInChildId } from "./helpers";
import { requestCashOutSchema } from "@/lib/schemas";
import type { CashOutRequest, CashOutRequestWithChild } from "@/lib/types";

// ─── Cash-Out Requests ───────────────────────────────────────

export async function requestCashOut(childId: string, amount: number) {
  const validated = requestCashOutSchema.safeParse({ childId, amount });
  if (!validated.success) return;
  const targetChildId = await getSignedInChildId();
  if (!targetChildId) return;
  if (childId !== targetChildId) return;
  await ensureDb();

  const reqId = uid();
  const txnId = uid();
  const negAmount = -amount;
  const desc = `Cash-out request: £${amount.toFixed(2)}`;

  const applied = await sql`
    WITH debited AS (
      UPDATE children
      SET balance = balance - ${amount}, updated_at = NOW()
      WHERE id = ${targetChildId} AND balance >= ${amount}
      RETURNING id
    ),
    requested AS (
      INSERT INTO cash_out_requests (id, child_id, amount)
      SELECT ${reqId}, ${targetChildId}, ${amount}
      FROM debited
      RETURNING id
    ),
    logged AS (
      INSERT INTO transactions (id, child_id, amount, "type", description)
      SELECT ${txnId}, ${targetChildId}, ${negAmount}, 'cash_out', ${desc}
      FROM debited
      RETURNING id
    )
    SELECT id FROM debited
  `;
  if (applied.length === 0) return;

  revalidatePath("/");
  revalidatePath(`/children/${targetChildId}`);
  revalidatePath("/my");
  revalidatePath("/approvals");
}

export async function getChildCashOutRequests(childId: string): Promise<CashOutRequest[]> {
  if (!(await canMutateChild(childId))) return [];
  await ensureDb();
  const rows = await sql`SELECT * FROM cash_out_requests WHERE child_id = ${childId} ORDER BY created_at DESC`;
  return rows.map(r => numify(r, "amount")) as CashOutRequest[];
}

export async function getPendingCashOuts(): Promise<CashOutRequestWithChild[]> {
  if (!(await isAdminAction())) return [];
  await ensureDb();
  const rows = await sql`
    SELECT co.*, ch.name AS child_name, ch.avatar AS child_avatar
    FROM cash_out_requests co
    JOIN children ch ON co.child_id = ch.id
    WHERE co.status = 'pending'
    ORDER BY co.created_at DESC
  `;
  return rows.map(r => numify(r, "amount")) as CashOutRequestWithChild[];
}

export async function approveCashOut(requestId: string) {
  if (!(await isAdminAction())) return;
  await ensureDb();
  await sql`UPDATE cash_out_requests SET status = 'approved', resolved_at = NOW() WHERE id = ${requestId} AND status = 'pending'`;
  revalidatePath("/approvals");
  revalidatePath("/my");
}

export async function rejectCashOut(requestId: string) {
  if (!(await isAdminAction())) return;
  await ensureDb();
  const txnId = uid();
  const rows = await sql`
    WITH rejected AS (
      UPDATE cash_out_requests
      SET status = 'rejected', resolved_at = NOW()
      WHERE id = ${requestId} AND status = 'pending'
      RETURNING child_id, amount
    ),
    refunded AS (
      UPDATE children c
      SET balance = c.balance + r.amount, updated_at = NOW()
      FROM rejected r
      WHERE c.id = r.child_id
      RETURNING c.id
    ),
    logged AS (
      INSERT INTO transactions (id, child_id, amount, "type", description)
      SELECT
        ${txnId},
        r.child_id,
        r.amount,
        'refund',
        'Cash-out rejected: £' || TO_CHAR(r.amount::numeric, 'FM999999990.00') || ' refunded'
      FROM rejected r
      RETURNING id
    )
    SELECT child_id, amount FROM rejected
  `;
  const req = rows[0] ? numify(rows[0], "amount") as Pick<CashOutRequest, "child_id" | "amount"> : undefined;
  if (!req) return;

  revalidatePath("/");
  revalidatePath(`/children/${req.child_id}`);
  revalidatePath("/my");
  revalidatePath("/approvals");
}
