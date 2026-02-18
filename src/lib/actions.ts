"use server";

import { sql, ensureDb, numify } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { hashSync } from "bcryptjs";
import type {
  Child,
  Chore,
  ChoreAssignmentWithChore,
  ChoreAssignmentWithChild,
  Transaction,
  Reward,
  RewardClaimWithReward,
  RewardWithClaimCount,
  User,
  ChoreProposal,
  ChoreProposalWithChild,
  SavingsGoal,
} from "@/lib/types";

function uid() {
  return randomUUID();
}

// ─── Children ───────────────────────────────────────────────

export async function getChildren() {
  await ensureDb();
  const rawChildren = await sql`SELECT * FROM children ORDER BY name ASC`;
  const children = rawChildren.map(r => numify(r, "balance")) as Child[];
  const result = [];
  for (const child of children) {
    const rawChores = await sql`
      SELECT ca.*, c.title AS chore_title, c.value AS chore_value, c.description AS chore_description
      FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id
      WHERE ca.child_id = ${child.id} ORDER BY ca.created_at DESC
    `;
    const assignedChores = rawChores.map(r => numify(r, "chore_value")) as ChoreAssignmentWithChore[];
    result.push({ ...child, assignedChores });
  }
  return result;
}

export async function getChild(id: string) {
  await ensureDb();
  const rows = await sql`SELECT * FROM children WHERE id = ${id}`;
  const child = rows[0] ? numify(rows[0], "balance") as Child : null;
  if (!child) return null;

  const rawAssigned = await sql`
    SELECT ca.*, c.title AS chore_title, c.value AS chore_value, c.description AS chore_description
    FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id
    WHERE ca.child_id = ${id} ORDER BY ca.created_at DESC
  `;
  const assignedChores = rawAssigned.map(r => numify(r, "chore_value")) as ChoreAssignmentWithChore[];

  const rawTxns = await sql`
    SELECT * FROM transactions WHERE child_id = ${id} ORDER BY created_at DESC
  `;
  const transactions = rawTxns.map(r => numify(r, "amount")) as Transaction[];

  const rewardClaims = await sql`
    SELECT rc.*, r.title AS reward_title
    FROM reward_claims rc JOIN rewards r ON rc.reward_id = r.id
    WHERE rc.child_id = ${id} ORDER BY rc.created_at DESC
  ` as RewardClaimWithReward[];

  return { ...child, assignedChores, transactions, rewardClaims };
}

export async function createChild(formData: FormData) {
  await ensureDb();
  const name = formData.get("name") as string;
  const avatar = (formData.get("avatar") as string) || "";
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
  await ensureDb();
  await sql`DELETE FROM users WHERE child_id = ${id}`;
  await sql`DELETE FROM children WHERE id = ${id}`;
  revalidatePath("/");
  revalidatePath("/children");
  revalidatePath("/admin");
}

// ─── Chores ─────────────────────────────────────────────────

export async function getChores() {
  await ensureDb();
  const rawChores = await sql`SELECT * FROM chores ORDER BY title ASC`;
  const chores = rawChores.map(r => numify(r, "value")) as Chore[];
  const result = [];
  for (const chore of chores) {
    const assignments = await sql`
      SELECT ca.*, ch.name AS child_name
      FROM chore_assignments ca JOIN children ch ON ca.child_id = ch.id
      WHERE ca.chore_id = ${chore.id}
    ` as ChoreAssignmentWithChild[];
    result.push({ ...chore, assignments });
  }
  return result;
}

export async function createChore(formData: FormData) {
  await ensureDb();
  const id = uid();
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const value = parseFloat(formData.get("value") as string) || 0;
  const frequency = (formData.get("frequency") as string) || "one-off";
  const dayOfWeekRaw = formData.get("dayOfWeek") as string;
  const dayOfWeek = frequency === "weekly" && dayOfWeekRaw !== "" ? parseInt(dayOfWeekRaw) : null;
  await sql`INSERT INTO chores (id, title, description, value, frequency, day_of_week) VALUES (${id}, ${title}, ${description}, ${value}, ${frequency}, ${dayOfWeek})`;
  revalidatePath("/");
  revalidatePath("/chores");
}

export async function deleteChore(id: string) {
  await ensureDb();
  await sql`DELETE FROM chores WHERE id = ${id}`;
  revalidatePath("/");
  revalidatePath("/chores");
}

// ─── Chore Assignments ─────────────────────────────────────

