"use server";

import { sql, ensureDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { uid, isAdminAction } from "./helpers";
import { addTransactionSchema, parseFormData } from "@/lib/schemas";

// ─── Transactions (manual bonus / deduction) ───────────────

export async function addTransaction(formData: FormData) {
  if (!(await isAdminAction())) return;
  const parsed = parseFormData(addTransactionSchema, formData);
  if (!parsed) return;
  await ensureDb();
  const id = uid();
  const { childId, amount, type, description } = parsed;

  const balanceChange = type === "deduction" || type === "spend" ? -Math.abs(amount) : Math.abs(amount);

  const applied = await sql`
    WITH updated AS (
      UPDATE children
      SET balance = balance + ${balanceChange}, updated_at = NOW()
      WHERE id = ${childId}
      RETURNING id
    ),
    logged AS (
      INSERT INTO transactions (id, child_id, amount, "type", description)
      SELECT ${id}, ${childId}, ${balanceChange}, ${type}, ${description}
      FROM updated
      RETURNING id
    )
    SELECT id FROM updated
  `;
  if (applied.length === 0) return;

  revalidatePath("/");
  revalidatePath(`/children/${childId}`);
}
