
export enum AccountType {
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
  account_type: AccountType;
  remarks: string;
}

export interface Balances {
  totalSpent: number;
  netNXQ: number;
  netNXQWK: number;
}

export interface MonthlyData {
  month: string;
  amount: number;
}

export type CategoryMap = Record<string, string[]>;

export interface AccountConfig {
  label: string;
  color: string;
  description: string;
}

export interface WorkspaceSettings {
  categories: CategoryMap;
  accountConfigs: Record<AccountType, AccountConfig>;
  defaultAccountType: AccountType;
}

export type AppTab = 'add' | 'history' | 'analytics' | 'settings';
