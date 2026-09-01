
import { SystemAccountType, Ledger } from './types';

// Per-ledger display metadata (label, theme colour, chart hex, avatar initials, subtitle).
export const LEDGER_META: Record<Ledger, { label: string; color: string; hex: string; initials: string; subtitle: string }> = {
  [Ledger.PERSONAL]: { label: 'Ducky',  color: 'emerald', hex: '#10b981', initials: 'DK', subtitle: 'Private Workspace' },
  [Ledger.WIFE]:     { label: 'Monkey', color: 'rose',    hex: '#f43f5e', initials: 'MK', subtitle: 'Private Workspace' },
  [Ledger.JOINT]:    { label: 'Joint',  color: 'indigo',  hex: '#6366f1', initials: 'JT', subtitle: 'Shared Funds' },
};

// Order shown in the ledger switcher.
export const LEDGER_ORDER: Ledger[] = [Ledger.PERSONAL, Ledger.WIFE, Ledger.JOINT];

// Shared household logins. Each person's login lands on their own ledger by default,
// but both can switch to all three (data is shared).
export const LOGIN_USERS: { name: string; email: string; ledger: Ledger; color: string }[] = [
  { name: 'Ducky',  email: 'quekwk@gmail.com',    ledger: Ledger.PERSONAL, color: 'emerald' },
  { name: 'Monkey', email: 'xueqin.ng@gmail.com', ledger: Ledger.WIFE,     color: 'rose' },
];

export function defaultLedgerForEmail(email?: string | null): Ledger | null {
  const found = LOGIN_USERS.find(u => u.email === (email || '').toLowerCase());
  return found ? found.ledger : null;
}

// The wife's login email — used to show her a friendlier "Paid by…" wording.
export const MONKEY_EMAIL = (LOGIN_USERS.find(u => u.ledger === Ledger.WIFE)?.email || '').toLowerCase();

// Display-only relabelling shown ONLY when Monkey is the logged-in viewer. The stored
// Supabase labels stay "Owed…" for everyone; this rewrites the on-screen text per ledger to
// a "Paid by <who paid> for <who owes it back>" perspective. Editing (Settings) is unaffected.
export const MONKEY_LABEL_OVERRIDES: Record<Ledger, Partial<Record<SystemAccountType, string>>> = {
  [Ledger.PERSONAL]: { // QWK — Ducky's ledger
    [SystemAccountType.OWED_TO_NXQ]:   'Paid by Monkey for Ducky',
    [SystemAccountType.OWED_BY_NXQ]:   'Paid by Ducky for Monkey',
    [SystemAccountType.OWED_TO_NXQWK]: 'Paid by Joint for Ducky',
    [SystemAccountType.OWED_BY_NXQWK]: 'Paid by Ducky for Joint',
  },
  [Ledger.WIFE]: { // NXQ — Monkey's ledger
    [SystemAccountType.OWED_BY_QWK]:   'Paid by Monkey for Ducky',
    [SystemAccountType.OWED_TO_QWK]:   'Paid by Ducky for Monkey',
    [SystemAccountType.OWED_BY_NXQWK]: 'Paid by Monkey for Joint',
    [SystemAccountType.OWED_TO_NXQWK]: 'Paid by Joint for Monkey',
  },
  [Ledger.JOINT]: { // NXQWK — Joint ledger
    [SystemAccountType.OWED_BY_NXQ]:   'Paid by Joint for Monkey',
    [SystemAccountType.OWED_TO_NXQ]:   'Paid by Monkey for Joint',
    [SystemAccountType.OWED_BY_NXQWK]: 'Paid by Ducky for Joint',
    [SystemAccountType.OWED_TO_NXQWK]: 'Paid by Joint for Ducky',
  },
};

// Returns accountConfigs with Monkey's "Paid by…" labels when she is the viewer; otherwise
// the configs are returned unchanged. Only the label text is swapped — colour/description stay.
export const perspectiveAccountConfigs = (
  configs: Record<string, { label: string; color: string; description: string }>,
  ledger: Ledger,
  isMonkey: boolean
): Record<string, { label: string; color: string; description: string }> => {
  if (!isMonkey) return configs;
  const overrides = MONKEY_LABEL_OVERRIDES[ledger] || {};
  const out: Record<string, { label: string; color: string; description: string }> = {};
  for (const [key, cfg] of Object.entries(configs)) {
    const label = overrides[key as SystemAccountType];
    out[key] = label ? { ...cfg, label } : cfg;
  }
  return out;
};

// Default labels (Ducky's perspective). Each ledger overrides these with friendly,
// perspective-correct labels stored per-ledger in workspace_settings.accountConfigs.
export const ACCOUNT_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  [SystemAccountType.OWN_EXPENSE]: {
    label: 'Personal Spending',
    color: 'blue',
    description: "Transactions that are purely your own expenses."
  },
  [SystemAccountType.OWED_TO_NXQ]: {
    label: 'Owed to Monkey',
    color: 'rose',
    description: "Money you spent that you owe back to Monkey."
  },
  [SystemAccountType.OWED_BY_NXQ]: {
    label: 'Owed by Monkey',
    color: 'emerald',
    description: "Money Monkey owes you (e.g., you paid for her)."
  },
  [SystemAccountType.OWED_TO_QWK]: {
    label: 'Owed to Ducky',
    color: 'rose',
    description: "Money you spent that you owe back to Ducky."
  },
  [SystemAccountType.OWED_BY_QWK]: {
    label: 'Owed by Ducky',
    color: 'emerald',
    description: "Money Ducky owes you (e.g., you paid for him)."
  },
  [SystemAccountType.OWED_TO_NXQWK]: {
    label: 'Owed to Joint Fund',
    color: 'amber',
    description: "Money you owe or need to contribute to the joint fund."
  },
  [SystemAccountType.OWED_BY_NXQWK]: {
    label: 'Owed by Joint Fund',
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
