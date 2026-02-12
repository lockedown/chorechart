"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Users,
  ListChecks,
  Gift,
  Shield,
  ClipboardList,
  ClipboardCheck,
} from "lucide-react";
import { logout } from "@/lib/auth";

const adminLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/children", label: "Children", icon: Users },
  { href: "/chores", label: "Chores", icon: ListChecks },
  { href: "/rewards", label: "Rewards", icon: Gift },
  { href: "/admin", label: "Admin", icon: Shield },
];

const childLinks = [
  { href: "/my", label: "My Chores", icon: ClipboardList },
];

function isActive(pathname: string, href: string) {
  if (href === "/" || href === "/my") return pathname === href;
  return pathname.startsWith(href);
}

export function Nav({ role = "admin" }: { role?: "admin" | "child" }) {
  const pathname = usePathname();
  const links = role === "admin" ? adminLinks : childLinks;
  const [open, setOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href={role === "admin" ? "/" : "/my"}>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-amber-500 bg-clip-text text-transparent">
              ChoreChart
            </h1>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex gap-6 text-sm font-medium">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "transition-colors",
                    isActive(pathname, link.href)
                      ? "text-violet-600"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <form action={logout}>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            </form>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile slide-down menu */}
      {open && (
        <div className="md:hidden fixed inset-0 top-[53px] z-20">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          {/* Menu panel */}
          <nav className="relative bg-white border-b shadow-lg">
            <div className="max-w-6xl mx-auto px-4 py-3 space-y-1">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive(pathname, link.href)
                        ? "bg-violet-50 text-violet-600"
                        : "text-muted-foreground hover:bg-gray-50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
              <div className="pt-2 border-t mt-2">
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors w-full"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </form>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
