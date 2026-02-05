
import React, { useMemo, useState } from 'react';
import { Transaction, AccountType, Balances, MonthlyData, Ledger, SystemAccountType } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import SmartInsights from './SmartInsights';

interface AnalyticsDashboardProps {
  transactions: Transaction[];
  currentLedger: Ledger;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ transactions, currentLedger }) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const isJoint = currentLedger === Ledger.JOINT;
  const themeColor = isJoint ? 'indigo' : 'emerald';

  const isPersonalExpense = (type: string) => {
    if (!isJoint) {
      const personalKeys: string[] = [
        SystemAccountType.OWN_EXPENSE,
        SystemAccountType.OWED_TO_NXQ,
        SystemAccountType.OWED_TO_NXQWK
      ];
      return personalKeys.includes(type) || type.startsWith('USER_');
    }
    return true;
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = t.date;
      const matchStart = !startDate || d >= startDate;
      const matchEnd = !endDate || d <= endDate;
      return matchStart && matchEnd;
    });
  }, [transactions, startDate, endDate]);

  const stats: Balances = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      const type = t.account_type;
      if (isPersonalExpense(type)) {
        acc.totalSpent += t.amount;
      }
      
      if (type === SystemAccountType.OWED_BY_NXQ) acc.netNXQ += t.amount;
      if (type === SystemAccountType.OWED_TO_NXQ) acc.netNXQ -= t.amount;
      
      if (type === SystemAccountType.OWED_BY_NXQWK) acc.netNXQWK += t.amount;
      if (type === SystemAccountType.OWED_TO_NXQWK) acc.netNXQWK -= t.amount;
      
      return acc;
    }, { totalSpent: 0, netNXQ: 0, netNXQWK: 0 });
  }, [filteredTransactions, isJoint]);

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
  }, [transactions, currentLedger]);

  const spendingByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (isPersonalExpense(t.account_type)) {
        data[t.spending_category] = (data[t.spending_category] || 0) + t.amount;
      }
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, currentLedger]);

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-medium mb-1">Total Spent</p>
          <span className="text-3xl font-black text-slate-900">${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        {!isJoint && (
          <>
            <div className={`bg-white p-6 rounded-3xl shadow-sm border ${stats.netNXQ >= 0 ? 'border-emerald-100' : 'border-rose-100'}`}>
              <p className="text-slate-500 text-sm font-medium mb-1">{stats.netNXQ >= 0 ? 'NXQ owes QWK' : 'QWK owes NXQ'}</p>
              <span className={`text-3xl font-black ${stats.netNXQ >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ${Math.abs(stats.netNXQ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className={`bg-white p-6 rounded-3xl shadow-sm border ${stats.netNXQWK >= 0 ? 'border-emerald-100' : 'border-rose-100'}`}>
              <p className="text-slate-500 text-sm font-medium mb-1">{stats.netNXQWK >= 0 ? 'Fund owes QWK' : 'QWK owes Fund'}</p>
              <span className={`text-3xl font-black ${stats.netNXQWK >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ${Math.abs(stats.netNXQWK).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Spending Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySpendingData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Area type="monotone" dataKey="amount" stroke={isJoint ? '#6366f1' : '#10b981'} fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Category Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11}} width={90} />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} fill={isJoint ? '#6366f1' : '#10b981'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 text-${themeColor}-600`}>Smart Insights</h3>
        <SmartInsights transactions={filteredTransactions} ledgerName={currentLedger} />
      </section>
    </div>
  );
};

export default AnalyticsDashboard;
