import { getPendingApprovals, approveChore, adminApproveProposal, adminCounterProposal, adminRejectProposal, getPendingCashOuts, approveCashOut, rejectCashOut } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Lightbulb, Banknote } from "lucide-react";
import Link from "next/link";
import { ToastButton } from "@/components/toast-button";
import { CounterForm } from "@/components/counter-form";

export default async function ApprovalsPage() {
  await requireAdmin();
  const [{ choreApprovals, proposals }, cashOuts] = await Promise.all([
    getPendingApprovals(),
    getPendingCashOuts(),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Nav role="admin" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Approvals</h2>
          <p className="text-muted-foreground mt-1">Review completed chores, proposals, and cash-out requests.</p>
        </div>

        {/* Chore Approvals */}
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-amber-500" /> Chore Approvals ({choreApprovals.length})
          </h3>
          {choreApprovals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No chores waiting for approval.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {choreApprovals.map((a) => (
                <Card key={a.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-lg">
                        {a.child_avatar || a.child_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{a.chore_title}</p>
                        <p className="text-sm text-muted-foreground">
                          <Link href={`/children/${a.child_id}`} className="text-violet-600 hover:underline">{a.child_name}</Link>
                          {" · "}£{a.chore_value.toFixed(2)}
                          {a.completed_at && ` · Completed ${new Date(a.completed_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <ToastButton action={async () => { "use server"; await approveChore(a.id); }} message="Chore approved!" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve
                    </ToastButton>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Chore Proposals */}
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" /> Chore Proposals ({proposals.length})
          </h3>
          {proposals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No proposals to review.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {proposals.map((p) => (
                <Card key={p.id}>
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{p.title}</p>
                          <Badge variant="outline" className="text-xs">{p.child_name}</Badge>
                        </div>
                        {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                        <p className="text-sm mt-1">
                          Asking: <span className="font-semibold">£{p.requested_value.toFixed(2)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <ToastButton action={async () => { "use server"; await adminApproveProposal(p.id); }} message="Proposal accepted!" className="bg-green-600 hover:bg-green-700">
                          Accept £{p.requested_value.toFixed(2)}
                        </ToastButton>
                        <CounterForm proposalId={p.id} />
                        <ToastButton action={async () => { "use server"; await adminRejectProposal(p.id); }} message="Proposal rejected." variant="outline" className="text-red-600 border-red-300">
                          Reject
                        </ToastButton>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Cash-Out Requests */}
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Banknote className="h-5 w-5 text-green-500" /> Cash-Out Requests ({cashOuts.length})
          </h3>
          {cashOuts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No cash-out requests pending.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {cashOuts.map((co) => (
                <Card key={co.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-lg">
                        {co.child_avatar || co.child_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">
                          <Link href={`/children/${co.child_id}`} className="text-violet-600 hover:underline">{co.child_name}</Link>
                          {" "}wants to cash out <span className="font-semibold">£{co.amount.toFixed(2)}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Requested {new Date(co.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ToastButton action={async () => { "use server"; await approveCashOut(co.id); }} message="Cash-out confirmed! Remember to transfer the money." className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-1" /> Confirm
                      </ToastButton>
                      <ToastButton action={async () => { "use server"; await rejectCashOut(co.id); }} message="Cash-out rejected. Balance refunded." variant="outline" className="text-red-600 border-red-300">
                        Reject
                      </ToastButton>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
