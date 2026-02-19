import { NextRequest, NextResponse } from "next/server";
import { processAllowances } from "@/lib/actions";
import { ensureDb, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;

  const token = authHeader.slice("Bearer ".length);
  return token === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  await ensureDb();
  const allowanceStats = await processAllowances();
  const expiredSessions = await sql`DELETE FROM sessions WHERE expires_at <= NOW() RETURNING id`;
  const staleChildSessions = await sql`
    DELETE FROM sessions s
    USING users u
    WHERE s.user_id = u.id
      AND u.role = 'child'
      AND (
        u.child_id IS NULL
        OR NOT EXISTS (SELECT 1 FROM children c WHERE c.id = u.child_id)
      )
    RETURNING s.id
  `;

  const runSummary = {
    allowanceStats,
    expiredSessionsRemoved: expiredSessions.length,
    staleChildSessionsRemoved: staleChildSessions.length,
  };

  console.info("[cron][allowances] run complete", runSummary);

  return NextResponse.json({
    ok: true,
    ...runSummary,
  });
}
