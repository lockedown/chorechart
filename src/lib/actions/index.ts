// Barrel re-export — all consumers continue importing from "@/lib/actions"
// Note: "use server" is NOT placed here; each module has its own directive.

export { getChildren, getChild, createChild, deleteChild } from "./children";
export { getChores, createChore, deleteChore, assignChore, markChoreDone, approveChore } from "./chores";
export { addTransaction } from "./transactions";
export { getRewards, createReward, deleteReward, claimReward } from "./rewards";
export { requestCashOut, getChildCashOutRequests, getPendingCashOuts, approveCashOut, rejectCashOut } from "./cashout";
export {
  adminResetAllBalances,
  adminSetBalance,
  adminUpdateChore,
  adminUpdateReward,
  adminOverrideAssignment,
  adminDeleteAssignment,
  adminDeleteTransaction,
  adminDeleteAllAssignments,
  adminGetAllData,
  adminNukeDatabase,
} from "./admin";
export { updateAllowance, processAllowances } from "./allowance";
export { getDashboardStats } from "./dashboard";
export { getChildSavingsGoals, createSavingsGoal, deleteSavingsGoal } from "./savings";
export { getChildStreak } from "./streaks";
export { getAllAchievements, getChildAchievements } from "./achievements";
export {
  getChildProposals,
  createProposal,
  childAcceptCounter,
  childDeclineCounter,
  adminApproveProposal,
  adminCounterProposal,
  adminRejectProposal,
  getPendingApprovals,
} from "./proposals";
