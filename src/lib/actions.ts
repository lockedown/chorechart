"use server";

import { db } from "@/lib/db";
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
} from "@/lib/types";

function uid() {
  return randomUUID();
}

// ─── Children ───────────────────────────────────────────────

export async function getChildren() {
  const children = db.prepare("SELECT * FROM children ORDER BY name ASC").all() as Child[];
  return children.map((child) => {
    const assignedChores = db
      .prepare(
        `SELECT ca.*, c.title AS chore_title, c.value AS chore_value, c.description AS chore_description
         FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id
         WHERE ca.child_id = ? ORDER BY ca.created_at DESC`
      )
      .all(child.id) as ChoreAssignmentWithChore[];
    return { ...child, assignedChores };
  });
}

export async function getChild(id: string) {
  const child = db.prepare("SELECT * FROM children WHERE id = ?").get(id) as Child | undefined;
  if (!child) return null;

  const assignedChores = db
    .prepare(
      `SELECT ca.*, c.title AS chore_title, c.value AS chore_value, c.description AS chore_description
       FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id
       WHERE ca.child_id = ? ORDER BY ca.created_at DESC`
    )
    .all(id) as ChoreAssignmentWithChore[];

  const transactions = db
    .prepare("SELECT * FROM transactions WHERE child_id = ? ORDER BY created_at DESC")
    .all(id) as Transaction[];

  const rewardClaims = db
    .prepare(
      `SELECT rc.*, r.title AS reward_title
       FROM reward_claims rc JOIN rewards r ON rc.reward_id = r.id
       WHERE rc.child_id = ? ORDER BY rc.created_at DESC`
    )
    .all(id) as RewardClaimWithReward[];

  return { ...child, assignedChores, transactions, rewardClaims };
}

export async function createChild(formData: FormData) {
  const name = formData.get("name") as string;
  const avatar = (formData.get("avatar") as string) || "";
  const childId = uid();

  // Generate a unique username from the child's name
  const baseUsername = name.trim().toLowerCase().replace(/\s+/g, ".");
  let username = baseUsername;
  let suffix = 1;
  while (db.prepare("SELECT id FROM users WHERE username = ?").get(username)) {
    username = `${baseUsername}${suffix}`;
    suffix++;
  }

  const defaultPassword = hashSync(name.trim().toLowerCase(), 10);

  const txn = db.transaction(() => {
    db.prepare("INSERT INTO children (id, name, avatar) VALUES (?, ?, ?)").run(childId, name, avatar);
    db.prepare("INSERT INTO users (id, username, password_hash, role, child_id) VALUES (?, ?, ?, 'child', ?)").run(
      uid(), username, defaultPassword, childId
    );
  });
  txn();

  revalidatePath("/");
  revalidatePath("/children");
  revalidatePath("/admin");
}

export async function deleteChild(id: string) {
  const txn = db.transaction(() => {
    db.prepare("DELETE FROM users WHERE child_id = ?").run(id);
    db.prepare("DELETE FROM children WHERE id = ?").run(id);
  });
  txn();
  revalidatePath("/");
  revalidatePath("/children");
  revalidatePath("/admin");
}

// ─── Chores ─────────────────────────────────────────────────

export async function getChores() {
  const chores = db.prepare("SELECT * FROM chores ORDER BY title ASC").all() as Chore[];
  return chores.map((chore) => {
    const assignments = db
      .prepare(
        `SELECT ca.*, ch.name AS child_name
         FROM chore_assignments ca JOIN children ch ON ca.child_id = ch.id
         WHERE ca.chore_id = ?`
      )
      .all(chore.id) as ChoreAssignmentWithChild[];
    return { ...chore, assignments };
  });
}

export async function createChore(formData: FormData) {
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const value = parseFloat(formData.get("value") as string) || 0;
  const frequency = (formData.get("frequency") as string) || "one-off";
  db.prepare("INSERT INTO chores (id, title, description, value, frequency) VALUES (?, ?, ?, ?, ?)").run(
    uid(), title, description, value, frequency
  );
  revalidatePath("/");
  revalidatePath("/chores");
}

