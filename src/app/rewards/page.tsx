import { getRewards, createReward, deleteReward } from "@/lib/actions";
import { Nav } from "@/components/nav";
import { requireAdmin } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Gift } from "lucide-react";

export default async function RewardsPage() {
  await requireAdmin();
  const rewards = await getRewards();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50">
      <Nav role="admin" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Rewards</h2>
          <p className="text-muted-foreground mt-1">Define rewards that children can save up for and claim.</p>
        </div>

        {/* Create reward form */}
        <Card>
          <CardContent className="py-6">
            <form action={createReward} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
                <div className="flex-1 min-w-0 sm:min-w-[200px]">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" placeholder="e.g. Extra screen time" required />
                </div>
                <div className="w-32">
                  <Label htmlFor="cost">Cost (£)</Label>
                  <Input id="cost" name="cost" type="number" step="0.01" min="0.01" placeholder="5.00" required />
                </div>
                <div className="w-24">
                  <Label htmlFor="icon">Icon</Label>
                  <Input id="icon" name="icon" placeholder="e.g. 🎮" maxLength={2} />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea id="description" name="description" placeholder="Describe the reward..." rows={2} />
              </div>
              <Button type="submit" className="bg-pink-600 hover:bg-pink-700">
                Create Reward
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Rewards list */}
        {rewards.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No rewards defined yet. Use the form above to create your first reward.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <Card key={reward.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-pink-100 flex items-center justify-center text-xl">
                        {reward.icon || <Gift className="h-6 w-6 text-pink-500" />}
                      </div>
                      <div>
                        <p className="font-semibold">{reward.title}</p>
                        <Badge variant="secondary" className="bg-pink-100 text-pink-700">
                          £{reward.cost.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                    <form
                      action={async () => {
                        "use server";
                        await deleteReward(reward.id);
                      }}
                    >
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                  {reward.description && (
                    <p className="text-sm text-muted-foreground mt-2">{reward.description}</p>
                  )}
                  {reward.claim_count > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Claimed {reward.claim_count} time{reward.claim_count !== 1 ? "s" : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
