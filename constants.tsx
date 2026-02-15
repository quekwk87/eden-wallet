
import { SystemAccountType } from './types';

export const ACCOUNT_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  [SystemAccountType.OWN_EXPENSE]: {
    label: 'Personal Spending',
    color: 'blue',
    description: "Transactions that are purely your own expenses."
  },
  [SystemAccountType.OWED_TO_NXQ]: {
    label: 'Owed to Wife (NXQ)',
    color: 'rose',
    description: "Money you spent that you owe back to NXQ."
  },
  [SystemAccountType.OWED_BY_NXQ]: {
    label: 'Owed by Wife (NXQ)',
    color: 'emerald',
    description: "Money NXQ owes you (e.g., you paid for her)."
  },
  [SystemAccountType.OWED_TO_NXQWK]: {
    label: 'Owed to Shared Fund (NXQWK)',
    color: 'amber',
    description: "Money you owe or need to contribute to the joint fund."
  },
  [SystemAccountType.OWED_BY_NXQWK]: {
    label: 'Owed by Shared Fund (NXQWK)',
    color: 'violet',
    description: "Money the joint fund owes you (e.g., reimbursements)."
  },
};

export const DEFAULT_SPENDING_CATEGORIES: Record<string, string[]> = {
  'Food': ['Restaurant', 'Dessert/Bread', 'Hawker', 'Cafe', 'Fast Food'],
  'Groceries': ['Supermarket', 'Wet Market', 'Health/Personal Care'],
  'Transport': ['Public (Bus/Train)', 'Taxi/Grab', 'Fuel', 'Parking'],
  'Shopping': ['Clothes', 'Electronics', 'Home/Living', 'Gifts'],
  'Bills': ['Utilities', 'Mobile/Wifi', 'Subscriptions', 'Insurance'],
  'Others': ['Misc', 'Entertainment', 'Medical'],
};

export const COLOR_PALETTE = [
  'blue', 'emerald', 'rose', 'amber', 'violet', 'indigo', 'cyan', 'pink', 'orange', 'slate', 'red', 'teal'
];
