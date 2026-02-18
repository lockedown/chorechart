import { getChores, deleteChore } from "@/lib/actions";
import { Nav } from "@/components/nav";
import { requireAdmin } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { CreateChoreForm } from "@/components/create-chore-form";

export default async function ChoresPage() {
  await requireAdmin();
  const chores = await getChores();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Nav role="admin" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Chores</h2>
          <p className="text-muted-foreground mt-1">Define chores that can be assigned to children.</p>
        </div>

        {/* Create chore form */}
        <Card>
          <CardContent className="py-6">
            <CreateChoreForm />
          </CardContent>
        </Card>

        {/* Chores list */}
        {chores.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No chores defined yet. Use the form above to create your first chore.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {chores.map((chore) => (
              <Card key={chore.id}>
                <CardContent className="flex items-start sm:items-center justify-between gap-3 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{chore.title}</p>
                      <Badge variant="outline" className="capitalize text-xs">
                        {chore.frequency === "weekly" && chore.day_of_week !== null
                          ? `Weekly (${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][chore.day_of_week]})`
                          : chore.frequency}
                      </Badge>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">£{chore.value.toFixed(2)}</Badge>
                    </div>
                    {chore.description && (
                      <p className="text-sm text-muted-foreground mt-1">{chore.description}</p>
                    )}
                    {chore.assignments.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Assigned to: {chore.assignments.map((a) => a.child_name).join(", ")}
                      </p>
                    )}
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await deleteChore(chore.id);
                    }}
                  >
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
