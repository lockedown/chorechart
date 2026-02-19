import Link from "next/link";
import { getChildren, createChild, deleteChild } from "@/lib/actions";
import { Nav } from "@/components/nav";
import { requireAdmin } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

export default async function ChildrenPage() {
  await requireAdmin();
  const children = await getChildren();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Nav role="admin" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Children</h2>
          <p className="text-muted-foreground mt-1">Add and manage your children&apos;s profiles.</p>
        </div>

        {/* Add child form */}
        <Card>
          <CardContent className="py-6">
            <form action={createChild} className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
              <div className="flex-1 min-w-0 sm:min-w-[200px]">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="e.g. Emma" required />
              </div>
              <div className="w-24">
                <Label htmlFor="avatar">Avatar</Label>
                <Input id="avatar" name="avatar" placeholder="e.g. 😊" maxLength={2} />
              </div>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
                Add Child
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Children list */}
        {children.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No children added yet. Use the form above to add your first child.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child) => (
              <Card key={child.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Link href={`/children/${child.id}`} className="flex items-center gap-4 flex-1">
                      <div className="h-14 w-14 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-2xl">
                        {child.avatar || child.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{child.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Balance: <Badge variant="secondary">£{child.balance.toFixed(2)}</Badge>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {child.assignedChores.filter((a) => a.status === "pending").length} pending chores
                          {child.allowance_frequency !== "none" && child.allowance_amount > 0 && (
                            <span className="ml-1">· £{child.allowance_amount.toFixed(2)}/{child.allowance_frequency === "weekly" ? "wk" : "mo"}</span>
                          )}
                        </p>
                      </div>
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await deleteChild(child.id);
                      }}
                    >
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