export async function assignChore(formData: FormData) {
  await ensureDb();
  const childId = formData.get("childId") as string;
  const choreId = formData.get("choreId") as string;
  const endDateStr = formData.get("endDate") as string;
  const dueDateStr = formData.get("dueDate") as string;

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
  await sql`UPDATE chore_assignments SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = ${assignmentId}`;
  revalidatePath("/");
  revalidatePath("/chores");
}

export async function approveChore(assignmentId: string) {
  await ensureDb();
  const rows = await sql`
    SELECT ca.*, c.value AS chore_value, c.title AS chore_title
    FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id
    WHERE ca.id = ${assignmentId}
  `;
  const assignment = rows[0] ? numify(rows[0], "chore_value") as (ChoreAssignmentWithChore & { chore_value: number; chore_title: string }) : undefined;
  if (!assignment) return;

  const txnId = uid();
  await sql`UPDATE chore_assignments SET status = 'approved', approved_at = NOW(), updated_at = NOW() WHERE id = ${assignmentId}`;
  await sql`UPDATE children SET balance = balance + ${assignment.chore_value}, updated_at = NOW() WHERE id = ${assignment.child_id}`;
  const desc = `Completed: ${assignment.chore_title}`;
  await sql`INSERT INTO transactions (id, child_id, amount, "type", description) VALUES (${txnId}, ${assignment.child_id}, ${assignment.chore_value}, 'earn', ${desc})`;

  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath(`/children/${assignment.child_id}`);
}

// ─── Transactions (manual bonus / deduction) ───────────────

export async function addTransaction(formData: FormData) {
  await ensureDb();
  const id = uid();
  const childId = formData.get("childId") as string;
  const amount = parseFloat(formData.get("amount") as string) || 0;
  const type = formData.get("type") as string;
  const description = (formData.get("description") as string) || "";

  const balanceChange = type === "deduction" || type === "spend" ? -Math.abs(amount) : Math.abs(amount);

  await sql`INSERT INTO transactions (id, child_id, amount, "type", description) VALUES (${id}, ${childId}, ${balanceChange}, ${type}, ${description})`;
  await sql`UPDATE children SET balance = balance + ${balanceChange}, updated_at = NOW() WHERE id = ${childId}`;

  revalidatePath("/");
  revalidatePath(`/children/${childId}`);
}

// ─── Rewards ────────────────────────────────────────────────

export async function getRewards() {
  await ensureDb();
  const rawRewards = await sql`SELECT * FROM rewards ORDER BY title ASC`;
  const rewards = rawRewards.map(r => numify(r, "cost")) as Reward[];
  const result = [];
  for (const reward of rewards) {
    const row = await sql`SELECT COUNT(*) AS claim_count FROM reward_claims WHERE reward_id = ${reward.id}`;
    result.push({ ...reward, claim_count: Number(row[0].claim_count) } as RewardWithClaimCount);
  }
  return result;
}

export async function createReward(formData: FormData) {
  await ensureDb();
  const id = uid();
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const cost = parseFloat(formData.get("cost") as string) || 0;
  const icon = (formData.get("icon") as string) || "";
  await sql`INSERT INTO rewards (id, title, description, cost, icon) VALUES (${id}, ${title}, ${description}, ${cost}, ${icon})`;
  revalidatePath("/");
  revalidatePath("/rewards");
}

export async function deleteReward(id: string) {
  await ensureDb();
  await sql`DELETE FROM rewards WHERE id = ${id}`;
  revalidatePath("/");
  revalidatePath("/rewards");
}

export async function claimReward(childId: string, rewardId: string) {
  await ensureDb();
  const rewardRows = await sql`SELECT * FROM rewards WHERE id = ${rewardId}`;
  const childRows = await sql`SELECT * FROM children WHERE id = ${childId}`;
  const reward = rewardRows[0] ? numify(rewardRows[0], "cost") as Reward : undefined;
  const child = childRows[0] ? numify(childRows[0], "balance") as Child : undefined;
  if (!reward || !child || child.balance < reward.cost) return;

  const claimId = uid();
  const txnId = uid();
  const negCost = -reward.cost;
  const desc = `Claimed reward: ${reward.title}`;
  await sql`INSERT INTO reward_claims (id, child_id, reward_id) VALUES (${claimId}, ${childId}, ${rewardId})`;
  await sql`UPDATE children SET balance = balance - ${reward.cost}, updated_at = NOW() WHERE id = ${childId}`;
  await sql`INSERT INTO transactions (id, child_id, amount, "type", description) VALUES (${txnId}, ${childId}, ${negCost}, 'spend', ${desc})`;

  revalidatePath("/");
  revalidatePath(`/children/${childId}`);
  revalidatePath("/rewards");
}

