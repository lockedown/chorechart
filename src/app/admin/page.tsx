import {
  adminGetAllData,
  adminResetAllBalances,
  adminSetBalance,
  adminUpdateChore,
  adminUpdateReward,
  adminOverrideAssignment,
  adminDeleteAssignment,
  adminDeleteTransaction,
  adminDeleteAllAssignments,
  adminNukeDatabase,
} from "@/lib/actions";
import { requireAdmin, getUsers, adminResetUserPassword, changePassword } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, AlertTriangle, RotateCcw, PoundSterling, Shield } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";

export default async function AdminPage() {
  await requireAdmin();
  const [data, users] = await Promise.all([adminGetAllData(), getUsers()]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      <Nav role="admin" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Control Panel</h2>
            <p className="text-muted-foreground mt-1">Override balances, edit entries, and manage the database.</p>
          </div>
        </div>

        {/* Danger zone */}
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <form action={async () => { "use server"; await adminResetAllBalances(); }}>
              <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                <RotateCcw className="h-4 w-4 mr-2" /> Reset All Balances to £0
              </Button>
            </form>
            <form action={async () => { "use server"; await adminDeleteAllAssignments(); }}>
              <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                <Trash2 className="h-4 w-4 mr-2" /> Delete All Chore Assignments
              </Button>
            </form>
            <ConfirmButton
              action={async () => { "use server"; await adminNukeDatabase(); }}
              label="Wipe Entire Database"
              confirmMessage="This will permanently delete ALL children, chores, assignments, transactions, rewards, and claims. Are you absolutely sure?"
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="balances" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max sm:w-auto">
              <TabsTrigger value="balances">Balances</TabsTrigger>
              <TabsTrigger value="chores">Chores</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="rewards">Rewards</TabsTrigger>
              <TabsTrigger value="claims">Claims</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>
          </div>

          {/* ─── Balances Tab ─── */}
          <TabsContent value="balances" className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <PoundSterling className="h-4 w-4" /> Set Child Balances
            </h3>
            {data.children.length === 0 ? (
              <p className="text-sm text-muted-foreground">No children in the database.</p>
            ) : (
              <div className="space-y-3">
                {data.children.map((child) => (
                  <Card key={child.id}>
                    <CardContent className="py-4">
                      <form action={adminSetBalance} className="flex items-center gap-4">
                        <input type="hidden" name="childId" value={child.id} />
                        <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-lg">
                          {child.avatar || child.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{child.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Current: <span className="font-semibold text-green-600">£{child.balance.toFixed(2)}</span>
                          </p>
                        </div>
                        <div className="w-32">
                          <Label htmlFor={`bal-${child.id}`} className="sr-only">New Balance</Label>
                          <Input
                            id={`bal-${child.id}`}
                            name="balance"
                            type="number"
                            step="0.01"
                            defaultValue={child.balance.toFixed(2)}
                            required
                          />
                        </div>
                        <Button type="submit" size="sm" className="bg-violet-600 hover:bg-violet-700">Set</Button>
                      </form>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Chores Tab ─── */}
          <TabsContent value="chores" className="space-y-4">
            <h3 className="font-semibold">Edit Chores</h3>
            {data.chores.length === 0 ? (
              <p className="text-sm text-muted-foreground">No chores in the database.</p>
            ) : (
              <div className="space-y-3">
                {data.chores.map((chore) => (
                  <Card key={chore.id}>
                    <CardContent className="py-4">
                      <form action={adminUpdateChore} className="space-y-3">
                        <input type="hidden" name="choreId" value={chore.id} />
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="flex-1 min-w-[180px]">
                            <Label htmlFor={`ct-${chore.id}`}>Title</Label>
                            <Input id={`ct-${chore.id}`} name="title" defaultValue={chore.title} required />
                          </div>
                          <div className="w-28">
                            <Label htmlFor={`cv-${chore.id}`}>Value (£)</Label>
                            <Input id={`cv-${chore.id}`} name="value" type="number" step="0.01" defaultValue={chore.value} required />
                          </div>
                          <div className="w-36">
                            <Label htmlFor={`cf-${chore.id}`}>Frequency</Label>
                            <select
                              id={`cf-${chore.id}`}
                              name="frequency"
                              defaultValue={chore.frequency}
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                            >
                              <option value="one-off">One-off</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                            </select>
                          </div>
                          <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600">Save</Button>
                        </div>
                        <div>
                          <Label htmlFor={`cd-${chore.id}`}>Description</Label>
                          <Input id={`cd-${chore.id}`} name="description" defaultValue={chore.description} />
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Assignments Tab ─── */}
          <TabsContent value="assignments" className="space-y-4">
            <h3 className="font-semibold">Chore Assignments</h3>
            {data.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No chore assignments.</p>
            ) : (
              <div className="space-y-2">
                {data.assignments.map((a) => (
                  <Card key={a.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {a.child_name} &rarr; {a.chore_title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className={
                              a.status === "approved"
                                ? "bg-green-100 text-green-700"
                                : a.status === "completed"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                            }
                          >
                            {a.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">£{a.chore_value.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <form action={adminOverrideAssignment} className="flex items-center gap-1">
                          <input type="hidden" name="assignmentId" value={a.id} />
                          <select
                            name="status"
                            defaultValue={a.status}
                            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                          >
                            <option value="pending">pending</option>
                            <option value="completed">completed</option>
                            <option value="approved">approved</option>
                          </select>
                          <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
                            Override
                          </Button>
                        </form>
                        <form action={async () => { "use server"; await adminDeleteAssignment(a.id); }}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Transactions Tab ─── */}
          <TabsContent value="transactions" className="space-y-4">
            <h3 className="font-semibold">All Transactions</h3>
            <p className="text-xs text-muted-foreground">Deleting a transaction reverses its balance effect.</p>
            {data.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions.</p>
            ) : (
              <div className="space-y-2">
                {data.transactions.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{t.child_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.description || t.type} &middot; {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold text-sm ${t.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {t.amount >= 0 ? "+" : ""}£{t.amount.toFixed(2)}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">{t.type}</Badge>
                        <form action={async () => { "use server"; await adminDeleteTransaction(t.id); }}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Rewards Tab ─── */}
          <TabsContent value="rewards" className="space-y-4">
            <h3 className="font-semibold">Edit Rewards</h3>
            {data.rewards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rewards in the database.</p>
            ) : (
              <div className="space-y-3">
                {data.rewards.map((reward) => (
                  <Card key={reward.id}>
                    <CardContent className="py-4">
                      <form action={adminUpdateReward} className="space-y-3">
                        <input type="hidden" name="rewardId" value={reward.id} />
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="flex-1 min-w-[180px]">
                            <Label htmlFor={`rt-${reward.id}`}>Title</Label>
                            <Input id={`rt-${reward.id}`} name="title" defaultValue={reward.title} required />
                          </div>
                          <div className="w-28">
                            <Label htmlFor={`rc-${reward.id}`}>Cost (£)</Label>
                            <Input id={`rc-${reward.id}`} name="cost" type="number" step="0.01" defaultValue={reward.cost} required />
                          </div>
                          <div className="w-20">
                            <Label htmlFor={`ri-${reward.id}`}>Icon</Label>
                            <Input id={`ri-${reward.id}`} name="icon" defaultValue={reward.icon} maxLength={2} />
                          </div>
                          <Button type="submit" size="sm" className="bg-pink-600 hover:bg-pink-700">Save</Button>
                        </div>
                        <div>
                          <Label htmlFor={`rd-${reward.id}`}>Description</Label>
                          <Input id={`rd-${reward.id}`} name="description" defaultValue={reward.description} />
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Reward Claims Tab ─── */}
          <TabsContent value="claims" className="space-y-4">
            <h3 className="font-semibold">Reward Claims</h3>
            {data.rewardClaims.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reward claims.</p>
            ) : (
              <div className="space-y-2">
                {data.rewardClaims.map((claim) => (
                  <Card key={claim.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-sm">{claim.child_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Claimed: {claim.reward_title} &middot; {new Date(claim.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-pink-100 text-pink-700">Claimed</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          {/* ─── Users Tab ─── */}
          <TabsContent value="users" className="space-y-6">
            {/* Change own password */}
            <Card>
              <CardHeader><CardTitle className="text-base">Change Admin Password</CardTitle></CardHeader>
              <CardContent>
                <form action={async (formData: FormData) => { "use server"; await changePassword(formData); }} className="flex flex-wrap items-end gap-3">
                  <div className="w-44">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" name="currentPassword" type="password" required />
                  </div>
                  <div className="w-44">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" name="newPassword" type="password" required minLength={4} />
                  </div>
                  <div className="w-44">
                    <Label htmlFor="confirmPassword">Confirm</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={4} />
                  </div>
                  <Button type="submit" size="sm" className="bg-violet-600 hover:bg-violet-700">Update</Button>
                </form>
              </CardContent>
            </Card>

            {/* User list */}
            <div>
              <h3 className="font-semibold mb-3">All User Accounts</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Child accounts are auto-created when you add a child. Default password is the child&apos;s name (lowercase).
              </p>
              <div className="space-y-2">
                {users.map((u) => (
                  <Card key={u.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{u.username}</p>
                          <Badge
                            variant="secondary"
                            className={u.role === "admin" ? "bg-red-100 text-red-700" : "bg-violet-100 text-violet-700"}
                          >
                            {u.role}
                          </Badge>
                        </div>
                        {u.child_name && (
                          <p className="text-xs text-muted-foreground">Linked to: {u.child_name}</p>
                        )}
                      </div>
                      {u.role !== "admin" && (
                        <form action={async (formData: FormData) => { "use server"; await adminResetUserPassword(formData); }} className="flex items-center gap-2">
                          <input type="hidden" name="userId" value={u.id} />
                          <Input name="newPassword" type="password" placeholder="New password" className="w-36 h-8 text-xs" required minLength={4} />
                          <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">Reset</Button>
                        </form>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
