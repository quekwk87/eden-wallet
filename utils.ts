/**
 * Returns the current date as a YYYY-MM-DD string in the user's local time zone.
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses a YYYY-MM-DD string into a local Date object without UTC shifts.
 */
export const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// ── Envelope calculations ──────────────────────────────────────────────────
import { Ledger, SystemAccountType } from './types';
import type { Envelope, Transaction } from './types';

// ── Cross-ledger expense ownership ─────────────────────────────────────────

// A transaction's account_type can say the money is really someone else's
// expense (e.g. "Owed by Joint Fund" recorded on a personal ledger = you
// fronted cash for a joint expense). Map each "owed by X" type to the ledger
// that actually bears that expense.
const OWED_BY_TO_LEDGER: Partial<Record<string, Ledger>> = {
  [SystemAccountType.OWED_BY_NXQ]: Ledger.WIFE,
  [SystemAccountType.OWED_BY_QWK]: Ledger.PERSONAL,
  [SystemAccountType.OWED_BY_NXQWK]: Ledger.JOINT,
};

/**
 * Which ledger a transaction's amount economically belongs to, regardless of
 * which ledger's table it was recorded on. "Owed by X" rows belong to X (you
 * fronted the cash for X's expense); everything else — OWN_EXPENSE, "owed to
 * X" (X fronted cash for *your* expense), and custom USER_ types — is a real
 * expense of the ledger it was recorded on.
 */
export const trueLedgerOf = (recordedOn: Ledger, accountType: string): Ledger =>
  OWED_BY_TO_LEDGER[accountType] ?? recordedOn;

export type SourcedTransaction = Transaction & { __source: Ledger };

/** Every transaction across all three ledgers, tagged with which ledger recorded it. */
export const tagWithSource = (
  personalTransactions: Transaction[],
  wifeTransactions: Transaction[],
  jointTransactions: Transaction[]
): SourcedTransaction[] => [
  ...personalTransactions.map(t => ({ ...t, __source: Ledger.PERSONAL })),
  ...wifeTransactions.map(t => ({ ...t, __source: Ledger.WIFE })),
  ...jointTransactions.map(t => ({ ...t, __source: Ledger.JOINT })),
];

/**
 * Every transaction (from any of the three ledgers) that is truly `ledger`'s
 * expense — the single source of truth for "how much has this ledger really
 * spent," used identically by the Analytics tab and the entry-form's envelope
 * meter so the two never disagree.
 */
export const trueTransactionsFor = (
  ledger: Ledger,
  personalTransactions: Transaction[],
  wifeTransactions: Transaction[],
  jointTransactions: Transaction[]
): SourcedTransaction[] =>
  tagWithSource(personalTransactions, wifeTransactions, jointTransactions)
    .filter(t => trueLedgerOf(t.__source, t.account_type) === ledger);

/** Months contributed so far this calendar year (Jan = 1 … current month). */
export const monthsElapsedThisYear = (): number => new Date().getMonth() + 1;

/** Total drawn from an envelope this calendar year (transactions tagged to its name). */
export const drawnThisYear = (envName: string, transactions: Transaction[]): number => {
  const year = new Date().getFullYear();
  return transactions
    .filter(t => t.spending_category === envName && new Date(t.date).getFullYear() === year)
    .reduce((s, t) => s + t.amount, 0);
};

/**
 * Calculated current balance of a sinking fund:
 *   start-of-year balance + monthly contribution × months so far − drawn this year.
 * `balance` holds the start-of-year figure; `monthly_amount` is the monthly contribution.
 */
export const sinkingFundNow = (env: Envelope, transactions: Transaction[]): number => {
  const startOfYear = env.balance || 0;
  const contributed = (env.monthly_amount || 0) * monthsElapsedThisYear();
  return startOfYear + contributed - drawnThisYear(env.name, transactions);
};

/** Sum of every envelope's monthly figure (monthly limits + sinking contributions). */
export const totalMonthlyEnvelopes = (envelopes: Envelope[]): number =>
  (envelopes || []).reduce((s, e) => s + (e.monthly_amount || 0), 0);