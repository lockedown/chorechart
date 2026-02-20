"use server";

import { sql, ensureDb, numify } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { uid, isAdminAction, isChildOwnerAction, getSignedInChildId } from "./helpers";
import { createProposalSchema, adminCounterProposalSchema, parseFormData } from "@/lib/schemas";
import type {
  ChoreProposal,
  ChoreProposalWithChild,
  ChoreAssignmentWithChore,
} from "@/lib/types";

// ─── Chore Proposals (Barter System) ────────────────────────

export async function getChildProposals(childId: string) {
  await ensureDb();
  const rows = await sql`SELECT * FROM chore_proposals WHERE child_id = ${childId} ORDER BY created_at DESC`;
  return rows.map(r => numify(r, "requested_value", "admin_value")) as ChoreProposal[];
}

export async function createProposal(formData: FormData) {
  const parsed = parseFormData(createProposalSchema, formData);
  if (!parsed) return;
  await ensureDb();
  const id = uid();
  const childId = await getSignedInChildId();
  if (!childId) return;
  if (parsed.childId && parsed.childId !== childId) return;
  const { title, description, requestedValue } = parsed;
  await sql`INSERT INTO chore_proposals (id, child_id, title, description, requested_value) VALUES (${id}, ${childId}, ${title}, ${description}, ${requestedValue})`;
  revalidatePath("/");
  revalidatePath("/my");
  revalidatePath("/approvals");
}

export async function childAcceptCounter(proposalId: string) {
  await ensureDb();
  const rows = await sql`SELECT * FROM chore_proposals WHERE id = ${proposalId}`;
  const proposal = rows[0] ? numify(rows[0], "requested_value", "admin_value") as ChoreProposal : null;
  if (!proposal || !(await isChildOwnerAction(proposal.child_id))) return;
  if (!proposal || proposal.status !== "countered" || proposal.admin_value === null) return;

  // Accept: create a one-off chore + assignment at the agreed (admin) value
  const choreId = uid();
  const assignmentId = uid();
  await sql`INSERT INTO chores (id, title, description, value, frequency) VALUES (${choreId}, ${proposal.title}, ${proposal.description}, ${proposal.admin_value}, 'one-off')`;
  await sql`INSERT INTO chore_assignments (id, child_id, chore_id) VALUES (${assignmentId}, ${proposal.child_id}, ${choreId})`;
  await sql`UPDATE chore_proposals SET status = 'accepted', updated_at = NOW() WHERE id = ${proposalId}`;
  revalidatePath("/");
  revalidatePath("/my");
  revalidatePath("/approvals");
  revalidatePath("/chores");
  revalidatePath(`/children/${proposal.child_id}`);
}

export async function childDeclineCounter(proposalId: string) {
  await ensureDb();
  const rows = await sql`SELECT child_id FROM chore_proposals WHERE id = ${proposalId}`;
  const proposal = rows[0] as { child_id: string } | undefined;
  if (!proposal || !(await isChildOwnerAction(proposal.child_id))) return;
  await sql`UPDATE chore_proposals SET status = 'declined', updated_at = NOW() WHERE id = ${proposalId}`;
  revalidatePath("/");
  revalidatePath("/my");
  revalidatePath("/approvals");
}

export async function adminApproveProposal(proposalId: string) {
  if (!(await isAdminAction())) return;
  await ensureDb();
  const rows = await sql`SELECT * FROM chore_proposals WHERE id = ${proposalId}`;
  const proposal = rows[0] ? numify(rows[0], "requested_value", "admin_value") as ChoreProposal : null;
  if (!proposal || proposal.status !== "pending") return;

  // Approve at requested price: create chore + assignment
  const choreId = uid();
  const assignmentId = uid();
  await sql`INSERT INTO chores (id, title, description, value, frequency) VALUES (${choreId}, ${proposal.title}, ${proposal.description}, ${proposal.requested_value}, 'one-off')`;
  await sql`INSERT INTO chore_assignments (id, child_id, chore_id) VALUES (${assignmentId}, ${proposal.child_id}, ${choreId})`;
  await sql`UPDATE chore_proposals SET status = 'accepted', updated_at = NOW() WHERE id = ${proposalId}`;
  revalidatePath("/");
  revalidatePath("/my");
  revalidatePath("/approvals");
  revalidatePath("/chores");
  revalidatePath(`/children/${proposal.child_id}`);
}

export async function adminCounterProposal(formData: FormData) {
  if (!(await isAdminAction())) return;
  const parsed = parseFormData(adminCounterProposalSchema, formData);
  if (!parsed) return;
  await ensureDb();
  const { proposalId, adminValue } = parsed;
  await sql`UPDATE chore_proposals SET admin_value = ${adminValue}, status = 'countered', updated_at = NOW() WHERE id = ${proposalId}`;
  revalidatePath("/");
  revalidatePath("/my");
  revalidatePath("/approvals");
}

export async function adminRejectProposal(proposalId: string) {
  if (!(await isAdminAction())) return;
  await ensureDb();
  await sql`UPDATE chore_proposals SET status = 'rejected', updated_at = NOW() WHERE id = ${proposalId}`;
  revalidatePath("/");
  revalidatePath("/my");
  revalidatePath("/approvals");
}

export async function getPendingApprovals() {
  if (!(await isAdminAction())) return { choreApprovals: [], proposals: [] };
  await ensureDb();
  const [rawApprovals, rawProposals] = await Promise.all([
    sql`
      SELECT ca.*, c.title AS chore_title, c.value AS chore_value, ch.name AS child_name, ch.id AS child_id, ch.avatar AS child_avatar
      FROM chore_assignments ca
      JOIN chores c ON ca.chore_id = c.id
      JOIN children ch ON ca.child_id = ch.id
      WHERE ca.status = 'completed'
      ORDER BY ca.completed_at DESC
    `,
    sql`
      SELECT cp.*, ch.name AS child_name
      FROM chore_proposals cp
      JOIN children ch ON cp.child_id = ch.id
      WHERE cp.status IN ('pending')
      ORDER BY cp.created_at DESC
    `,
  ]);
  const choreApprovals = rawApprovals.map(r => numify(r, "chore_value")) as (ChoreAssignmentWithChore & { child_name: string; child_avatar: string })[];
  const proposals = rawProposals.map(r => numify(r, "requested_value", "admin_value")) as ChoreProposalWithChild[];
  return { choreApprovals, proposals };
}
