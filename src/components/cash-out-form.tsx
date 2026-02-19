"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { requestCashOut } from "@/lib/actions";
import { Banknote } from "lucide-react";

interface CashOutFormProps {
  childId: string;
  balance: number;
}

export function CashOutForm({ childId, balance }: CashOutFormProps) {
  const [amount, setAmount] = useState("");

  return (
    <form
      action={async () => {
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) {
          toast.error("Please enter a valid amount");
          return;
        }
        if (amt > balance) {
          toast.error("You don't have enough balance");
          return;
        }
        await requestCashOut(childId, amt);
        setAmount("");
        toast.success(`Cash-out request for £${amt.toFixed(2)} submitted! Your parent will transfer it to your bank.`);
      }}
      className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4"
    >
      <div className="w-36">
        <Label htmlFor="cashout-amount">Amount (£)</Label>
        <Input
          id="cashout-amount"
          type="number"
          step="0.01"
          min="0.01"
          max={balance}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </div>
      <Button type="submit" className="bg-green-600 hover:bg-green-700 gap-1">
        <Banknote className="h-4 w-4" /> Cash Out
      </Button>
    </form>
  );
}
