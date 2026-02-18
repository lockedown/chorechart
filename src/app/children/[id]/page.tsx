import Link from "next/link";
import { notFound } from "next/navigation";
import { getChild, getChores, getRewards, addTransaction, claimReward, markChoreDone, approveChore, getChildAchievements, getAllAchievements } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, Award, ArrowLeft, Plus, Minus, Gift, Medal } from "lucide-react";
import { AssignChoreForm } from "@/components/assign-chore-form";

export default async function ChildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [child, chores, rewards, achievements] = await Promise.all([
    getChild(id),
    getChores(),
    getRewards(),
    getChildAchievements(id),
  ]);
  const allAchievements = await getAllAchievements();
  const unlockedIds = new Set(achievements.map(a => a.id));

  if (!child) notFound();

  const pendingChores = child.assignedChores.filter((a) => a.status === "pending");
  const completedChores = child.assignedChores.filter((a) => a.status === "completed");
  const approvedChores = child.assignedChores.filter((a) => a.status === "approved");

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Nav role="admin" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/children">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-2xl sm:text-3xl">
            {child.avatar || child.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{child.name}</h2>
            <p className="text-muted-foreground">
              Balance: <span className="text-lg font-semibold text-green-600">£{child.balance.toFixed(2)}</span>
            </p>
          </div>
        </div>

        <Tabs defaultValue="chores" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max sm:w-auto">
              <TabsTrigger value="chores">Chores</TabsTrigger>
              <TabsTrigger value="money">Pocket Money</TabsTrigger>
              <TabsTrigger value="rewards">Rewards</TabsTrigger>
              <TabsTrigger value="achievements">Badges</TabsTrigger>
            </TabsList>
          </div>

          {/* ─── Chores Tab ─── */}
          <TabsContent value="chores" className="space-y-6">
            {/* Assign chore form */}
            <Card>
              <CardHeader><CardTitle className="text-base">Assign a Chore</CardTitle></CardHeader>
              <CardContent>
                {chores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No chores defined yet. <Link href="/chores" className="text-violet-600 hover:underline">Create chores first</Link>.
                  </p>
                ) : (
                  <AssignChoreForm
                    childId={child.id}
                    chores={chores.map((c) => ({ id: c.id, title: c.title, value: c.value, frequency: c.frequency }))}
                  />
                )}
              </CardContent>
            </Card>

            {/* Pending chores */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" /> Pending ({pendingChores.length})
              </h3>
              {pendingChores.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending chores.</p>
              ) : (
                <div className="space-y-2">
                  {pendingChores.map((a) => (
                    <Card key={a.id}>
                      <CardContent className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium">{a.chore_title}</p>
                          <p className="text-sm text-muted-foreground">
                            £{a.chore_value.toFixed(2)}
                            {a.due_date && ` · Due: ${new Date(a.due_date).toLocaleDateString()}`}
                          </p>
                        </div>
                        <form action={async () => { "use server"; await markChoreDone(a.id); }}>
                          <Button size="sm" variant="outline" className="text-amber-600 border-amber-300">
                            <CheckCircle className="h-4 w-4 mr-1" /> Mark Done
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Awaiting approval */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-500" /> Awaiting Approval ({completedChores.length})
              </h3>
              {completedChores.length === 0 ? (
                <p className="text-sm text-muted-foreground">No chores awaiting approval.</p>
              ) : (
                <div className="space-y-2">
                  {completedChores.map((a) => (
                    <Card key={a.id}>
                      <CardContent className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium">{a.chore_title}</p>
                          <p className="text-sm text-muted-foreground">
                            £{a.chore_value.toFixed(2)} · Completed {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : ""}
                          </p>
                        </div>
                        <form action={async () => { "use server"; await approveChore(a.id); }}>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-4 w-4 mr-1" /> Approve
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Approved */}
            {approvedChores.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" /> Approved ({approvedChores.length})
                </h3>
                <div className="space-y-2">
                  {approvedChores.slice(0, 10).map((a) => (
                    <Card key={a.id} className="opacity-70">
                      <CardContent className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium">{a.chore_title}</p>
                          <p className="text-sm text-muted-foreground">
                            £{a.chore_value.toFixed(2)} · Approved {a.approved_at ? new Date(a.approved_at).toLocaleDateString() : ""}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">Approved</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ─── Pocket Money Tab ─── */}
          <TabsContent value="money" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Add Bonus / Deduction</CardTitle></CardHeader>
              <CardContent>
                <form action={addTransaction} className="flex flex-wrap items-end gap-4">
                  <input type="hidden" name="childId" value={child.id} />
                  <div className="w-32">
                    <Label htmlFor="amount">Amount (£)</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
                  </div>
                  <div className="w-40">
                    <Label htmlFor="type">Type</Label>
                    <select
                      id="type"
                      name="type"
                      required
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="bonus">Bonus</option>
                      <option value="deduction">Deduction</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" name="description" placeholder="e.g. Birthday money" />
                  </div>
                  <Button type="submit" className="bg-violet-600 hover:bg-violet-700">Add</Button>
                </form>
              </CardContent>
            </Card>

            <div>
              <h3 className="font-semibold mb-3">Transaction History</h3>
              {child.transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions yet.</p>
              ) : (
                <div className="space-y-2">
                  {child.transactions.map((t) => (
                    <Card key={t.id}>
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${t.amount >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                            {t.amount >= 0 ? <Plus className="h-4 w-4 text-green-600" /> : <Minus className="h-4 w-4 text-red-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{t.description || t.type}</p>
                            <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className={`font-semibold ${t.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {t.amount >= 0 ? "+" : ""}£{t.amount.toFixed(2)}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── Rewards Tab ─── */}
          <TabsContent value="rewards" className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Available Rewards</h3>
              {rewards.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No rewards defined yet. <Link href="/rewards" className="text-violet-600 hover:underline">Create rewards first</Link>.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rewards.map((r) => {
                    const canAfford = child.balance >= r.cost;
                    return (
                      <Card key={r.id} className={!canAfford ? "opacity-60" : ""}>
                        <CardContent className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center text-lg">
                              {r.icon || <Gift className="h-5 w-5 text-pink-500" />}
                            </div>
                            <div>
                              <p className="font-medium">{r.title}</p>
                              <p className="text-sm text-muted-foreground">£{r.cost.toFixed(2)}</p>
                            </div>
                          </div>
                          <form action={async () => { "use server"; await claimReward(child.id, r.id); }}>
                            <Button size="sm" disabled={!canAfford} className="bg-pink-600 hover:bg-pink-700">
                              Claim
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Claimed Rewards</h3>
              {child.rewardClaims.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rewards claimed yet.</p>
              ) : (
                <div className="space-y-2">
                  {child.rewardClaims.map((claim) => (
                    <Card key={claim.id} className="opacity-70">
                      <CardContent className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium">{claim.reward_title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(claim.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge variant="secondary" className="bg-pink-100 text-pink-700">Claimed</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          {/* ─── Achievements Tab ─── */}
          <TabsContent value="achievements" className="space-y-6">
            <div>
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <Medal className="h-4 w-4 text-amber-500" /> Achievements
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{achievements.length} of {allAchievements.length} unlocked</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {allAchievements.map((a) => {
                  const unlocked = unlockedIds.has(a.id);
                  return (
                    <Card key={a.id} className={unlocked ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30" : "opacity-40 grayscale"}>
                      <CardContent className="py-4 text-center">
                        <div className="text-3xl mb-2">{a.icon}</div>
                        <p className="font-semibold text-sm">{a.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                        {unlocked && (
                          <Badge variant="secondary" className="mt-2 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs">
                            Unlocked
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
