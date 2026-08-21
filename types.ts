
// Standard system keys for logic preservation
export enum SystemAccountType {
  OWN_EXPENSE = 'OWN_EXPENSE',
  OWED_TO_NXQ = 'OWED_TO_NXQ',
  OWED_BY_NXQ = 'OWED_BY_NXQ',
  OWED_TO_NXQWK = 'OWED_TO_NXQWK',
  OWED_BY_NXQWK = 'OWED_BY_NXQWK',
}

export enum Ledger {
  PERSONAL = 'QWK',
  JOINT = 'NXQWK',
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  spending_category: string;
  sub_category: string;
  account_type: string;
  remarks: string;
}

export interface Balances {
  totalSpent: number;
  netNXQ: number;
  netNXQWK: number;
}

export interface MonthlyData {
  sortKey: string;   // 'YYYY-MM' for sorting/filtering
  month: string;     // display label e.g. 'Aug 2026'
  amount: number;
}

export type EnvelopeType = 'monthly_reset' | 'sinking_fund';

export interface Envelope {
  id: string;
  ledger: string;
  name: string;
  type: EnvelopeType;
  monthly_amount: number;  // monthly limit (reset) or monthly contribution (sinking)
  balance: number;         // accumulated balance — sinking funds only; user-set (source of truth)
  color: string | null;
  sort_order: number;
  active: boolean;
}

export type CategoryMap = Record<string, string[]>;

export interface AccountConfig {
  label: string;
  color: string;
  description: string;
}

export interface WorkspaceSettings {
  categories: CategoryMap;
  accountConfigs: Record<string, AccountConfig>;
  defaultAccountType: string;
  defaultCategory: string;
  defaultSubCategories: Record<string, string>;
  monthlyBudget?: number;
  categoryBudgets?: Record<string, number>;
  budgetsMigrated?: boolean;   // set true once old categoryBudgets are copied into envelopes
}

export type AppTab = 'add' | 'history' | 'analytics' | 'settings';
