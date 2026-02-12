"use client";

import { useState } from "react";
import { assignChore } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChoreOption {
  id: string;
  title: string;
  value: number;
  frequency: string;
}

export function AssignChoreForm({ childId, chores }: { childId: string; chores: ChoreOption[] }) {
  const [selectedChoreId, setSelectedChoreId] = useState("");
  const selectedChore = chores.find((c) => c.id === selectedChoreId);
  const isRecurring = selectedChore?.frequency === "daily" || selectedChore?.frequency === "weekly";

  return (
    <form action={assignChore} className="flex flex-wrap items-end gap-4">
      <input type="hidden" name="childId" value={childId} />
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="choreId">Chore</Label>
        <select
          id="choreId"
          name="choreId"
          required
          value={selectedChoreId}
          onChange={(e) => setSelectedChoreId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Select a chore...</option>
          {chores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} (£{c.value.toFixed(2)}) — {c.frequency}
            </option>
          ))}
        </select>
      </div>
      {isRecurring ? (
        <div className="w-40">
          <Label htmlFor="endDate">End Date</Label>
          <Input id="endDate" name="endDate" type="date" required />
        </div>
      ) : (
        <div className="w-40">
          <Label htmlFor="dueDate">Date (optional)</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
      )}
      <Button type="submit" className="bg-violet-600 hover:bg-violet-700">Assign</Button>
    </form>
  );
}