export async function deleteChore(id: string) {
  db.prepare("DELETE FROM chores WHERE id = ?").run(id);
  revalidatePath("/");
  revalidatePath("/chores");
}

// ─── Chore Assignments ─────────────────────────────────────

export async function assignChore(formData: FormData) {
  const childId = formData.get("childId") as string;
  const choreId = formData.get("choreId") as string;
  const dueDateStr = formData.get("dueDate") as string;
  const dueDate = dueDateStr || null;
  db.prepare("INSERT INTO chore_assignments (id, child_id, chore_id, due_date) VALUES (?, ?, ?, ?)").run(
    uid(), childId, choreId, dueDate
  );
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath(`/children/${childId}`);
}

export async function markChoreDone(assignmentId: string) {
  db.prepare("UPDATE chore_assignments SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(assignmentId);
  revalidatePath("/");
  revalidatePath("/chores");
}

export async function approveChore(assignmentId: string) {
  const assignment = db
    .prepare(
      `SELECT ca.*, c.value AS chore_value, c.title AS chore_title
       FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id
       WHERE ca.id = ?`
    )
    .get(assignmentId) as (ChoreAssignmentWithChore & { chore_value: number; chore_title: string }) | undefined;
  if (!assignment) return;

  const txn = db.transaction(() => {
    db.prepare("UPDATE chore_assignments SET status = 'approved', approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(assignmentId);
    db.prepare("UPDATE children SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?").run(assignment.chore_value, assignment.child_id);
    db.prepare("INSERT INTO transactions (id, child_id, amount, type, description) VALUES (?, ?, ?, 'earn', ?)").run(
      uid(), assignment.child_id, assignment.chore_value, `Completed: ${assignment.chore_title}`
    );
  });
  txn();

  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath(`/children/${assignment.child_id}`);
}

// ─── Transactions (manual bonus / deduction) ───────────────

export async function addTransaction(formData: FormData) {
  const childId = formData.get("childId") as string;
  const amount = parseFloat(formData.get("amount") as string) || 0;
  const type = formData.get("type") as string;
  const description = (formData.get("description") as string) || "";

  const balanceChange = type === "deduction" || type === "spend" ? -Math.abs(amount) : Math.abs(amount);

  const txn = db.transaction(() => {
    db.prepare("INSERT INTO transactions (id, child_id, amount, type, description) VALUES (?, ?, ?, ?, ?)").run(
      uid(), childId, balanceChange, type, description
    );
    db.prepare("UPDATE children SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?").run(balanceChange, childId);
  });
  txn();

  revalidatePath("/");
  revalidatePath(`/children/${childId}`);
}

// ─── Rewards ────────────────────────────────────────────────

export async function getRewards() {
  const rewards = db.prepare("SELECT * FROM rewards ORDER BY title ASC").all() as Reward[];
  return rewards.map((reward) => {
    const row = db.prepare("SELECT COUNT(*) AS claim_count FROM reward_claims WHERE reward_id = ?").get(reward.id) as { claim_count: number };
    return { ...reward, claim_count: row.claim_count } as RewardWithClaimCount;
  });
}

export async function createReward(formData: FormData) {
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const cost = parseFloat(formData.get("cost") as string) || 0;
  const icon = (formData.get("icon") as string) || "";
  db.prepare("INSERT INTO rewards (id, title, description, cost, icon) VALUES (?, ?, ?, ?, ?)").run(
    uid(), title, description, cost, icon
  );
  revalidatePath("/");
  revalidatePath("/rewards");
}

export async function deleteReward(id: string) {
  db.prepare("DELETE FROM rewards WHERE id = ?").run(id);
  revalidatePath("/");
  revalidatePath("/rewards");
}

export async function claimReward(childId: string, rewardId: string) {
  const reward = db.prepare("SELECT * FROM rewards WHERE id = ?").get(rewardId) as Reward | undefined;
  const child = db.prepare("SELECT * FROM children WHERE id = ?").get(childId) as Child | undefined;
  if (!reward || !child || child.balance < reward.cost) return;

  const txn = db.transaction(() => {
    db.prepare("INSERT INTO reward_claims (id, child_id, reward_id) VALUES (?, ?, ?)").run(uid(), childId, rewardId);
    db.prepare("UPDATE children SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?").run(reward.cost, childId);
    db.prepare("INSERT INTO transactions (id, child_id, amount, type, description) VALUES (?, ?, ?, 'spend', ?)").run(
      uid(), childId, -reward.cost, `Claimed reward: ${reward.title}`
    );
  });
  txn();

  revalidatePath("/");
  revalidatePath(`/children/${childId}`);
  revalidatePath("/rewards");
}

// ─── Admin ──────────────────────────────────────────────────

export async function adminResetAllBalances() {
  const txn = db.transaction(() => {
    db.prepare("UPDATE children SET balance = 0, updated_at = datetime('now')").run();
    db.prepare("DELETE FROM transactions").run();
  });
  txn();
  revalidatePath("/");
  revalidatePath("/children");
  revalidatePath("/admin");
}

export async function adminSetBalance(formData: FormData) {
  const childId = formData.get("childId") as string;
  const newBalance = parseFloat(formData.get("balance") as string);
  if (isNaN(newBalance)) return;

  const child = db.prepare("SELECT * FROM children WHERE id = ?").get(childId) as Child | undefined;
  if (!child) return;

  const diff = newBalance - child.balance;
  const txn = db.transaction(() => {
    db.prepare("UPDATE children SET balance = ?, updated_at = datetime('now') WHERE id = ?").run(newBalance, childId);
    db.prepare("INSERT INTO transactions (id, child_id, amount, type, description) VALUES (?, ?, ?, 'admin', ?)").run(
      uid(), childId, diff, `Admin adjustment: balance set to $${newBalance.toFixed(2)}`
    );
  });
  txn();
  revalidatePath("/");
  revalidatePath(`/children/${childId}`);
  revalidatePath("/admin");
}

export async function adminUpdateChore(formData: FormData) {
  const choreId = formData.get("choreId") as string;
  const title = formData.get("title") as string;
  const value = parseFloat(formData.get("value") as string);
  const frequency = formData.get("frequency") as string;
  const description = (formData.get("description") as string) || "";
  if (!choreId || !title || isNaN(value)) return;

  db.prepare("UPDATE chores SET title = ?, description = ?, value = ?, frequency = ?, updated_at = datetime('now') WHERE id = ?").run(
    title, description, value, frequency, choreId
  );
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/admin");
}

export async function adminUpdateReward(formData: FormData) {
  const rewardId = formData.get("rewardId") as string;
  const title = formData.get("title") as string;
  const cost = parseFloat(formData.get("cost") as string);
  const icon = (formData.get("icon") as string) || "";
  const description = (formData.get("description") as string) || "";
  if (!rewardId || !title || isNaN(cost)) return;

  db.prepare("UPDATE rewards SET title = ?, description = ?, cost = ?, icon = ?, updated_at = datetime('now') WHERE id = ?").run(
    title, description, cost, icon, rewardId
  );
  revalidatePath("/");
  revalidatePath("/rewards");
  revalidatePath("/admin");
}

export async function adminOverrideAssignment(formData: FormData) {
  const assignmentId = formData.get("assignmentId") as string;
  const newStatus = formData.get("status") as string;
  if (!assignmentId || !["pending", "completed", "approved"].includes(newStatus)) return;

  if (newStatus === "approved") {
    await approveChore(assignmentId);
  } else if (newStatus === "completed") {
    db.prepare("UPDATE chore_assignments SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(assignmentId);
  } else {
    db.prepare("UPDATE chore_assignments SET status = 'pending', completed_at = NULL, approved_at = NULL, updated_at = datetime('now') WHERE id = ?").run(assignmentId);
  }
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/admin");
}

export async function adminDeleteAssignment(assignmentId: string) {
  db.prepare("DELETE FROM chore_assignments WHERE id = ?").run(assignmentId);
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/admin");
}

export async function adminDeleteTransaction(transactionId: string) {
  const txn = db.prepare("SELECT * FROM transactions WHERE id = ?").get(transactionId) as Transaction | undefined;
  if (!txn) return;

  const rollback = db.transaction(() => {
    db.prepare("UPDATE children SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?").run(txn.amount, txn.child_id);
    db.prepare("DELETE FROM transactions WHERE id = ?").run(transactionId);
  });
  rollback();
  revalidatePath("/");
  revalidatePath(`/children/${txn.child_id}`);
  revalidatePath("/admin");
}

export async function adminDeleteAllAssignments() {
  db.prepare("DELETE FROM chore_assignments").run();
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/admin");
}

export async function adminGetAllData() {
  const children = db.prepare("SELECT * FROM children ORDER BY name ASC").all() as Child[];
  const chores = db.prepare("SELECT * FROM chores ORDER BY title ASC").all() as Chore[];
  const assignments = db.prepare(
    `SELECT ca.*, c.title AS chore_title, c.value AS chore_value, ch.name AS child_name
     FROM chore_assignments ca
     JOIN chores c ON ca.chore_id = c.id
     JOIN children ch ON ca.child_id = ch.id
     ORDER BY ca.created_at DESC`
  ).all() as (ChoreAssignmentWithChore & { child_name: string })[];
  const transactions = db.prepare(
    `SELECT t.*, ch.name AS child_name
     FROM transactions t JOIN children ch ON t.child_id = ch.id
     ORDER BY t.created_at DESC`
  ).all() as (Transaction & { child_name: string })[];
  const rewards = db.prepare("SELECT * FROM rewards ORDER BY title ASC").all() as Reward[];
  const rewardClaims = db.prepare(
    `SELECT rc.*, r.title AS reward_title, ch.name AS child_name
     FROM reward_claims rc
     JOIN rewards r ON rc.reward_id = r.id
     JOIN children ch ON rc.child_id = ch.id
     ORDER BY rc.created_at DESC`
  ).all() as (RewardClaimWithReward & { child_name: string })[];

  return { children, chores, assignments, transactions, rewards, rewardClaims };
}

export async function adminNukeDatabase() {
  const txn = db.transaction(() => {
    db.prepare("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role != 'admin')").run();
    db.prepare("DELETE FROM users WHERE role != 'admin'").run();
    db.prepare("DELETE FROM reward_claims").run();
    db.prepare("DELETE FROM transactions").run();
    db.prepare("DELETE FROM chore_assignments").run();
    db.prepare("DELETE FROM rewards").run();
    db.prepare("DELETE FROM chores").run();
    db.prepare("DELETE FROM children").run();
  });
  txn();
  revalidatePath("/");
  revalidatePath("/children");
  revalidatePath("/chores");
  revalidatePath("/rewards");
  revalidatePath("/admin");
}

// ─── Dashboard stats ────────────────────────────────────────

export async function getDashboardStats() {
  const children = db.prepare("SELECT * FROM children ORDER BY name ASC").all() as Child[];
  const pendingApprovals = (db.prepare("SELECT COUNT(*) AS cnt FROM chore_assignments WHERE status = 'completed'").get() as { cnt: number }).cnt;
  const totalChores = (db.prepare("SELECT COUNT(*) AS cnt FROM chores").get() as { cnt: number }).cnt;
  const rewardCount = (db.prepare("SELECT COUNT(*) AS cnt FROM rewards").get() as { cnt: number }).cnt;
  const totalBalance = children.reduce((sum, c) => sum + c.balance, 0);
  return { children, pendingApprovals, totalChores, totalBalance, rewardCount };
}
