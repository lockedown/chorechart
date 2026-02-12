import { getChores, createChore, deleteChore } from "@/lib/actions";
import { Nav } from "@/components/nav";
import { requireAdmin } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

export default async function ChoresPage() {
  await requireAdmin();
  const chores = await getChores();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50">
      <Nav role="admin" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Chores</h2>
          <p className="text-muted-foreground mt-1">Define chores that can be assigned to children.</p>
        </div>

        {/* Create chore form */}
        <Card>
          <CardContent className="py-6">
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
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="one-off">One-off</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea id="description" name="description" placeholder="Describe what needs to be done..." rows={2} />
              </div>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600">
                Create Chore
              </Button>
            </form>
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
                      <Badge variant="outline" className="capitalize text-xs">{chore.frequency}</Badge>
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
