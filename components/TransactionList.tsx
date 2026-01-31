
import React from 'react';
import { Transaction, AccountConfig } from '../types';
import { parseLocalDate } from '../utils';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (t: Transaction) => void;
  accountConfigs: Record<string, AccountConfig>;
}

const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  onDelete, 
  onEdit,
  accountConfigs
}) => {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>No entries recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="text-slate-500 text-sm border-b border-slate-100">
            <th className="pb-4 font-medium">Date</th>
            <th className="pb-4 font-medium">Details</th>
            <th className="pb-4 font-medium">Account</th>
            <th className="pb-4 font-medium text-right">Amount</th>
            <th className="pb-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((t) => {
            const config = accountConfigs[t.account_type];
            // Fix: Parse local date to prevent shifting to previous day
            const dateObj = parseLocalDate(t.date);
            
            return (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                <td className="py-4 text-sm text-slate-600">
                  {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
                <td className="py-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{t.spending_category}</span>
                      <span className="text-xs text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded">{t.sub_category}</span>
                    </div>
                    {t.remarks && <span className="text-xs text-slate-500 mt-1 italic">{t.remarks}</span>}
                  </div>
                </td>
                <td className="py-4">
                  {config ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-${config.color}-100 text-${config.color}-700`}>
                      {config.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-400 italic">
                      Deleted Label
                    </span>
                  )}
                </td>
                <td className="py-4 text-right font-semibold text-slate-700 tabular-nums">
                  ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(t)} className="p-1.5 text-slate-400 hover:text-blue-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg></button>
                    <button onClick={() => onDelete(t.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionList;