// ─── Admin ──────────────────────────────────────────────────

export async function adminResetAllBalances() {
  await ensureDb();
  await sql`UPDATE children SET balance = 0, updated_at = NOW()`;
  await sql`DELETE FROM transactions`;
  revalidatePath("/");
  revalidatePath("/children");
  revalidatePath("/admin");
}

export async function adminSetBalance(formData: FormData) {
  await ensureDb();
  const childId = formData.get("childId") as string;
  const newBalance = parseFloat(formData.get("balance") as string);
  if (isNaN(newBalance)) return;

  const childRows = await sql`SELECT * FROM children WHERE id = ${childId}`;
  const child = childRows[0] ? numify(childRows[0], "balance") as Child : undefined;
  if (!child) return;

  const diff = newBalance - child.balance;
  const txnId = uid();
  const desc = `Admin adjustment: balance set to £${newBalance.toFixed(2)}`;
  await sql`UPDATE children SET balance = ${newBalance}, updated_at = NOW() WHERE id = ${childId}`;
  await sql`INSERT INTO transactions (id, child_id, amount, "type", description) VALUES (${txnId}, ${childId}, ${diff}, 'admin', ${desc})`;
  revalidatePath("/");
  revalidatePath(`/children/${childId}`);
  revalidatePath("/admin");
}

export async function adminUpdateChore(formData: FormData) {
  await ensureDb();
  const choreId = formData.get("choreId") as string;
  const title = formData.get("title") as string;
  const value = parseFloat(formData.get("value") as string);
  const frequency = formData.get("frequency") as string;
  const description = (formData.get("description") as string) || "";
  if (!choreId || !title || isNaN(value)) return;

  await sql`UPDATE chores SET title = ${title}, description = ${description}, value = ${value}, frequency = ${frequency}, updated_at = NOW() WHERE id = ${choreId}`;
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/admin");
}

export async function adminUpdateReward(formData: FormData) {
  await ensureDb();
  const rewardId = formData.get("rewardId") as string;
  const title = formData.get("title") as string;
  const cost = parseFloat(formData.get("cost") as string);
  const icon = (formData.get("icon") as string) || "";
  const description = (formData.get("description") as string) || "";
  if (!rewardId || !title || isNaN(cost)) return;

  await sql`UPDATE rewards SET title = ${title}, description = ${description}, cost = ${cost}, icon = ${icon}, updated_at = NOW() WHERE id = ${rewardId}`;
  revalidatePath("/");
  revalidatePath("/rewards");
  revalidatePath("/admin");
}

export async function adminOverrideAssignment(formData: FormData) {
  await ensureDb();
  const assignmentId = formData.get("assignmentId") as string;
  const newStatus = formData.get("status") as string;
  if (!assignmentId || !["pending", "completed", "approved"].includes(newStatus)) return;

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
  await ensureDb();
  await sql`DELETE FROM chore_assignments WHERE id = ${assignmentId}`;
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/admin");
}

export async function adminDeleteTransaction(transactionId: string) {
  await ensureDb();
  const rows = await sql`SELECT * FROM transactions WHERE id = ${transactionId}`;
  const txn = rows[0] ? numify(rows[0], "amount") as Transaction : undefined;
  if (!txn) return;

  await sql`UPDATE children SET balance = balance - ${txn.amount}, updated_at = NOW() WHERE id = ${txn.child_id}`;
  await sql`DELETE FROM transactions WHERE id = ${transactionId}`;
  revalidatePath("/");
  revalidatePath(`/children/${txn.child_id}`);
  revalidatePath("/admin");
}

export async function adminDeleteAllAssignments() {
  await ensureDb();
  await sql`DELETE FROM chore_assignments`;
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/admin");
}

