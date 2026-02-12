"use client";

import { createProposal } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProposalForm({ childId }: { childId: string }) {
  return (
    <form action={createProposal} className="space-y-4">
      <input type="hidden" name="childId" value={childId} />
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
        <div className="flex-1 min-w-0 sm:min-w-[200px]">
          <Label htmlFor="proposal-title">What do you want to do?</Label>
          <Input id="proposal-title" name="title" placeholder="e.g. Wash the car" required />
        </div>
        <div className="w-32">
          <Label htmlFor="proposal-value">Your Price (£)</Label>
          <Input id="proposal-value" name="requestedValue" type="number" step="0.01" min="0.01" placeholder="5.00" required />
        </div>
      </div>
      <div>
        <Label htmlFor="proposal-desc">Description (optional)</Label>
        <Textarea id="proposal-desc" name="description" placeholder="Describe what you'll do..." rows={2} />
      </div>
      <Button type="submit" className="bg-amber-500 hover:bg-amber-600">
        Propose Chore
      </Button>
    </form>
  );
}
