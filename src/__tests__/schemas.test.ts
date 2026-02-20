import { describe, it, expect } from "vitest";
import {
  createChildSchema,
  createChoreSchema,
  assignChoreSchema,
  addTransactionSchema,
  createRewardSchema,
  claimRewardSchema,
  requestCashOutSchema,
  adminSetBalanceSchema,
  adminUpdateChoreSchema,
  adminUpdateRewardSchema,
  adminOverrideAssignmentSchema,
  adminCounterProposalSchema,
  updateAllowanceSchema,
  createSavingsGoalSchema,
  createProposalSchema,
  changePasswordSchema,
  adminResetPasswordSchema,
} from "@/lib/schemas";

describe("createChildSchema", () => {
  it("accepts valid input", () => {
    const result = createChildSchema.safeParse({ name: "Emma", avatar: "🦄" });
    expect(result.success).toBe(true);
  });
  it("rejects empty name", () => {
    const result = createChildSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
  it("defaults avatar to empty string", () => {
    const result = createChildSchema.safeParse({ name: "Emma" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.avatar).toBe("");
  });
});

describe("createChoreSchema", () => {
  it("accepts valid input", () => {
    const result = createChoreSchema.safeParse({ title: "Tidy room", value: 1.5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.frequency).toBe("one-off");
      expect(result.data.dayOfWeek).toBeNull();
    }
  });
  it("rejects missing title", () => {
    const result = createChoreSchema.safeParse({ value: 1 });
    expect(result.success).toBe(false);
  });
  it("rejects negative value", () => {
    const result = createChoreSchema.safeParse({ title: "Test", value: -1 });
    expect(result.success).toBe(false);
  });
  it("accepts weekly with dayOfWeek", () => {
    const result = createChoreSchema.safeParse({ title: "Bins", value: 2, frequency: "weekly", dayOfWeek: 3 });
    expect(result.success).toBe(true);
  });
  it("rejects invalid frequency", () => {
    const result = createChoreSchema.safeParse({ title: "Test", value: 1, frequency: "biweekly" });
    expect(result.success).toBe(false);
  });
});

describe("assignChoreSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  it("accepts valid UUIDs", () => {
    const result = assignChoreSchema.safeParse({ childId: validUuid, choreId: validUuid });
    expect(result.success).toBe(true);
  });
  it("rejects non-UUID childId", () => {
    const result = assignChoreSchema.safeParse({ childId: "abc", choreId: validUuid });
    expect(result.success).toBe(false);
  });
});

describe("addTransactionSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  it("accepts valid input", () => {
    const result = addTransactionSchema.safeParse({ childId: validUuid, amount: 5, type: "bonus", description: "Good job" });
    expect(result.success).toBe(true);
  });
  it("rejects zero amount", () => {
    const result = addTransactionSchema.safeParse({ childId: validUuid, amount: 0, type: "bonus" });
    expect(result.success).toBe(false);
  });
  it("rejects negative amount", () => {
    const result = addTransactionSchema.safeParse({ childId: validUuid, amount: -5, type: "bonus" });
    expect(result.success).toBe(false);
  });
});

describe("createRewardSchema", () => {
  it("accepts valid input", () => {
    const result = createRewardSchema.safeParse({ title: "Movie night", cost: 10 });
    expect(result.success).toBe(true);
  });
  it("rejects missing title", () => {
    const result = createRewardSchema.safeParse({ cost: 10 });
    expect(result.success).toBe(false);
  });
});

describe("claimRewardSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  it("accepts valid UUIDs", () => {
    const result = claimRewardSchema.safeParse({ childId: validUuid, rewardId: validUuid });
    expect(result.success).toBe(true);
  });
  it("rejects non-UUID", () => {
    const result = claimRewardSchema.safeParse({ childId: "abc", rewardId: validUuid });
    expect(result.success).toBe(false);
  });
});

describe("requestCashOutSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  it("accepts valid input", () => {
    const result = requestCashOutSchema.safeParse({ childId: validUuid, amount: 5 });
    expect(result.success).toBe(true);
  });
  it("rejects zero amount", () => {
    const result = requestCashOutSchema.safeParse({ childId: validUuid, amount: 0 });
    expect(result.success).toBe(false);
  });
  it("rejects negative amount", () => {
    const result = requestCashOutSchema.safeParse({ childId: validUuid, amount: -1 });
    expect(result.success).toBe(false);
  });
});

