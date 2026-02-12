import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getChild, getRewards, markChoreDone, claimReward, getChildProposals, childAcceptCounter, childDeclineCounter } from "@/lib/actions";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, Award, Gift, Plus, Minus, Lightbulb } from "lucide-react";
import { ProposalForm } from "@/components/proposal-form";

export default async function MyPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role === "admin") redirect("/");
  if (!session.user.child_id) redirect("/login");

  const [child, rewards, proposals] = await Promise.all([
    getChild(session.user.child_id),
    getRewards(),
    getChildProposals(session.user.child_id),
  ]);

  if (!child) redirect("/login");

  const today = new Date().toISOString().split("T")[0];
  const pendingChores = child.assignedChores.filter(
    (a) => a.status === "pending" && (!a.due_date || a.due_date <= today)
  );
  const upcomingChores = child.assignedChores.filter(
    (a) => a.status === "pending" && a.due_date && a.due_date > today
  );
  const completedChores = child.assignedChores.filter((a) => a.status === "completed");
  const approvedChores = child.assignedChores.filter((a) => a.status === "approved");

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50">
      <Nav role="child" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-violet-100 flex items-center justify-center text-2xl sm:text-3xl">
            {child.avatar || child.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Hi, {child.name}!</h2>
            <p className="text-muted-foreground">
              Your balance: <span className="text-lg font-semibold text-green-600">£{child.balance.toFixed(2)}</span>
            </p>
          </div>
        </div>

        <Tabs defaultValue="chores" className="space-y-6">
          <TabsList>
            <TabsTrigger value="chores">My Chores</TabsTrigger>
            <TabsTrigger value="propose">Propose</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* ─── Chores Tab ─── */}
          <TabsContent value="chores" className="space-y-6">
            {/* Pending */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" /> To Do ({pendingChores.length})
              </h3>
              {pendingChores.length === 0 ? (
                <p className="text-sm text-muted-foreground">No chores to do right now!</p>
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
                            <CheckCircle className="h-4 w-4 mr-1" /> Done!
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming (future recurring chores) */}
            {upcomingChores.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-violet-400" /> Upcoming ({upcomingChores.length})
                </h3>
                <div className="space-y-2">
                  {upcomingChores.slice(0, 7).map((a) => (
                    <Card key={a.id} className="opacity-60">
                      <CardContent className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium">{a.chore_title}</p>
                          <p className="text-sm text-muted-foreground">
                            £{a.chore_value.toFixed(2)}
                            {a.due_date && ` · ${new Date(a.due_date).toLocaleDateString()}`}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-violet-100 text-violet-700">Upcoming</Badge>
                      </CardContent>
                    </Card>
                  ))}
                  {upcomingChores.length > 7 && (
                    <p className="text-xs text-muted-foreground text-center">
                      + {upcomingChores.length - 7} more upcoming
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Waiting for approval */}
            {completedChores.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-blue-500" /> Waiting for Approval ({completedChores.length})
                </h3>
                <div className="space-y-2">
                  {completedChores.map((a) => (
                    <Card key={a.id} className="opacity-70">
                      <CardContent className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium">{a.chore_title}</p>
                          <p className="text-sm text-muted-foreground">£{a.chore_value.toFixed(2)}</p>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">Waiting</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recently approved */}
            {approvedChores.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" /> Completed ({approvedChores.length})
                </h3>
                <div className="space-y-2">
                  {approvedChores.slice(0, 5).map((a) => (
                    <Card key={a.id} className="opacity-60">
                      <CardContent className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium">{a.chore_title}</p>
                          <p className="text-sm text-muted-foreground">£{a.chore_value.toFixed(2)}</p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">Approved</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ─── Propose Tab ─── */}
          <TabsContent value="propose" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Propose a Chore</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Suggest a chore and how much you think it&apos;s worth. Your parent can accept, counter, or decline.</p>
                <ProposalForm childId={child.id} />
              </CardContent>
            </Card>

            {proposals.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">My Proposals</h3>
                <div className="space-y-2">
                  {proposals.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{p.title}</p>
                            {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                            <p className="text-sm mt-1">
                              Your ask: <span className="font-semibold">£{p.requested_value.toFixed(2)}</span>
                              {p.admin_value !== null && (
                                <> · Counter offer: <span className="font-semibold text-amber-600">£{p.admin_value.toFixed(2)}</span></>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {p.status === "pending" && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700">Pending</Badge>
                            )}
                            {p.status === "countered" && (
                              <div className="flex gap-2">
                                <form action={async () => { "use server"; await childAcceptCounter(p.id); }}>
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700">Accept £{p.admin_value?.toFixed(2)}</Button>
                                </form>
                                <form action={async () => { "use server"; await childDeclineCounter(p.id); }}>
                                  <Button size="sm" variant="outline" className="text-red-600 border-red-300">Decline</Button>
                                </form>
                              </div>
                            )}
                            {p.status === "accepted" && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">Accepted</Badge>
                            )}
                            {p.status === "rejected" && (
                              <Badge variant="secondary" className="bg-red-100 text-red-700">Rejected</Badge>
                            )}
                            {p.status === "declined" && (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-700">Declined</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ─── Rewards Tab ─── */}
          <TabsContent value="rewards" className="space-y-6">
            <h3 className="font-semibold">Spend Your Money</h3>
            {rewards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rewards available yet.</p>
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

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">My Claimed Rewards</h3>
              {child.rewardClaims.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rewards claimed yet. Keep saving!</p>
              ) : (
                <div className="space-y-2">
                  {child.rewardClaims.map((claim) => (
                    <Card key={claim.id} className="opacity-70">
                      <CardContent className="flex items-center justify-between py-3">
                        <p className="font-medium">{claim.reward_title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(claim.created_at).toLocaleDateString()}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── History Tab ─── */}
          <TabsContent value="history" className="space-y-4">
            <h3 className="font-semibold">Transaction History</h3>
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
