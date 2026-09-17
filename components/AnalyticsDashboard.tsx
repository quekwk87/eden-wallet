import React, { useMemo, useState } from 'react';
import { Ledger, SystemAccountType, Transaction, Balances, MonthlyData, Envelope } from '../types';
import { LEDGER_META } from '../constants';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { sinkingFundNow, totalMonthlyEnvelopes, trueTransactionsFor } from '../utils';
import AiAnalyzer from './AiAnalyzer';

interface AnalyticsDashboardProps {
  transactions: Transaction[];   // the current ledger's own recorded transactions (debt/IOU balances)
  personalTransactions: Transaction[];
  wifeTransactions: Transaction[];
  jointTransactions: Transaction[];
  currentLedger: Ledger;
  envelopes?: Envelope[];
  monthlyBudget?: number;
}

// Tailwind color names cycled for categories that don't have an envelope (and
// so no explicit color of their own).
const DOT_COLORS = ['indigo', 'amber', 'rose', 'violet', 'cyan', 'orange', 'pink', 'lime', 'teal', 'blue'];

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// One row per category that either has an envelope (budget) or has spend in the
// selected period — union of the two, so a budget with zero spend still shows
// up and a spend with no budget still shows up.
interface BudgetRow {
  name: string;
  envelope?: Envelope;
  value: number;
  percentage: number;
  prevValue: number;
  trend: number | null;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  transactions,
  personalTransactions,
  wifeTransactions,
  jointTransactions,
  currentLedger,
  envelopes,
  monthlyBudget
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const themeColor = LEDGER_META[currentLedger].color;
  const ledgerHex = LEDGER_META[currentLedger].hex;

  // The ledger's *true* expenses: every transaction across all three ledgers whose
  // account_type says the money is really this ledger's, regardless of which
  // ledger's page it was typed into (e.g. an "Owed by Joint Fund" entry typed on
  // a personal page belongs here, not on that personal ledger's totals). Same
  // helper the entry-form's envelope meter uses, so the two never disagree.
  const trueTransactions = useMemo(
    () => trueTransactionsFor(currentLedger, personalTransactions, wifeTransactions, jointTransactions),
    [currentLedger, personalTransactions, wifeTransactions, jointTransactions]
  );

  const monthlySpendingData: MonthlyData[] = useMemo(() => {
    const dataMap: Record<string, number> = {};
    trueTransactions.forEach(t => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      dataMap[key] = (dataMap[key] || 0) + t.amount;
    });
    return Object.entries(dataMap)
      .map(([key, amount]) => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        return { sortKey: key, month: label, amount };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [trueTransactions]);

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setExpandedCategory(null);
  };

