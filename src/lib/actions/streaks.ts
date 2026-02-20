"use server";

import { sql, ensureDb } from "@/lib/db";

// ─── Streak Tracker ────────────────────────────────────────

export async function getChildStreak(childId: string): Promise<{ current: number; best: number }> {
  await ensureDb();
  // Single query: group by due_date, compare total vs approved count
  const rows = await sql`
    SELECT due_date,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'approved') AS approved
    FROM chore_assignments
    WHERE child_id = ${childId} AND due_date IS NOT NULL
    GROUP BY due_date
    ORDER BY due_date DESC
  `;

  // Dates where every assignment is approved
  const approvedDates: string[] = [];
  for (const row of rows) {
    if (Number(row.total) > 0 && Number(row.total) === Number(row.approved)) {
      approvedDates.push(row.due_date as string);
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
