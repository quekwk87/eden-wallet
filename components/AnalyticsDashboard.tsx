
import React, { useMemo, useState } from 'react';
import { Ledger, SystemAccountType, Transaction, Balances, MonthlyData } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import SmartInsights from './SmartInsights';

interface AnalyticsDashboardProps {
  personalTransactions: Transaction[];
  jointTransactions: Transaction[];
  currentLedger: Ledger;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  personalTransactions, 
  jointTransactions, 
  currentLedger 
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

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
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      const firstDay = new Date(year, monthNum - 1, 1);
      const lastDay = new Date(year, monthNum, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchStart = !startDate || t.date >= startDate;
      const matchEnd = !endDate || t.date <= endDate;
      return matchStart && matchEnd;
    });
  }, [transactions, startDate, endDate]);

  /**
   * Specific Settlement Calculations as requested
   * 1) QWK owe NXQWK = (OWED_TO_NXQWK (QWK account) + OWED_TO_NXQWK (NXQWK account)) - (OWED_BY_NXQWK (QWK account) + OWED_BY_NXQWK (NXQWK account))
   * 2) NXQ owe NXQWK = OWED_BY_NXQ (NXQWK account) - OWED_TO_NXQ (NXQWK account)
   * 3) NXQ owe QWK = OWED_BY_NXQ (QWK account) - OWED_TO_NXQ (QWK account)
   */
  const settlements = useMemo(() => {
    const sum = (txs: Transaction[], type: string) => 
      txs.filter(t => t.account_type === type).reduce((acc, t) => acc + t.amount, 0);

    // Filter by date for settlements as well
    const filterByDate = (txs: Transaction[]) => txs.filter(t => {
      const matchStart = !startDate || t.date >= startDate;
      const matchEnd = !endDate || t.date <= endDate;
      return matchStart && matchEnd;
    });

    const pTxs = filterByDate(personalTransactions);
    const jTxs = filterByDate(jointTransactions);

    const qwkOweNxqwk = (sum(pTxs, SystemAccountType.OWED_TO_NXQWK) + sum(jTxs, SystemAccountType.OWED_TO_NXQWK)) - 
                         (sum(pTxs, SystemAccountType.OWED_BY_NXQWK) + sum(jTxs, SystemAccountType.OWED_BY_NXQWK));

    const nxqOweNxqwk = sum(jTxs, SystemAccountType.OWED_BY_NXQ) - sum(jTxs, SystemAccountType.OWED_TO_NXQ);

    const nxqOweQwk = sum(pTxs, SystemAccountType.OWED_BY_NXQ) - sum(pTxs, SystemAccountType.OWED_TO_NXQ);

    return { qwkOweNxqwk, nxqOweNxqwk, nxqOweQwk };
  }, [personalTransactions, jointTransactions, startDate, endDate]);

  const stats: Balances = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (isPersonalExpense(t.account_type)) {
        acc.totalSpent += t.amount;
      }
      if (t.account_type === SystemAccountType.OWED_BY_NXQ) acc.netNXQ += t.amount;
      if (t.account_type === SystemAccountType.OWED_TO_NXQ) acc.netNXQ -= t.amount;
      if (t.account_type === SystemAccountType.OWED_BY_NXQWK) acc.netNXQWK += t.amount;
      if (t.account_type === SystemAccountType.OWED_TO_NXQWK) acc.netNXQWK -= t.amount;
      return acc;
    }, { totalSpent: 0, netNXQ: 0, netNXQWK: 0 });
  }, [filteredTransactions, isJointMode]);

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
  }, [filteredTransactions, isJointMode]);

  const SettlementCard = ({ label, value, sub }: { label: string; value: number; sub: string }) => (
    <div className={`bg-white p-5 rounded-3xl shadow-sm border ${value > 0 ? 'border-rose-100' : value < 0 ? 'border-emerald-100' : 'border-slate-100'}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</h4>
          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">{sub}</p>
        </div>
        <div className={`w-2 h-2 rounded-full ${value > 0 ? 'bg-rose-400' : value < 0 ? 'bg-emerald-400' : 'bg-slate-200'}`} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-black ${value > 0 ? 'text-rose-600' : value < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
          ${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase">{value >= 0 ? 'Owed' : 'Receivable'}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-${themeColor}-100 rounded-2xl flex items-center justify-center text-${themeColor}-600`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Settlement Center</h3>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={selectedMonth} 
              onChange={(e) => handleMonthChange(e.target.value)} 
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-slate-300"
            >
              <option value="">All Time</option>
              {monthlySpendingData.map(m => (
                <option key={m.sortKey} value={m.sortKey}>{m.month}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <SettlementCard label="QWK owe NXQWK" sub="Shared Fund Contribution" value={settlements.qwkOweNxqwk} />
          <SettlementCard label="NXQ owe NXQWK" sub="Wife Shared Balance" value={settlements.nxqOweNxqwk} />
          <SettlementCard label="NXQ owe QWK" sub="Personal Repayment" value={settlements.nxqOweQwk} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Spent ({currentLedger})</p>
          <span className="text-3xl font-black text-slate-900 leading-none">${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

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
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Category Distribution</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 700}} width={80} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} fill={isJointMode ? '#6366f1' : '#10b981'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-${themeColor}-600`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Smart Insights
        </h3>
        <SmartInsights transactions={filteredTransactions} ledgerName={currentLedger} />
      </section>
    </div>
  );
};

export default AnalyticsDashboard;
