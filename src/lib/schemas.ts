import { z } from "zod";

// ─── Children ───────────────────────────────────────────────

export const createChildSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  avatar: z.string().max(10).default(""),
});

// ─── Chores ─────────────────────────────────────────────────

export const createChoreSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).default(""),
  value: z.number().min(0),
  frequency: z.enum(["one-off", "daily", "weekly"]).default("one-off"),
  dayOfWeek: z.number().int().min(0).max(6).nullable().default(null),
});

export const assignChoreSchema = z.object({
  childId: z.string().uuid(),
  choreId: z.string().uuid(),
  endDate: z.string().default(""),
  dueDate: z.string().default(""),
});

// ─── Transactions ───────────────────────────────────────────

export const addTransactionSchema = z.object({
  childId: z.string().uuid(),
  amount: z.number().positive("Amount must be positive"),
  type: z.string().min(1),
  description: z.string().max(500).default(""),
});

// ─── Rewards ────────────────────────────────────────────────

export const createRewardSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).default(""),
  cost: z.number().min(0),
  icon: z.string().max(10).default(""),
});

export const claimRewardSchema = z.object({
  childId: z.string().uuid(),
  rewardId: z.string().uuid(),
});

// ─── Cash-Out ───────────────────────────────────────────────

export const requestCashOutSchema = z.object({
  childId: z.string().uuid(),
  amount: z.number().positive("Amount must be positive"),
});

// ─── Admin ──────────────────────────────────────────────────

export const adminSetBalanceSchema = z.object({
  childId: z.string().uuid(),
  balance: z.number(),
});

export const adminUpdateChoreSchema = z.object({
  choreId: z.string().uuid(),
  title: z.string().min(1).max(200),
  value: z.number().min(0),
  frequency: z.string().min(1),
  description: z.string().max(1000).default(""),
});

export const adminUpdateRewardSchema = z.object({
  rewardId: z.string().uuid(),
  title: z.string().min(1).max(200),
  cost: z.number().min(0),
  icon: z.string().max(10).default(""),
  description: z.string().max(1000).default(""),
});

export const adminOverrideAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  status: z.enum(["pending", "completed", "approved"]),
});

export const adminCounterProposalSchema = z.object({
  proposalId: z.string().uuid(),
  adminValue: z.number().min(0),
});

// ─── Allowance ──────────────────────────────────────────────

export const updateAllowanceSchema = z.object({
  childId: z.string().uuid(),
  amount: z.number().min(0),
  frequency: z.enum(["none", "weekly", "monthly"]),
  startDate: z.string().min(1),
});

// ─── Savings Goals ──────────────────────────────────────────

export const createSavingsGoalSchema = z.object({
  childId: z.string().uuid().nullable().default(null),
  title: z.string().min(1, "Title is required").max(200),
  targetAmount: z.number().positive("Target must be positive"),
});

// ─── Proposals ──────────────────────────────────────────────

export const createProposalSchema = z.object({
  childId: z.string().uuid().nullable().default(null),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).default(""),
  requestedValue: z.number().min(0),
});

// ─── Auth ───────────────────────────────────────────────────

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(4, "New password must be at least 4 characters"),
  confirmPassword: z.string().min(1),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const adminResetPasswordSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(4, "Password must be at least 4 characters"),
});

// ─── Helpers ────────────────────────────────────────────────

/** Extract FormData into a plain object, coercing numeric-looking strings to numbers. */
export function parseFormData<T>(
  schema: z.ZodType<T>,
  formData: FormData,
): T | null {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      // Try to coerce numeric strings so Zod number() fields work
      const trimmed = value.trim();
      if (trimmed !== "" && !isNaN(Number(trimmed))) {
        raw[key] = Number(trimmed);
      } else {
        raw[key] = value;
      }
    } else {
      raw[key] = value;
    }
  }
  const result = schema.safeParse(raw);
  return result.success ? result.data : null;
}
