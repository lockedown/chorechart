"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateAllowance } from "@/lib/actions";

interface AllowanceFormProps {
  childId: string;
  currentAmount: number;
  currentFrequency: string;
}

export function AllowanceForm({ childId, currentAmount, currentFrequency }: AllowanceFormProps) {
  const [amount, setAmount] = useState(currentAmount.toString());
  const [frequency, setFrequency] = useState(currentFrequency);

  return (
    <form
      action={async () => {
        const amt = parseFloat(amount) || 0;
        await updateAllowance(childId, amt, frequency);
        toast.success(frequency === "none" ? "Allowance disabled" : `Allowance set to £${amt.toFixed(2)}/${frequency === "weekly" ? "week" : "month"}`);
      }}
      className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4"
    >
      <div className="w-32">
        <Label htmlFor="allowance-amount">Amount (£)</Label>
        <Input
          id="allowance-amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="w-40">
        <Label htmlFor="allowance-frequency">Frequency</Label>
        <select
          id="allowance-frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="none">None</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
        Save
      </Button>
    </form>
  );
}
