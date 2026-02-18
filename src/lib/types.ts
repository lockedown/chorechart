export interface Child {
  id: string;
  name: string;
  avatar: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Chore {
  id: string;
  title: string;
  description: string;
  value: number;
  frequency: string;
  day_of_week: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChoreAssignment {
  id: string;
  child_id: string;
  chore_id: string;
  status: string;
  due_date: string | null;
  end_date: string | null;
  recurrence_source_id: string | null;
  completed_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChoreAssignmentWithChore extends ChoreAssignment {
  chore_title: string;
  chore_value: number;
  chore_description: string;
}

export interface ChoreAssignmentWithChild extends ChoreAssignment {
  child_name: string;
}

export interface Transaction {
  id: string;
  child_id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface RewardClaim {
  id: string;
  child_id: string;
  reward_id: string;
  created_at: string;
}

export interface RewardClaimWithReward extends RewardClaim {
  reward_title: string;
}

export interface RewardWithClaimCount extends Reward {
  claim_count: number;
}

export interface ChoreWithAssignments extends Chore {
  assignments: ChoreAssignmentWithChild[];
}

export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: "admin" | "child";
  child_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  child_id: string;
  title: string;
  target_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ChoreProposal {
  id: string;
  child_id: string;
  title: string;
  description: string;
  requested_value: number;
  admin_value: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChoreProposalWithChild extends ChoreProposal {
  child_name: string;
}