export async function adminGetAllData() {
  await ensureDb();
  const children = (await sql`SELECT * FROM children ORDER BY name ASC`).map(r => numify(r, "balance")) as Child[];
  const chores = (await sql`SELECT * FROM chores ORDER BY title ASC`).map(r => numify(r, "value")) as Chore[];
  const assignments = (await sql`
    SELECT ca.*, c.title AS chore_title, c.value AS chore_value, ch.name AS child_name
    FROM chore_assignments ca
    JOIN chores c ON ca.chore_id = c.id
    JOIN children ch ON ca.child_id = ch.id
    ORDER BY ca.created_at DESC
  `).map(r => numify(r, "chore_value")) as (ChoreAssignmentWithChore & { child_name: string })[];
  const transactions = (await sql`
    SELECT t.*, ch.name AS child_name
    FROM transactions t JOIN children ch ON t.child_id = ch.id
    ORDER BY t.created_at DESC
  `).map(r => numify(r, "amount")) as (Transaction & { child_name: string })[];
  const rewards = (await sql`SELECT * FROM rewards ORDER BY title ASC`).map(r => numify(r, "cost")) as Reward[];
  const rewardClaims = await sql`
    SELECT rc.*, r.title AS reward_title, ch.name AS child_name
    FROM reward_claims rc
    JOIN rewards r ON rc.reward_id = r.id
    JOIN children ch ON rc.child_id = ch.id
    ORDER BY rc.created_at DESC
  ` as (RewardClaimWithReward & { child_name: string })[];

  return { children, chores, assignments, transactions, rewards, rewardClaims };
}

export async function adminNukeDatabase() {
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

// ─── Dashboard stats ────────────────────────────────────────

export async function getDashboardStats() {
  await ensureDb();
  const children = (await sql`SELECT * FROM children ORDER BY name ASC`).map(r => numify(r, "balance")) as Child[];
  const pendingRow = await sql`SELECT COUNT(*) AS cnt FROM chore_assignments WHERE status = 'completed'`;
  const choreRow = await sql`SELECT COUNT(*) AS cnt FROM chores`;
  const rewardRow = await sql`SELECT COUNT(*) AS cnt FROM rewards`;
  const proposalRow = await sql`SELECT COUNT(*) AS cnt FROM chore_proposals WHERE status IN ('pending', 'countered')`;
  const pendingApprovals = Number(pendingRow[0].cnt);
  const totalChores = Number(choreRow[0].cnt);
  const rewardCount = Number(rewardRow[0].cnt);
  const pendingProposals = Number(proposalRow[0].cnt);
  const totalBalance = children.reduce((sum, c) => sum + c.balance, 0);
  return { children, pendingApprovals, totalChores, totalBalance, rewardCount, pendingProposals };
}

// ─── Savings Goals ─────────────────────────────────────────

export async function getChildSavingsGoals(childId: string) {
  await ensureDb();
  const rows = await sql`SELECT * FROM savings_goals WHERE child_id = ${childId} ORDER BY created_at DESC`;
  return rows.map(r => numify(r, "target_amount")) as SavingsGoal[];
}

export async function createSavingsGoal(formData: FormData) {
  await ensureDb();
  const id = uid();
  const childId = formData.get("childId") as string;
  const title = formData.get("title") as string;
  const targetAmount = parseFloat(formData.get("targetAmount") as string) || 0;
  await sql`INSERT INTO savings_goals (id, child_id, title, target_amount) VALUES (${id}, ${childId}, ${title}, ${targetAmount})`;
  revalidatePath("/my");
  revalidatePath(`/children/${childId}`);
}

export async function deleteSavingsGoal(goalId: string) {
  await ensureDb();
  const rows = await sql`SELECT child_id FROM savings_goals WHERE id = ${goalId}`;
  await sql`DELETE FROM savings_goals WHERE id = ${goalId}`;
  if (rows[0]) {
    revalidatePath("/my");
    revalidatePath(`/children/${rows[0].child_id}`);
  }
}

// ─── Streak Tracker ────────────────────────────────────────

export async function getChildStreak(childId: string): Promise<{ current: number; best: number }> {
  await ensureDb();
  // Get all assignments with due_date that are approved, ordered by date desc
  const rows = await sql`
    SELECT DISTINCT due_date FROM chore_assignments
    WHERE child_id = ${childId} AND due_date IS NOT NULL
    ORDER BY due_date DESC
  `;

  if (rows.length === 0) return { current: 0, best: 0 };

  // For each date that has assignments, check if ALL assignments for that date are approved
  const approvedDates: string[] = [];
  for (const row of rows) {
    const date = row.due_date as string;
    const total = await sql`SELECT COUNT(*) AS cnt FROM chore_assignments WHERE child_id = ${childId} AND due_date = ${date}`;
    const done = await sql`SELECT COUNT(*) AS cnt FROM chore_assignments WHERE child_id = ${childId} AND due_date = ${date} AND status = 'approved'`;
    if (Number(total[0].cnt) > 0 && Number(total[0].cnt) === Number(done[0].cnt)) {
      approvedDates.push(date);
    }
  }

  if (approvedDates.length === 0) return { current: 0, best: 0 };

  // Calculate current streak (consecutive days ending at today or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateSet = new Set(approvedDates);
  let current = 0;
  let checkDate = new Date(today);

  // Start from today; if today has no approved chores, try yesterday
  const todayStr = today.toISOString().split("T")[0];
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  if (!dateSet.has(todayStr) && !dateSet.has(yesterdayStr)) {
    // Streak is broken
  } else {
    if (!dateSet.has(todayStr)) {
      checkDate = new Date(yesterday);
    }
    while (dateSet.has(checkDate.toISOString().split("T")[0])) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Calculate best streak
  const sorted = [...approvedDates].sort();
  let best = 0;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      run++;
    } else {
      best = Math.max(best, run);
      run = 1;
    }
  }
  best = Math.max(best, run);

  return { current, best };
}

