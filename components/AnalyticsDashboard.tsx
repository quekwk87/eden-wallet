import React, { useMemo, useState } from 'react';
import { Ledger, SystemAccountType, Transaction, Balances, MonthlyData, Envelope } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell
} from 'recharts';

interface AnalyticsDashboardProps {
  personalTransactions: Transaction[];
  jointTransactions: Transaction[];
  currentLedger: Ledger;
  envelopes?: Envelope[];
  monthlyBudget?: number;
}

const CATEGORY_COLORS = [
  '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6'
];

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  personalTransactions,
  jointTransactions,
  currentLedger,
  envelopes,
  monthlyBudget
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [drillCategory, setDrillCategory] = useState<string | null>(null);

  const isJointMode = currentLedger === Ledger.JOINT;
  const themeColor = isJointMode ? 'indigo' : 'emerald';
  const transactions = isJointMode ? jointTransactions : personalTransactions;

  const isPersonalExpense = (type: string) => {
    if (!isJointMode) {
      return [
        SystemAccountType.OWN_EXPENSE as string,
        SystemAccountType.OWED_TO_NXQ as string,
        SystemAccountType.OWED_TO_NXQWK as string
      ].includes(type) || type.startsWith('USER_');
    }
    return true;
  };

  const monthlySpendingData: MonthlyData[] = useMemo(() => {
    const dataMap: Record<string, number> = {};
    transactions.forEach(t => {
      if (!isPersonalExpense(t.account_type)) return;
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
  }, [transactions, isJointMode]);

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setExpandedCategory(null);
    setDrillCategory(null);
  };

  const filteredTransactions = useMemo(() => {
    if (!selectedMonth) return transactions;
    return transactions.filter(t => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  const prevMonthTransactions = useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    return transactions.filter(t => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return key === prevKey;
    });
  }, [transactions, selectedMonth]);


  const stats: Balances = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (isPersonalExpense(t.account_type)) acc.totalSpent += t.amount;
      if (t.account_type === SystemAccountType.OWED_BY_NXQ) acc.netNXQ += t.amount;
      if (t.account_type === SystemAccountType.OWED_TO_NXQ) acc.netNXQ -= t.amount;
      if (t.account_type === SystemAccountType.OWED_BY_NXQWK) acc.netNXQWK += t.amount;
      if (t.account_type === SystemAccountType.OWED_TO_NXQWK) acc.netNXQWK -= t.amount;
      return acc;
    }, { totalSpent: 0, netNXQ: 0, netNXQWK: 0 });
  }, [filteredTransactions, isJointMode]);

  const prevStats = useMemo(() => {
    return prevMonthTransactions.reduce((acc, t) => {
      if (isPersonalExpense(t.account_type)) acc.totalSpent += t.amount;
      return acc;
    }, { totalSpent: 0, netNXQ: 0, netNXQWK: 0 });
  }, [prevMonthTransactions, isJointMode]);

  const momDelta = selectedMonth && prevStats.totalSpent > 0
    ? ((stats.totalSpent - prevStats.totalSpent) / prevStats.totalSpent) * 100
    : null;

  const spendingByCategory = useMemo(() => {
    const currentData: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (isPersonalExpense(t.account_type)) {
        currentData[t.spending_category] = (currentData[t.spending_category] || 0) + t.amount;
      }
    });

    const prevData: Record<string, number> = {};
    prevMonthTransactions.forEach(t => {
      if (isPersonalExpense(t.account_type)) {
        prevData[t.spending_category] = (prevData[t.spending_category] || 0) + t.amount;
      }
    });

    const total = Object.values(currentData).reduce((a, b) => a + b, 0);

    return Object.entries(currentData)
      .map(([name, value]) => {
        const prevValue = prevData[name] || 0;
        const trend = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : null;
        return { name, value, percentage: total > 0 ? (value / total) * 100 : 0, prevValue, trend };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, prevMonthTransactions, isJointMode]);

  // Spent per category for the selected month — matches the entry-form EnvelopeStrip
  // (sums all transactions of the category, regardless of account_type).
  const spentByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      m[t.spending_category] = (m[t.spending_category] || 0) + t.amount;
    });
    return m;
  }, [filteredTransactions]);

  const subCategoryBreakdown = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    filteredTransactions.forEach(t => {
      if (isPersonalExpense(t.account_type)) {
        if (!data[t.spending_category]) data[t.spending_category] = {};
        const sub = t.sub_category || 'Other';
        data[t.spending_category][sub] = (data[t.spending_category][sub] || 0) + t.amount;
      }
    });
    return data;
  }, [filteredTransactions, isJointMode]);

  const cutRecommendations = useMemo(() => {
    type RecType = 'high_share' | 'trending_up' | 'top_spender';
    const recs: Array<{ category: string; reason: string; type: RecType; amount: number; subTip?: string }> = [];
    if (spendingByCategory.length === 0) return recs;

    for (const cat of spendingByCategory) {
      if (cat.percentage > 35) {
        const subCats = subCategoryBreakdown[cat.name];
        const topSub = subCats ? Object.entries(subCats).sort((a, b) => b[1] - a[1])[0] : null;
        recs.push({
          category: cat.name,
          reason: `${cat.percentage.toFixed(0)}% of total spending`,
          type: 'high_share',
          amount: cat.value,
          subTip: topSub ? `Biggest sub-category: ${topSub[0]} ($${topSub[1].toFixed(2)})` : undefined,
        });
      }
      if (cat.trend !== null && cat.trend > 25) {
        recs.push({
          category: cat.name,
          reason: `+${cat.trend.toFixed(0)}% vs last month`,
          type: 'trending_up',
          amount: cat.value,
          subTip: cat.prevValue > 0 ? `Was $${cat.prevValue.toFixed(2)}, now $${cat.value.toFixed(2)}` : undefined,
        });
      }
    }

    if (recs.length === 0) {
      const top = spendingByCategory[0];
      recs.push({
        category: top.name,
        reason: `Your biggest spend this period (${top.percentage.toFixed(0)}%)`,
        type: 'top_spender',
        amount: top.value,
      });
    }

    const seen = new Set<string>();
    return recs.filter(r => {
      if (seen.has(r.category + r.type)) return false;
      seen.add(r.category + r.type);
      return true;
    }).slice(0, 4);
  }, [spendingByCategory, subCategoryBreakdown]);

  // Transactions for the drilled category
  const drillTransactions = useMemo(() => {
    if (!drillCategory) return [];
    return filteredTransactions
      .filter(t => t.spending_category === drillCategory && isPersonalExpense(t.account_type))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [drillCategory, filteredTransactions, isJointMode]);

  const drillColor = drillCategory
    ? CATEGORY_COLORS[spendingByCategory.findIndex(c => c.name === drillCategory) % CATEGORY_COLORS.length]
    : '#10b981';

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

  const recTypeStyle: Record<string, { bg: string; border: string; badge: string; badgeText: string }> = {
    high_share: { bg: 'bg-rose-50', border: 'border-rose-100', badge: 'bg-rose-100', badgeText: 'text-rose-700' },
    trending_up: { bg: 'bg-amber-50', border: 'border-amber-100', badge: 'bg-amber-100', badgeText: 'text-amber-700' },
    top_spender: { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100', badgeText: 'text-slate-600' },
  };

  const recLabel: Record<string, string> = {
    high_share: 'High Share',
    trending_up: 'Rising Fast',
    top_spender: 'Top Spend',
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">

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

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        {spendingByCategory.length > 0 && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Biggest Category</p>
            <span className="text-2xl font-black text-slate-900 leading-none">{spendingByCategory[0].name}</span>
            <p className="text-[11px] font-bold text-slate-400 mt-2">
              ${spendingByCategory[0].value.toFixed(2)} · {spendingByCategory[0].percentage.toFixed(0)}% of total
            </p>
          </div>
        )}

        {spendingByCategory.length > 1 && (() => {
          const rising = [...spendingByCategory].filter(c => c.trend !== null && c.trend > 0).sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0))[0];
          return rising ? (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-100">
              <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest mb-2">Fastest Rising</p>
              <span className="text-2xl font-black text-rose-700 leading-none">{rising.name}</span>
              <p className="text-[11px] font-bold text-rose-400 mt-2">
                +{(rising.trend ?? 0).toFixed(0)}% vs last month
              </p>
            </div>
          ) : null;
        })()}
      </div>

      {/* Envelopes at a glance (only meaningful for a specific month) */}
      {selectedMonth && envelopes && envelopes.length > 0 && (() => {
        const [y, mo] = selectedMonth.split('-');
        const monthLabel = new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const hasOverall = monthlyBudget !== undefined && monthlyBudget > 0;
        return (
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Envelopes</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">{monthLabel}</p>

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

            {/* Per-envelope meters */}
            <div className="space-y-4">
              {envelopes.map(env => {
                const spent = spentByCategory[env.name] || 0;
                const color = env.color || 'slate';

                if (env.type === 'monthly_reset') {
                  const limit = env.monthly_amount;
                  const p = limit > 0 ? (spent / limit) * 100 : 0;
                  const bar = p >= 100 ? 'bg-rose-500' : p >= 80 ? 'bg-amber-400' : `bg-${color}-500`;
                  const amt = p >= 100 ? 'text-rose-600' : p >= 80 ? 'text-amber-600' : 'text-slate-700';
                  const remaining = limit - spent;
                  return (
                    <div key={env.id}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-bold text-slate-600">{env.name}</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-xs font-black ${amt}`}>${spent.toFixed(2)}</span>
                          {limit > 0
                            ? <><span className="text-[10px] text-slate-400">/ ${limit.toFixed(2)}</span><span className={`text-[10px] font-bold ${amt}`}>· {remaining < 0 ? `$${Math.abs(remaining).toFixed(2)} over` : `$${remaining.toFixed(2)} left`}</span></>
                            : <span className="text-[10px] text-slate-300 italic">no limit</span>}
                        </div>
                      </div>
                      {limit > 0 && (
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${Math.min(p, 100)}%` }} />
                        </div>
                      )}
                    </div>
                  );
                }

                // sinking_fund — balance / drawn / remaining (calm, no over-budget alarm)
                const balance = env.balance || 0;
                const remaining = balance - spent;
                return (
                  <div key={env.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full bg-${color}-500`} />
                      <span className="text-xs font-bold text-slate-600">{env.name}</span>
                      <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Fund</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black ${remaining < 0 ? 'text-rose-600' : 'text-slate-700'}`}>${remaining.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400"> left</span>
                      <p className="text-[10px] font-semibold text-slate-400">${balance.toFixed(2)} fund · ${spent.toFixed(2)} drawn</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Where to Cut */}
      {cutRecommendations.length > 0 && (
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1 flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Where to Cut
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">
            Based on {selectedMonth ? "this month's" : 'all-time'} spending patterns
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cutRecommendations.map((rec, i) => {
              const style = recTypeStyle[rec.type];
              return (
                <div key={i} className={`${style.bg} border ${style.border} rounded-2xl p-4`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${style.badge} ${style.badgeText}`}>
                        {recLabel[rec.type]}
                      </span>
                      <p className="text-sm font-black text-slate-800 mt-1.5">{rec.category}</p>
                    </div>
                    <span className="text-sm font-black text-slate-700 whitespace-nowrap">${rec.amount.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-500">{rec.reason}</p>
                  {rec.subTip && (
                    <p className="text-[10px] text-slate-400 font-semibold mt-1 border-t border-white/60 pt-1">{rec.subTip}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Spending Breakdown */}
      {spendingByCategory.length > 0 && (
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Spending Breakdown</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">
            Tap a category to see sub-categories
          </p>
          <div className="space-y-3">
            {spendingByCategory.map((cat, i) => {
              const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
              const isExpanded = expandedCategory === cat.name;
              const subCats = subCategoryBreakdown[cat.name] ?? {};
              const sortedSubs = Object.entries(subCats).sort((a, b) => b[1] - a[1]);

              return (
                <div key={cat.name}>
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.name)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs font-black text-slate-700">{cat.name}</span>
                        {i === 0 && (
                          <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Top</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <TrendArrow trend={cat.trend} />
                        <span className="text-xs font-black text-slate-700">
                          ${cat.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{cat.percentage.toFixed(0)}%</span>
                        <svg
                          className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${cat.percentage}%`, backgroundColor: color }}
                      />
                    </div>
                  </button>

                  {isExpanded && sortedSubs.length > 0 && (
                    <div className="mt-2 ml-4 space-y-2 border-l-2 pl-3" style={{ borderColor: color + '40' }}>
                      {sortedSubs.map(([sub, amount]) => {
                        const subPct = cat.value > 0 ? (amount / cat.value) * 100 : 0;
                        return (
                          <div key={sub}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[11px] font-bold text-slate-500">{sub}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-slate-600">${amount.toFixed(2)}</span>
                                <span className="text-[10px] font-bold text-slate-300 w-7 text-right">{subPct.toFixed(0)}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${subPct}%`, backgroundColor: color + 'aa' }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Spending Trend</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySpendingData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="amount" stroke={isJointMode ? '#6366f1' : '#10b981'} fillOpacity={0.1} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Category Distribution</h3>
            {drillCategory && (
              <button
                onClick={() => setDrillCategory(null)}
                className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-4 mb-4">Tap a bar to see transactions</p>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={spendingByCategory}
                layout="vertical"
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const name = data.activePayload[0].payload.name;
                    setDrillCategory(prev => prev === name ? null : name);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 700}} width={80} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {spendingByCategory.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={drillCategory === entry.name ? CATEGORY_COLORS[index % CATEGORY_COLORS.length] : (drillCategory ? '#e2e8f0' : (isJointMode ? '#6366f1' : '#10b981'))}
                      opacity={drillCategory && drillCategory !== entry.name ? 0.4 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Transaction drill-down */}
          {drillCategory && drillTransactions.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: drillColor }} />
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{drillCategory}</span>
                <span className="text-[10px] font-bold text-slate-400">· {drillTransactions.length} transactions</span>
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {drillTransactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-700 truncate">{t.remarks || t.sub_category || t.spending_category}</p>
                      <p className="text-[10px] font-semibold text-slate-400">{new Date(t.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })} · {t.sub_category}</p>
                    </div>
                    <span className="text-sm font-black text-slate-800 ml-3 shrink-0">
                      ${t.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>


    </div>
  );
};

export default AnalyticsDashboard;
