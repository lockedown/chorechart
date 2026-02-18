"use client";

import { useRef } from "react";
import { adminCounterProposal } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function CounterForm({ proposalId }: { proposalId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      action={async (formData) => { await adminCounterProposal(formData); formRef.current?.reset(); toast.success("Counter offer sent!"); }}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="proposalId" value={proposalId} />
      <Input name="adminValue" type="number" step="0.01" min="0.01" placeholder="£" className="w-20 h-8 text-sm" required />
      <Button size="sm" variant="outline" className="text-amber-600 border-amber-300">Counter</Button>
    </form>
  );
}
