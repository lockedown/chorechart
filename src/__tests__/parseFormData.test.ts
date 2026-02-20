import { describe, it, expect } from "vitest";
import { parseFormData, createChildSchema, addTransactionSchema, adminSetBalanceSchema } from "@/lib/schemas";

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    fd.append(k, v);
  }
  return fd;
}

describe("parseFormData", () => {
  it("parses string fields from FormData", () => {
    const fd = makeFormData({ name: "Emma", avatar: "🦄" });
    const result = parseFormData(createChildSchema, fd);
    expect(result).toEqual({ name: "Emma", avatar: "🦄" });
  });

  it("coerces numeric strings to numbers", () => {
    const fd = makeFormData({ childId: "550e8400-e29b-41d4-a716-446655440000", amount: "5.50", type: "bonus", description: "Good" });
    const result = parseFormData(addTransactionSchema, fd);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(5.5);
    expect(typeof result!.amount).toBe("number");
  });

  it("handles negative numbers for balance", () => {
    const fd = makeFormData({ childId: "550e8400-e29b-41d4-a716-446655440000", balance: "-10" });
    const result = parseFormData(adminSetBalanceSchema, fd);
    expect(result).not.toBeNull();
    expect(result!.balance).toBe(-10);
  });

  it("returns null for invalid input", () => {
    const fd = makeFormData({ name: "" });
    const result = parseFormData(createChildSchema, fd);
    expect(result).toBeNull();
  });

  it("returns null for completely missing fields", () => {
    const fd = makeFormData({});
    const result = parseFormData(createChildSchema, fd);
    expect(result).toBeNull();
  });
});