// ─── Chore Proposals (Barter System) ────────────────────────

export async function getChildProposals(childId: string) {
  await ensureDb();
  const rows = await sql`SELECT * FROM chore_proposals WHERE child_id = ${childId} ORDER BY created_at DESC`;
  return rows.map(r => numify(r, "requested_value", "admin_value")) as ChoreProposal[];
}

export async function createProposal(formData: FormData) {
  await ensureDb();
  const id = uid();
  const childId = formData.get("childId") as string;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const requestedValue = parseFloat(formData.get("requestedValue") as string) || 0;
  await sql`INSERT INTO chore_proposals (id, child_id, title, description, requested_value) VALUES (${id}, ${childId}, ${title}, ${description}, ${requestedValue})`;
  revalidatePath("/");
  revalidatePath("/my");
  revalidatePath("/approvals");
}

export async function childAcceptCounter(proposalId: string) {
  await ensureDb();
  const rows = await sql`SELECT * FROM chore_proposals WHERE id = ${proposalId}`;
  const proposal = rows[0] ? numify(rows[0], "requested_value", "admin_value") as ChoreProposal : null;
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
  await sql`UPDATE chore_proposals SET status = 'declined', updated_at = NOW() WHERE id = ${proposalId}`;
  revalidatePath("/");
  revalidatePath("/my");
  revalidatePath("/approvals");
}

export async function adminApproveProposal(proposalId: string) {
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
  await ensureDb();
  const proposalId = formData.get("proposalId") as string;
  const adminValue = parseFloat(formData.get("adminValue") as string);
  if (!proposalId || isNaN(adminValue)) return;
  await sql`UPDATE chore_proposals SET admin_value = ${adminValue}, status = 'countered', updated_at = NOW() WHERE id = ${proposalId}`;
  revalidatePath("/");
  revalidatePath("/my");
  revalidatePath("/approvals");
}

export async function adminRejectProposal(proposalId: string) {
  await ensureDb();
  await sql`UPDATE chore_proposals SET status = 'rejected', updated_at = NOW() WHERE id = ${proposalId}`;
  revalidatePath("/");
  revalidatePath("/my");
  revalidatePath("/approvals");
}

export async function getPendingApprovals() {
  await ensureDb();
  const choreApprovals = (await sql`
    SELECT ca.*, c.title AS chore_title, c.value AS chore_value, ch.name AS child_name, ch.id AS child_id, ch.avatar AS child_avatar
    FROM chore_assignments ca
    JOIN chores c ON ca.chore_id = c.id
    JOIN children ch ON ca.child_id = ch.id
    WHERE ca.status = 'completed'
    ORDER BY ca.completed_at DESC
  `).map(r => numify(r, "chore_value")) as (ChoreAssignmentWithChore & { child_name: string; child_avatar: string })[];

  const proposals = (await sql`
    SELECT cp.*, ch.name AS child_name
    FROM chore_proposals cp
    JOIN children ch ON cp.child_id = ch.id
    WHERE cp.status IN ('pending')
    ORDER BY cp.created_at DESC
  `).map(r => numify(r, "requested_value", "admin_value")) as ChoreProposalWithChild[];

  return { choreApprovals, proposals };
}
