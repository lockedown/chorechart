import Link from "next/link";
import { getDashboardStats } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ListChecks, Wallet, Gift } from "lucide-react";
import { Nav } from "@/components/nav";
import { requireAdmin } from "@/lib/auth";

interface DashboardChild {
  id: string;
  name: string;
  avatar: string;
  balance: number;
}

export default async function DashboardPage() {
  await requireAdmin();
  const stats = await getDashboardStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50">
      <Nav role="admin" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Overview of chores, pocket money, and rewards.</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/children">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Children</CardTitle>
                <Users className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.children.length}</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/approvals">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
                <ListChecks className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingApprovals + stats.pendingProposals}</div>
                {stats.pendingProposals > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.pendingApprovals} chores · {stats.pendingProposals} proposals
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
              <Wallet className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{stats.totalBalance.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Link href="/rewards">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rewards</CardTitle>
                <Gift className="h-4 w-4 text-pink-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.rewardCount}</div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Children overview */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Children</h3>
            <Link href="/children" className="text-sm text-violet-600 hover:underline">
              Manage &rarr;
            </Link>
          </div>
          {stats.children.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No children added yet.{" "}
                <Link href="/children" className="text-violet-600 hover:underline">Add your first child</Link>.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.children.map((child: DashboardChild) => (
                <Link key={child.id} href={`/children/${child.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center text-xl">
                        {child.avatar || child.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{child.name}</p>
                        <p className="text-sm text-muted-foreground">Balance: <Badge variant="secondary">£{child.balance.toFixed(2)}</Badge></p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/chores">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-amber-200 bg-amber-50/50">
              <CardContent className="py-6 text-center">
                <ListChecks className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                <p className="font-semibold">Manage Chores</p>
                <p className="text-sm text-muted-foreground">{stats.totalChores} chores defined</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/rewards">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-pink-200 bg-pink-50/50">
              <CardContent className="py-6 text-center">
                <Gift className="h-8 w-8 mx-auto mb-2 text-pink-500" />
                <p className="font-semibold">Manage Rewards</p>
                <p className="text-sm text-muted-foreground">{stats.rewardCount} rewards available</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/children">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-violet-200 bg-violet-50/50">
              <CardContent className="py-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-violet-500" />
                <p className="font-semibold">Manage Children</p>
                <p className="text-sm text-muted-foreground">{stats.children.length} children</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