  // Own-ledger raw rows for the selected month — used only for the debt/IOU
  // balances below (netNXQ/netNXQWK), which are about what THIS ledger recorded
  // owing/being owed, not about true expense totals.
  const filteredTransactions = useMemo(() => {
    if (!selectedMonth) return transactions;
    return transactions.filter(t => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  const trueFilteredTransactions = useMemo(() => {
    if (!selectedMonth) return trueTransactions;
    return trueTransactions.filter(t => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [trueTransactions, selectedMonth]);

  const truePrevMonthTransactions = useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    return trueTransactions.filter(t => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return key === prevKey;
    });
  }, [trueTransactions, selectedMonth]);

  const stats: Balances = useMemo(() => {
    const totalSpent = trueFilteredTransactions.reduce((s, t) => s + t.amount, 0);
    return filteredTransactions.reduce((acc, t) => {
      if (t.account_type === SystemAccountType.OWED_BY_NXQ) acc.netNXQ += t.amount;
      if (t.account_type === SystemAccountType.OWED_TO_NXQ) acc.netNXQ -= t.amount;
      if (t.account_type === SystemAccountType.OWED_BY_NXQWK) acc.netNXQWK += t.amount;
      if (t.account_type === SystemAccountType.OWED_TO_NXQWK) acc.netNXQWK -= t.amount;
      return acc;
    }, { totalSpent, netNXQ: 0, netNXQWK: 0 });
  }, [trueFilteredTransactions, filteredTransactions]);

  const prevStats = useMemo(() => {
    return { totalSpent: truePrevMonthTransactions.reduce((s, t) => s + t.amount, 0), netNXQ: 0, netNXQWK: 0 };
  }, [truePrevMonthTransactions]);

  const momDelta = selectedMonth && prevStats.totalSpent > 0
    ? ((stats.totalSpent - prevStats.totalSpent) / prevStats.totalSpent) * 100
    : null;

  const spendingByCategory = useMemo(() => {
    const currentData: Record<string, number> = {};
    trueFilteredTransactions.forEach(t => {
      currentData[t.spending_category] = (currentData[t.spending_category] || 0) + t.amount;
    });

    const prevData: Record<string, number> = {};
    truePrevMonthTransactions.forEach(t => {
      prevData[t.spending_category] = (prevData[t.spending_category] || 0) + t.amount;
    });

    const total = Object.values(currentData).reduce((a, b) => a + b, 0);

    return Object.entries(currentData)
      .map(([name, value]) => {
        const prevValue = prevData[name] || 0;
        const trend = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : null;
        return { name, value, percentage: total > 0 ? (value / total) * 100 : 0, prevValue, trend };
      })
      .sort((a, b) => b.value - a.value);
  }, [trueFilteredTransactions, truePrevMonthTransactions]);

  // Transactions for the selected period, grouped by category — powers the
  // "expand to see individual expenses" list under each budget/category row.
  const transactionsByCategory = useMemo(() => {
    const map: Record<string, typeof trueFilteredTransactions> = {};
    trueFilteredTransactions.forEach(t => {
      (map[t.spending_category] ||= []).push(t);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return map;
  }, [trueFilteredTransactions]);

  // Merges what used to be three separate sections (Envelopes, Spending
  // Breakdown, Category Distribution) into one.
  const budgetRows: BudgetRow[] = useMemo(() => {
    const rows = new Map<string, BudgetRow>();
    spendingByCategory.forEach(c => rows.set(c.name, { ...c }));
    (envelopes || []).forEach(env => {
      if (!rows.has(env.name)) {
        rows.set(env.name, { name: env.name, value: 0, percentage: 0, prevValue: 0, trend: null });
      }
    });
    const envByName = new Map((envelopes || []).map(e => [e.name, e]));
    return Array.from(rows.values())
      .map(r => ({ ...r, envelope: envByName.get(r.name) }))
      .sort((a, b) => b.value - a.value);
  }, [spendingByCategory, envelopes]);

  const hasOverall = !!selectedMonth && monthlyBudget !== undefined && monthlyBudget > 0;

  // ─── Sub-components ──────────────────────────────────────────────────────────

  const TrendArrow = ({ trend }: { trend: number | null }) => {
    if (trend === null) return <span className="text-slate-300 text-[10px] font-bold">—</span>;
    const up = trend > 0;
    return (
      <span className={`text-[10px] font-black flex items-center gap-0.5 ${up ? 'text-rose-500' : 'text-emerald-500'}`}>
        {up ? '↑' : '↓'} {Math.abs(trend).toFixed(0)}%
      </span>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">

      <AiAnalyzer
        currentLedger={currentLedger}
        personalTransactions={personalTransactions}
        wifeTransactions={wifeTransactions}
        jointTransactions={jointTransactions}
        themeColor={themeColor}
      />

      {/* Month Pill Filter */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Filter by Month</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => handleMonthChange('')}
            className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
              selectedMonth === ''
                ? `bg-${themeColor}-600 text-white shadow-md`
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            All Time
          </button>
          {[...monthlySpendingData].reverse().map(m => (
            <button
              key={m.sortKey}
              onClick={() => handleMonthChange(m.sortKey)}
              className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                selectedMonth === m.sortKey
                  ? `bg-${themeColor}-600 text-white shadow-md`
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {m.month}
            </button>
          ))}
        </div>
      </div>

      {/* Total Spent */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Spent ({currentLedger})</p>
        <span className="text-3xl font-black text-slate-900 leading-none">
          ${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        {momDelta !== null && (
          <p className={`text-[11px] font-bold mt-2 ${momDelta > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
            {momDelta > 0 ? '↑' : '↓'} {Math.abs(momDelta).toFixed(1)}% vs last month
          </p>
        )}
      </div>

      {/* Spending Trend */}
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Spending Trend</h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlySpendingData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
              <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              <Area type="monotone" dataKey="amount" stroke={ledgerHex} fillOpacity={0.1} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Budgets & Categories — merged envelopes + spending breakdown */}
      {budgetRows.length > 0 && (
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Budgets & Categories</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">
            Tap a category to see individual expenses
          </p>

          {/* Overall monthly budget */}
          {hasOverall && (() => {
            const p = (stats.totalSpent / monthlyBudget!) * 100;
            const bar = p >= 100 ? 'bg-rose-500' : p >= 80 ? 'bg-amber-400' : `bg-${themeColor}-600`;
            const amt = p >= 100 ? 'text-rose-600' : p >= 80 ? 'text-amber-600' : 'text-slate-700';
            const remaining = monthlyBudget! - stats.totalSpent;
            return (
              <div className="mb-5 pb-5 border-b border-slate-100">
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Overall</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xs font-black ${amt}`}>${stats.totalSpent.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400">/ ${monthlyBudget!.toFixed(2)}</span>
                    <span className={`text-[10px] font-bold ${amt}`}>· {remaining < 0 ? `$${Math.abs(remaining).toFixed(2)} over` : `$${remaining.toFixed(2)} left`}</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${Math.min(p, 100)}%` }} />
                </div>
              </div>
            );
          })()}

          <div className="space-y-4">
            {budgetRows.map((row, i) => {
              const isExpanded = expandedCategory === row.name;
              const rowTransactions = transactionsByCategory[row.name] || [];
              const dotColor = row.envelope?.color || DOT_COLORS[i % DOT_COLORS.length];
              const isSinkingFund = row.envelope?.type === 'sinking_fund';

              // Budget context — only meaningful for a specific month.
              let budgetBlock: React.ReactNode = null;
              if (selectedMonth && row.envelope) {
                if (isSinkingFund) {
                  const now = sinkingFundNow(row.envelope, trueTransactions);
                  budgetBlock = (
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                      Fund balance now: <span className={now < 0 ? 'text-rose-600 font-bold' : 'text-slate-600 font-bold'}>${now.toFixed(2)}</span>
                      {' '}(${(row.envelope.balance || 0).toFixed(2)} start · +${(row.envelope.monthly_amount || 0).toFixed(2)}/mo)
                    </p>
                  );
                } else {
                  const limit = row.envelope.monthly_amount;
                  if (limit > 0) {
                    const p = (row.value / limit) * 100;
                    const bar = p >= 100 ? 'bg-rose-500' : p >= 80 ? 'bg-amber-400' : `bg-${dotColor}-500`;
                    const amt = p >= 100 ? 'text-rose-600' : p >= 80 ? 'text-amber-600' : 'text-slate-500';
                    const remaining = limit - row.value;
                    budgetBlock = (
                      <>
                        <p className={`text-[10px] font-bold mt-0.5 ${amt}`}>
                          / ${limit.toFixed(2)} budget · {remaining < 0 ? `$${Math.abs(remaining).toFixed(2)} over` : `$${remaining.toFixed(2)} left`}
                        </p>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                          <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${Math.min(p, 100)}%` }} />
                        </div>
                      </>
                    );
                  }
                }
              }

              return (
                <div key={row.name}>
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : row.name)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 bg-${dotColor}-500`} />
                        <span className="text-xs font-black text-slate-700 truncate">{row.name}</span>
                        {isSinkingFund && (
                          <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Fund</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <TrendArrow trend={row.trend} />
                        <span className="text-xs font-black text-slate-700">
                          ${row.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{row.percentage.toFixed(0)}%</span>
                        <svg
                          className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {budgetBlock}
                  </button>

                  {isExpanded && (
                    <div className={`mt-3 ml-4 space-y-2 border-l-2 pl-3 border-${dotColor}-200`}>
                      {rowTransactions.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic py-1">No expenses in this period.</p>
                      )}
                      {rowTransactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-slate-600 truncate">{t.remarks || t.sub_category || t.spending_category}</p>
                            <p className="text-[10px] font-semibold text-slate-400">
                              {new Date(t.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })} · {t.sub_category}
                              {t.__source !== currentLedger && (
                                <span className="ml-1.5 text-slate-300">· via {LEDGER_META[t.__source].label}</span>
                              )}
                            </p>
                          </div>
                          <span className="text-xs font-black text-slate-700 ml-3 shrink-0">${t.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total monthly commitment across all envelopes */}
          {selectedMonth && envelopes && envelopes.length > 0 && (
            <div className="mt-5 pt-3 border-t-2 border-slate-100 flex items-center justify-between">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Total Monthly</span>
              <span className="text-sm font-black text-slate-800">${totalMonthlyEnvelopes(envelopes).toFixed(2)}<span className="text-[10px] font-bold text-slate-400"> /mo</span></span>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
