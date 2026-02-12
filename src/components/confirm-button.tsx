"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmButtonProps {
  action: () => Promise<void>;
  label: string;
  confirmMessage?: string;
}

export function ConfirmButton({
  action,
  label,
  confirmMessage = "Are you sure? This action cannot be undone.",
}: ConfirmButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!showConfirm) {
    return (
      <Button variant="destructive" onClick={() => setShowConfirm(true)}>
        <AlertTriangle className="h-4 w-4 mr-2" /> {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-red-300 bg-red-100 px-4 py-3">
      <div className="flex items-start gap-2 flex-1">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm font-medium text-red-800">{confirmMessage}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await action();
              setShowConfirm(false);
            });
          }}
        >
          {isPending ? "Wiping..." : "Yes, wipe everything"}
        </Button>
      </div>
    </div>
  );
}
