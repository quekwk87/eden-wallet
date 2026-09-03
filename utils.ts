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
import type { Envelope, Transaction } from './types';

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