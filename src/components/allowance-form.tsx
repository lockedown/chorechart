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
  currentStartDate: string | null;
}

export function AllowanceForm({ childId, currentAmount, currentFrequency, currentStartDate }: AllowanceFormProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [amount, setAmount] = useState(currentAmount > 0 ? currentAmount.toString() : "");
  const [frequency, setFrequency] = useState(currentFrequency);
  const [startDate, setStartDate] = useState(currentStartDate || todayStr);

  const isActive = currentFrequency !== "none" && currentAmount > 0;

  return (
    <div className="space-y-3">
      <form
        action={async () => {
          const amt = parseFloat(amount) || 0;
          if (frequency !== "none" && amt <= 0) {
            toast.error("Please enter an amount greater than £0");
            return;
          }
          await updateAllowance(childId, amt, frequency, startDate);
          toast.success(frequency === "none" ? "Allowance removed" : `Allowance set to £${amt.toFixed(2)}/${frequency === "weekly" ? "week" : "month"} from ${startDate}`);
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
            disabled={frequency === "none"}
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
        {frequency !== "none" && (
          <div className="w-40">
            <Label htmlFor="allowance-start">Start date</Label>
            <Input
              id="allowance-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        )}
        <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
          {frequency === "none" && isActive ? "Remove Allowance" : "Save"}
        </Button>
      </form>
      {isActive && currentStartDate && (
        <p className="text-xs text-muted-foreground">
          Active since {currentStartDate} · £{currentAmount.toFixed(2)}/{currentFrequency === "weekly" ? "week" : "month"}
        </p>
      )}
    </div>
  );
}
