import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module before importing the action
const mockSql = vi.fn();
vi.mock("@/lib/db", () => ({
  sql: (...args: unknown[]) => mockSql(...args),
  ensureDb: vi.fn().mockResolvedValue(undefined),
  numify: <T extends Record<string, unknown>>(row: T, ...keys: string[]): T => {
    const out = { ...row };
    for (const k of keys) {
      if (k in out && out[k] !== null && out[k] !== undefined) {
        (out as Record<string, unknown>)[k] = Number(out[k]);
      }
    }
    return out;
  },
}));

// Mock helpers to bypass auth
vi.mock("@/lib/actions/helpers", () => ({
  uid: () => "test-uuid",
  isAdminAction: vi.fn().mockResolvedValue(true),
  canMutateChild: vi.fn().mockResolvedValue(true),
  getSignedInChildId: vi.fn().mockResolvedValue("child-1"),
  getActionUser: vi.fn().mockResolvedValue({ id: "u1", role: "admin", child_id: null }),
  isChildOwnerAction: vi.fn().mockResolvedValue(true),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn().mockResolvedValue({ user: { id: "u1", role: "admin", child_id: null } }),
  requireAdmin: vi.fn().mockResolvedValue({ id: "u1", role: "admin", child_id: null }),
}));

import { processAllowances } from "@/lib/actions/allowance";

describe("processAllowances", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it("returns zero metrics when no children have allowances", async () => {
    // First call is ensureDb readiness check, second is the SELECT for children
    mockSql.mockResolvedValueOnce([]);

    const result = await processAllowances();
    expect(result).toEqual({
      checkedChildren: 0,
      depositedChildren: 0,
      totalDeposited: 0,
      baselineSeeded: 0,
      transactionsCreated: 0,
    });
  });

  it("skips children whose start date is in the future", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    mockSql.mockResolvedValueOnce([
      {
        id: "child-1",
        name: "Emma",
        balance: "10",
        allowance_amount: "5",
        allowance_frequency: "weekly",
        allowance_start_date: futureDateStr,
        last_allowance_date: futureDateStr,
      },
    ]);

    const result = await processAllowances();
    expect(result.checkedChildren).toBe(1);
    expect(result.depositedChildren).toBe(0);
    expect(result.totalDeposited).toBe(0);
  });

  it("deposits for a child with weekly allowance due", async () => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];

    mockSql.mockResolvedValueOnce([
      {
        id: "child-1",
        name: "Emma",
        balance: "10",
        allowance_amount: "5",
        allowance_frequency: "weekly",
        allowance_start_date: twoWeeksAgoStr,
        last_allowance_date: twoWeeksAgoStr,
      },
    ]);

    // The CTE update query
    mockSql.mockResolvedValueOnce([{ updated_count: 1, logged_count: 1 }]);

    const result = await processAllowances();
    expect(result.checkedChildren).toBe(1);
    expect(result.depositedChildren).toBe(1);
    expect(result.totalDeposited).toBe(10); // 2 weeks * £5
    expect(result.transactionsCreated).toBe(1);
  });

  it("seeds baseline when last_allowance_date is null and no deposit due", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    mockSql.mockResolvedValueOnce([
      {
        id: "child-1",
        name: "Emma",
        balance: "10",
        allowance_amount: "5",
        allowance_frequency: "weekly",
        allowance_start_date: todayStr,
        last_allowance_date: null,
      },
    ]);

    // Baseline seed UPDATE
    mockSql.mockResolvedValueOnce([{ id: "child-1" }]);

    const result = await processAllowances();
    expect(result.checkedChildren).toBe(1);
    expect(result.depositedChildren).toBe(0);
    expect(result.baselineSeeded).toBe(1);
  });

  it("handles monthly allowance calculation correctly", async () => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];

    mockSql.mockResolvedValueOnce([
      {
        id: "child-1",
        name: "Emma",
        balance: "20",
        allowance_amount: "10",
        allowance_frequency: "monthly",
        allowance_start_date: threeMonthsAgoStr,
        last_allowance_date: threeMonthsAgoStr,
      },
    ]);

    // The CTE update query
    mockSql.mockResolvedValueOnce([{ updated_count: 1, logged_count: 1 }]);

    const result = await processAllowances();
    expect(result.checkedChildren).toBe(1);
    expect(result.depositedChildren).toBe(1);
    expect(result.totalDeposited).toBe(30); // 3 months * £10
  });

  it("does not double-deposit when CTE update returns 0 (race guard)", async () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split("T")[0];

    mockSql.mockResolvedValueOnce([
      {
        id: "child-1",
        name: "Emma",
        balance: "10",
        allowance_amount: "5",
        allowance_frequency: "weekly",
        allowance_start_date: oneWeekAgoStr,
        last_allowance_date: oneWeekAgoStr,
      },
    ]);

    // CTE returns 0 — another process already deposited
    mockSql.mockResolvedValueOnce([{ updated_count: 0, logged_count: 0 }]);

    const result = await processAllowances();
    expect(result.checkedChildren).toBe(1);
    expect(result.depositedChildren).toBe(0);
    expect(result.totalDeposited).toBe(0);
    expect(result.transactionsCreated).toBe(0);
  });
});
