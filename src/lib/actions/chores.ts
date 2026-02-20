"use server";

import { sql, ensureDb, numify } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { uid, isAdminAction, canMutateChild } from "./helpers";
import { createChoreSchema, assignChoreSchema, parseFormData } from "@/lib/schemas";
import type {
  Chore,
  ChoreAssignmentWithChild,
} from "@/lib/types";

// ─── Chores ─────────────────────────────────────────────────

export async function getChores() {
  await ensureDb();
  const [rawChores, rawAllAssignments] = await Promise.all([
    sql`SELECT * FROM chores ORDER BY title ASC`,
    sql`
      SELECT ca.*, ch.name AS child_name
      FROM chore_assignments ca JOIN children ch ON ca.child_id = ch.id
    `,
  ]);
  const chores = rawChores.map(r => numify(r, "value")) as Chore[];
  const allAssignments = rawAllAssignments as ChoreAssignmentWithChild[];
  const assignmentsByChore = new Map<string, ChoreAssignmentWithChild[]>();
  for (const a of allAssignments) {
    const list = assignmentsByChore.get(a.chore_id) || [];
    list.push(a);
    assignmentsByChore.set(a.chore_id, list);
  }
  return chores.map(chore => ({ ...chore, assignments: assignmentsByChore.get(chore.id) || [] }));
}

export async function createChore(formData: FormData) {
  if (!(await isAdminAction())) return;
  const parsed = parseFormData(createChoreSchema, formData);
  if (!parsed) return;
  await ensureDb();
  const id = uid();
  const { title, description, value, frequency, dayOfWeek } = parsed;
  await sql`INSERT INTO chores (id, title, description, value, frequency, day_of_week) VALUES (${id}, ${title}, ${description}, ${value}, ${frequency}, ${dayOfWeek})`;
  revalidatePath("/");
  revalidatePath("/chores");
}

export async function deleteChore(id: string) {
  if (!(await isAdminAction())) return;
  await ensureDb();
  await sql`DELETE FROM chores WHERE id = ${id}`;
  revalidatePath("/");
  revalidatePath("/chores");
}

// ─── Chore Assignments ─────────────────────────────────────

export async function assignChore(formData: FormData) {
  if (!(await isAdminAction())) return;
  const parsed = parseFormData(assignChoreSchema, formData);
  if (!parsed) return;
  await ensureDb();
  const { childId, choreId, endDate: endDateStr, dueDate: dueDateStr } = parsed;

  // Look up the chore to determine frequency
  const choreRows = await sql`SELECT * FROM chores WHERE id = ${choreId}`;
  const chore = choreRows[0] ? numify(choreRows[0], "value") as Chore : null;
  if (!chore) return;

  const sourceId = uid();

  if (chore.frequency === "daily" && endDateStr) {
    // Generate one assignment per day from today to end date
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const id = uid();
      await sql`INSERT INTO chore_assignments (id, child_id, chore_id, due_date, end_date, recurrence_source_id) VALUES (${id}, ${childId}, ${choreId}, ${dateStr}, ${endDateStr}, ${sourceId})`;
    }
  } else if (chore.frequency === "weekly" && endDateStr && chore.day_of_week !== null) {
    // Generate one assignment per matching weekday from today to end date
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === chore.day_of_week) {
        const dateStr = d.toISOString().split("T")[0];
        const id = uid();
        await sql`INSERT INTO chore_assignments (id, child_id, chore_id, due_date, end_date, recurrence_source_id) VALUES (${id}, ${childId}, ${choreId}, ${dateStr}, ${endDateStr}, ${sourceId})`;
      }
    }
  } else {
    // One-off: single assignment with optional date
    const dueDate = dueDateStr || null;
    const id = uid();
    await sql`INSERT INTO chore_assignments (id, child_id, chore_id, due_date) VALUES (${id}, ${childId}, ${choreId}, ${dueDate})`;
  }

  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath(`/children/${childId}`);
}

export async function markChoreDone(assignmentId: string) {
  await ensureDb();
  const rows = await sql`SELECT child_id FROM chore_assignments WHERE id = ${assignmentId} AND status = 'pending'`;
  const assignment = rows[0] as { child_id: string } | undefined;
  if (!assignment) return;
  if (!(await canMutateChild(assignment.child_id))) return;

  await sql`UPDATE chore_assignments SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = ${assignmentId} AND status = 'pending'`;
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/my");
  revalidatePath(`/children/${assignment.child_id}`);
}

export async function approveChore(assignmentId: string) {
  if (!(await isAdminAction())) return;
  await ensureDb();
  const txnId = uid();
  const rows = await sql`
    WITH updated AS (
      UPDATE chore_assignments ca
      SET status = 'approved', approved_at = NOW(), updated_at = NOW()
      FROM chores c
      WHERE ca.id = ${assignmentId}
        AND ca.status = 'completed'
        AND c.id = ca.chore_id
      RETURNING ca.child_id, c.value AS chore_value, c.title AS chore_title
    ),
    credited AS (
      UPDATE children ch
      SET balance = ch.balance + u.chore_value, updated_at = NOW()
      FROM updated u
      WHERE ch.id = u.child_id
      RETURNING ch.id
    ),
    logged AS (
      INSERT INTO transactions (id, child_id, amount, "type", description)
      SELECT ${txnId}, u.child_id, u.chore_value, 'earn', 'Completed: ' || u.chore_title
      FROM updated u
      RETURNING id
    )
    SELECT child_id FROM updated
  `;
  const assignment = rows[0] as { child_id: string } | undefined;
  if (!assignment) return;

  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/approvals");
  revalidatePath(`/children/${assignment.child_id}`);
}