describe("adminSetBalanceSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  it("accepts valid input including negative balance", () => {
    const result = adminSetBalanceSchema.safeParse({ childId: validUuid, balance: -5 });
    expect(result.success).toBe(true);
  });
  it("rejects non-UUID childId", () => {
    const result = adminSetBalanceSchema.safeParse({ childId: "bad", balance: 10 });
    expect(result.success).toBe(false);
  });
});

describe("adminUpdateChoreSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  it("accepts valid input", () => {
    const result = adminUpdateChoreSchema.safeParse({ choreId: validUuid, title: "Bins", value: 2, frequency: "weekly" });
    expect(result.success).toBe(true);
  });
  it("rejects missing title", () => {
    const result = adminUpdateChoreSchema.safeParse({ choreId: validUuid, value: 2, frequency: "weekly" });
    expect(result.success).toBe(false);
  });
});

describe("adminUpdateRewardSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  it("accepts valid input", () => {
    const result = adminUpdateRewardSchema.safeParse({ rewardId: validUuid, title: "Movie", cost: 10 });
    expect(result.success).toBe(true);
  });
});

describe("adminOverrideAssignmentSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  it("accepts valid statuses", () => {
    for (const status of ["pending", "completed", "approved"]) {
      const result = adminOverrideAssignmentSchema.safeParse({ assignmentId: validUuid, status });
      expect(result.success).toBe(true);
    }
  });
  it("rejects invalid status", () => {
    const result = adminOverrideAssignmentSchema.safeParse({ assignmentId: validUuid, status: "rejected" });
    expect(result.success).toBe(false);
  });
});

describe("adminCounterProposalSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  it("accepts valid input", () => {
    const result = adminCounterProposalSchema.safeParse({ proposalId: validUuid, adminValue: 3.5 });
    expect(result.success).toBe(true);
  });
  it("rejects negative adminValue", () => {
    const result = adminCounterProposalSchema.safeParse({ proposalId: validUuid, adminValue: -1 });
    expect(result.success).toBe(false);
  });
});

describe("updateAllowanceSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  it("accepts valid weekly allowance", () => {
    const result = updateAllowanceSchema.safeParse({ childId: validUuid, amount: 5, frequency: "weekly", startDate: "2026-02-20" });
    expect(result.success).toBe(true);
  });
  it("accepts none frequency", () => {
    const result = updateAllowanceSchema.safeParse({ childId: validUuid, amount: 0, frequency: "none", startDate: "2026-02-20" });
    expect(result.success).toBe(true);
  });
  it("rejects invalid frequency", () => {
    const result = updateAllowanceSchema.safeParse({ childId: validUuid, amount: 5, frequency: "daily", startDate: "2026-02-20" });
    expect(result.success).toBe(false);
  });
});

describe("createSavingsGoalSchema", () => {
  it("accepts valid input", () => {
    const result = createSavingsGoalSchema.safeParse({ title: "New game", targetAmount: 20 });
    expect(result.success).toBe(true);
  });
  it("rejects zero target", () => {
    const result = createSavingsGoalSchema.safeParse({ title: "Test", targetAmount: 0 });
    expect(result.success).toBe(false);
  });
});

describe("createProposalSchema", () => {
  it("accepts valid input", () => {
    const result = createProposalSchema.safeParse({ title: "Wash car", requestedValue: 5 });
    expect(result.success).toBe(true);
  });
  it("rejects missing title", () => {
    const result = createProposalSchema.safeParse({ requestedValue: 5 });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts valid matching passwords", () => {
    const result = changePasswordSchema.safeParse({ currentPassword: "old1", newPassword: "new1234", confirmPassword: "new1234" });
    expect(result.success).toBe(true);
  });
  it("rejects mismatched passwords", () => {
    const result = changePasswordSchema.safeParse({ currentPassword: "old1", newPassword: "new1234", confirmPassword: "different" });
    expect(result.success).toBe(false);
  });
  it("rejects short new password", () => {
    const result = changePasswordSchema.safeParse({ currentPassword: "old1", newPassword: "ab", confirmPassword: "ab" });
    expect(result.success).toBe(false);
  });
});

describe("adminResetPasswordSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  it("accepts valid input", () => {
    const result = adminResetPasswordSchema.safeParse({ userId: validUuid, newPassword: "pass1234" });
    expect(result.success).toBe(true);
  });
  it("rejects short password", () => {
    const result = adminResetPasswordSchema.safeParse({ userId: validUuid, newPassword: "ab" });
    expect(result.success).toBe(false);
  });
});
