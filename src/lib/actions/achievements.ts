"use server";

import { sql, ensureDb } from "@/lib/db";
import { getChildStreak } from "./streaks";
import type { AchievementDef, UnlockedAchievement } from "@/lib/types";

// ─── Achievements ─────────────────────────────────────────

const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_chore", title: "First Steps", description: "Completed your first chore", icon: "🌟" },
  { id: "chores_10", title: "Getting Going", description: "Completed 10 chores", icon: "💪" },
  { id: "chores_25", title: "Chore Champion", description: "Completed 25 chores", icon: "🏅" },
  { id: "chores_50", title: "Unstoppable", description: "Completed 50 chores", icon: "🔥" },
  { id: "chores_100", title: "Chore Legend", description: "Completed 100 chores", icon: "👑" },
  { id: "first_reward", title: "Treat Yourself", description: "Claimed your first reward", icon: "🎁" },
  { id: "first_proposal", title: "Entrepreneur", description: "Proposed a chore", icon: "💡" },
  { id: "earnings_10", title: "Tenner", description: "Earned £10 lifetime", icon: "💰" },
  { id: "earnings_50", title: "Fifty Quid", description: "Earned £50 lifetime", icon: "💎" },
  { id: "earnings_100", title: "Century Club", description: "Earned £100 lifetime", icon: "🏆" },
  { id: "streak_7", title: "Week Warrior", description: "Achieved a 7-day streak", icon: "⚡" },
];

export async function getAllAchievements(): Promise<AchievementDef[]> {
  return ACHIEVEMENTS;
}

export async function getChildAchievements(childId: string): Promise<UnlockedAchievement[]> {
  await ensureDb();
  const [doneRow, claimsRow, proposalsRow, earningsRow, streakData] = await Promise.all([
    sql`SELECT COUNT(*) AS cnt FROM chore_assignments WHERE child_id = ${childId} AND status IN ('completed', 'approved')`,
    sql`SELECT COUNT(*) AS cnt FROM reward_claims WHERE child_id = ${childId}`,
    sql`SELECT COUNT(*) AS cnt FROM chore_proposals WHERE child_id = ${childId}`,
    sql`SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE child_id = ${childId} AND amount > 0`,
    getChildStreak(childId),
  ]);

  const doneCount = Number(doneRow[0].cnt);
  const claimCount = Number(claimsRow[0].cnt);
  const proposalCount = Number(proposalsRow[0].cnt);
  const totalEarnings = Number(earningsRow[0].total);
  const bestStreak = streakData.best;

  const unlocked: UnlockedAchievement[] = [];

  const check = (id: string, condition: boolean) => {
    if (condition) {
      const def = ACHIEVEMENTS.find(a => a.id === id);
      if (def) unlocked.push({ ...def, unlocked_at: new Date().toISOString() });
    }
  };

  check("first_chore", doneCount >= 1);
  check("chores_10", doneCount >= 10);
  check("chores_25", doneCount >= 25);
  check("chores_50", doneCount >= 50);
  check("chores_100", doneCount >= 100);
  check("first_reward", claimCount >= 1);
  check("first_proposal", proposalCount >= 1);
  check("earnings_10", totalEarnings >= 10);
  check("earnings_50", totalEarnings >= 50);
  check("earnings_100", totalEarnings >= 100);
  check("streak_7", bestStreak >= 7);

  return unlocked;
}
