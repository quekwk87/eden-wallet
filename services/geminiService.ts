
import { GoogleGenAI, Chat } from '@google/genai';
import { Ledger, SystemAccountType, Transaction } from '../types';
import { LEDGER_META } from '../constants';

const API_KEY = (process.env.GEMINI_API_KEY || process.env.API_KEY) as string | undefined;

export const isAiConfigured = !!API_KEY;

const MODEL = 'gemini-2.5-flash';
const MAX_ROWS_PER_LEDGER = 3000;

let client: GoogleGenAI | null = null;

const getClient = (): GoogleGenAI => {
  if (!API_KEY) {
    throw new Error('AI is not configured. Set GEMINI_API_KEY in your environment to enable the expense analyzer.');
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: API_KEY });
  }
  return client;
};

// "Money that actually left this ledger's own pocket" — same logic AnalyticsDashboard
// uses to decide what counts toward a ledger's real spending vs. money fronted by others.
const isOutOfPocket = (accountType: string, isJointLedger: boolean): boolean => {
  if (isJointLedger) return true;
  return [
    SystemAccountType.OWN_EXPENSE as string,
    SystemAccountType.OWED_TO_NXQ as string,
    SystemAccountType.OWED_TO_QWK as string,
    SystemAccountType.OWED_TO_NXQWK as string,
  ].includes(accountType) || accountType.startsWith('USER_');
};

const toCsv = (ledger: Ledger, transactions: Transaction[]): string => {
  const isJoint = ledger === Ledger.JOINT;
  const rows = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, MAX_ROWS_PER_LEDGER)
    .map(t => {
      const outOfPocket = isOutOfPocket(t.account_type, isJoint) ? 'yes' : 'no';
      const remarks = (t.remarks || '').replace(/[\n\r,"]/g, ' ').trim();
      return `${t.date},${t.amount.toFixed(2)},${t.spending_category},${t.sub_category || ''},${t.account_type},${outOfPocket},"${remarks}"`;
    });
  const header = 'date,amount,category,sub_category,account_type,out_of_pocket_expense,remarks';
  return [header, ...rows].join('\n');
};

export interface ExpenseDataset {
  ledger: Ledger;
  transactions: Transaction[];
}

const buildSystemInstruction = (datasets: ExpenseDataset[], activeLedgerLabel: string): string => {
  const today = new Date().toISOString().slice(0, 10);

  const legend = `
You are a financial analyst assistant embedded in "Eden Wallet", a household expense tracker for a couple in Singapore.
Currency is SGD ($). Today's date is ${today}.

There are up to three ledgers, each supplied below as CSV:
- QWK ("Ducky") — a personal ledger.
- NXQ ("Monkey") — the other person's personal ledger.
- NXQWK ("Joint") — the shared household fund.

Each transaction row has an "account_type" that encodes who actually paid and who owes whom:
- OWN_EXPENSE: a normal personal expense.
- OWED_TO_NXQ / OWED_TO_QWK / OWED_TO_NXQWK: the ledger owner fronted the money and is owed back — it still left their pocket.
- OWED_BY_NXQ / OWED_BY_QWK / OWED_BY_NXQWK: someone else fronted the money for the ledger owner — it did NOT leave the ledger owner's pocket.
The "out_of_pocket_expense" column is precomputed: "yes" means the money left that ledger's own pocket and should count toward that ledger's real spending; "no" means it should be excluded from spending totals (it's someone else's money, only relevant to debts/reimbursements).

Rules for answering:
- Default to out_of_pocket_expense = "yes" rows when asked about "my spending", "how much did I spend", budgets, or totals for a ledger. Only use "no" rows when explicitly asked about money owed or reimbursements.
- If the user says "I", "me", or doesn't name a ledger, assume they mean the ledger currently open in the app: "${activeLedgerLabel}".
- Do the arithmetic carefully and show final numbers clearly (use $ and 2 decimal places).
- Be concise but specific — cite categories, amounts, and time periods you used.
- When asked for advice or "smarter analysis", ground it in the actual data: trends, biggest categories, month-over-month changes, recurring patterns.
- If the data doesn't support an answer (e.g. no transactions in a period), say so rather than guessing.
`.trim();

  const sections = datasets
    .filter(d => d.transactions.length > 0)
    .map(({ ledger, transactions }) => {
      const label = LEDGER_META[ledger].label;
      return `\n--- Ledger: ${label} (${ledger}) — ${transactions.length} transactions ---\n${toCsv(ledger, transactions)}`;
    })
    .join('\n');

  return sections ? `${legend}\n${sections}` : `${legend}\n\n(No transactions recorded yet in any ledger.)`;
};

export const createExpenseChat = (datasets: ExpenseDataset[], activeLedgerLabel: string): Chat => {
  const ai = getClient();
  return ai.chats.create({
    model: MODEL,
    config: {
      systemInstruction: buildSystemInstruction(datasets, activeLedgerLabel),
    },
  });
};

export const sendExpenseMessage = async (chat: Chat, message: string): Promise<string> => {
  const response = await chat.sendMessage({ message });
  return response.text ?? '';
};
