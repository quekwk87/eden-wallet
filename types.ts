
// Standard system keys for logic preservation
export enum SystemAccountType {
  OWN_EXPENSE = 'OWN_EXPENSE',
  OWED_TO_NXQ = 'OWED_TO_NXQ',     // owe Monkey (used in Ducky's & Joint ledgers)
  OWED_BY_NXQ = 'OWED_BY_NXQ',     // Monkey owes
  OWED_TO_QWK = 'OWED_TO_QWK',     // owe Ducky (used in Monkey's ledger)
  OWED_BY_QWK = 'OWED_BY_QWK',     // Ducky owes
  OWED_TO_NXQWK = 'OWED_TO_NXQWK', // owe Joint fund
  OWED_BY_NXQWK = 'OWED_BY_NXQWK', // Joint fund owes
}

export enum Ledger {
  PERSONAL = 'QWK',   // Ducky (Wee Kiat)
  WIFE = 'NXQ',       // Monkey (wife)
  JOINT = 'NXQWK',    // Joint
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
