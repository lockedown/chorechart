"use server";

import { sql, ensureDb, numify } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { uid, isAdminAction, getActionUser } from "./helpers";
import { createRewardSchema, claimRewardSchema, parseFormData } from "@/lib/schemas";
import type { Reward, RewardWithClaimCount } from "@/lib/types";

// ─── Rewards ────────────────────────────────────────────────

export async function getRewards() {
  await ensureDb();
  const rawRewards = await sql`
    SELECT r.*, COALESCE(rc.cnt, 0) AS claim_count
    FROM rewards r
    LEFT JOIN (SELECT reward_id, COUNT(*) AS cnt FROM reward_claims GROUP BY reward_id) rc ON rc.reward_id = r.id
    ORDER BY r.title ASC
  `;
  return rawRewards.map(r => numify(r, "cost", "claim_count")) as RewardWithClaimCount[];
}

export async function createReward(formData: FormData) {
  if (!(await isAdminAction())) return;
  const parsed = parseFormData(createRewardSchema, formData);
  if (!parsed) return;
  await ensureDb();
  const id = uid();
  const { title, description, cost, icon } = parsed;
  await sql`INSERT INTO rewards (id, title, description, cost, icon) VALUES (${id}, ${title}, ${description}, ${cost}, ${icon})`;
  revalidatePath("/");
  revalidatePath("/rewards");
}

export async function deleteReward(id: string) {
  if (!(await isAdminAction())) return;
  await ensureDb();
  await sql`DELETE FROM rewards WHERE id = ${id}`;
  revalidatePath("/");
  revalidatePath("/rewards");
}

export async function claimReward(childId: string, rewardId: string) {
  const validated = claimRewardSchema.safeParse({ childId, rewardId });
  if (!validated.success) return;
  const user = await getActionUser();
  if (!user) return;
  const targetChildId = user.role === "admin" ? childId : user.child_id;
  if (!targetChildId) return;
  if (user.role === "child" && childId !== targetChildId) return;
  await ensureDb();
  const rewardRows = await sql`SELECT * FROM rewards WHERE id = ${rewardId}`;
  const reward = rewardRows[0] ? numify(rewardRows[0], "cost") as Reward : undefined;
  if (!reward) return;

  const claimId = uid();
  const txnId = uid();
  const negCost = -reward.cost;
  const desc = `Claimed reward: ${reward.title}`;

  const applied = await sql`
    WITH debited AS (
      UPDATE children
      SET balance = balance - ${reward.cost}, updated_at = NOW()
      WHERE id = ${targetChildId} AND balance >= ${reward.cost}
      RETURNING id
    ),
    claimed AS (
      INSERT INTO reward_claims (id, child_id, reward_id)
      SELECT ${claimId}, ${targetChildId}, ${rewardId}
      FROM debited
      RETURNING id
    ),
    logged AS (
      INSERT INTO transactions (id, child_id, amount, "type", description)
      SELECT ${txnId}, ${targetChildId}, ${negCost}, 'spend', ${desc}
      FROM debited
      RETURNING id
    )
    SELECT id FROM debited
  `;
  if (applied.length === 0) return;

  revalidatePath("/");
  revalidatePath(`/children/${targetChildId}`);
  revalidatePath("/rewards");
}
