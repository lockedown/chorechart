"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ToastButtonProps {
  action: () => Promise<void>;
  message: string;
  children: React.ReactNode;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  disabled?: boolean;
}

export function ToastButton({ action, message, children, size = "sm", variant = "default", className, disabled }: ToastButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <form action={() => startTransition(async () => { await action(); toast.success(message); })}>
      <Button type="submit" size={size} variant={variant} className={className} disabled={disabled || pending}>
        {pending ? "..." : children}
      </Button>
    </form>
  );
}
