
import React, { useState, useEffect } from 'react';
import { AccountType, Transaction, CategoryMap, AccountConfig } from '../types';

interface TransactionFormProps {
  initialData?: Transaction;
  onCancel?: () => void;
  categories: CategoryMap;
  themeColor?: string;
  accountConfigs: Record<AccountType, AccountConfig>;
  defaultAccountType: AccountType;
  onSubmit: (t: { 
    date: string; 
    amount: number; 
    spending_category: string; 
    sub_category: string; 
    account_type: AccountType;
    remarks: string;
  }) => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onSubmit, 
  initialData, 
  onCancel, 
  categories, 
  themeColor = 'emerald',
  accountConfigs,
  defaultAccountType
}) => {
  const categoryNames = Object.keys(categories);
    // Fix: Explicitly cast Object.entries to ensure TypeScript correctly infers config as AccountConfig
  const accountEntries = Object.entries(accountConfigs) as [string, AccountConfig][];

  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [spending_category, setSpendingCategory] = useState(initialData?.spending_category || categoryNames[0] || '');
  const [sub_category, setSubCategory] = useState(initialData?.sub_category || categories[categoryNames[0]]?.[0] || '');
  const [selectedAccount, setSelectedAccount] = useState<AccountType>(initialData?.account_type || defaultAccountType);
  const [remarks, setRemarks] = useState(initialData?.remarks || '');

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setDate(initialData.date);
      setSpendingCategory(initialData.spending_category);
      setSubCategory(initialData.sub_category);
      setSelectedAccount(initialData.account_type);
      setRemarks(initialData.remarks);
    } else {
      setSelectedAccount(defaultAccountType);
    }
  }, [initialData, defaultAccountType]);

  useEffect(() => {
    if (!initialData || spending_category !== initialData.spending_category) {
      const availableSubs = categories[spending_category] || [];
      const firstSub = availableSubs[0] || '';
      setSubCategory(firstSub);
    }
  }, [spending_category, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !spending_category) return;

    onSubmit({
      amount: parseFloat(amount),
      spending_category,
      sub_category,
      date,
      account_type: selectedAccount,
      remarks,
    });

    if (!initialData) {
      setAmount('');
      setRemarks('');
      setSelectedAccount(defaultAccountType);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 font-medium">$</span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none text-lg font-semibold`}
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none`}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select
            value={spending_category}
            onChange={(e) => setSpendingCategory(e.target.value)}
            className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none`}
          >
            {categoryNames.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sub-Category</label>
          <select
            value={sub_category}
            onChange={(e) => setSubCategory(e.target.value)}
            className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none`}
          >
            {(categories[spending_category] || []).map(sub => <option key={sub} value={sub}>{sub}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
        <input
          type="text"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none`}
          placeholder="What was this for?"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">Account Label</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.entries(accountConfigs) as [AccountType, AccountConfig][]).map(([type, config]) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedAccount(type)}
              className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-3 ${
                selectedAccount === type 
                  ? `border-${themeColor}-500 bg-${themeColor}-50 text-${themeColor}-700 ring-1 ring-${themeColor}-500` 
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${selectedAccount === type ? `bg-${config.color}-500` : 'bg-slate-200'}`}></span>
              {config.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl">Cancel</button>
        )}
        <button type="submit" className={`flex-[2] bg-${themeColor}-600 text-white font-bold py-3.5 rounded-xl shadow-lg`}>
          {initialData ? 'Save Changes' : 'Record Entry'}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
