"use client";

import { useRef } from "react";
import { createSavingsGoal } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function SavingsGoalForm({ childId }: { childId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      action={async (formData) => { await createSavingsGoal(formData); formRef.current?.reset(); toast.success("Savings goal created!"); }}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="childId" value={childId} />
      <div className="flex-1 min-w-[160px]">
        <Label htmlFor="goal-title">Goal</Label>
        <Input id="goal-title" name="title" placeholder="e.g. New game" required />
      </div>
      <div className="w-32">
        <Label htmlFor="goal-amount">Target (£)</Label>
        <Input id="goal-amount" name="targetAmount" type="number" step="0.01" min="0.01" placeholder="20.00" required />
      </div>
      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Set Goal</Button>
    </form>
  );
}
