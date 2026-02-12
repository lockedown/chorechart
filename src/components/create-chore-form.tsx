"use client";

import { useState } from "react";
import { createChore } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function CreateChoreForm() {
  const [frequency, setFrequency] = useState("one-off");

  return (
    <form action={createChore} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
        <div className="flex-1 min-w-0 sm:min-w-[200px]">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" placeholder="e.g. Make the bed" required />
        </div>
        <div className="w-32">
          <Label htmlFor="value">Value (£)</Label>
          <Input id="value" name="value" type="number" step="0.01" min="0" placeholder="1.00" required />
        </div>
        <div className="w-40">
          <Label htmlFor="frequency">Frequency</Label>
          <select
            id="frequency"
            name="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="one-off">One-off</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        {frequency === "weekly" && (
          <div className="w-40">
            <Label htmlFor="dayOfWeek">Day of Week</Label>
            <select
              id="dayOfWeek"
              name="dayOfWeek"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {DAYS.map((day, i) => (
                <option key={i} value={i}>{day}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" placeholder="Describe what needs to be done..." rows={2} />
      </div>
      <Button type="submit" className="bg-amber-500 hover:bg-amber-600">
        Create Chore
      </Button>
    </form>
  );
}
