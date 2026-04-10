
import React, { useState, useEffect } from 'react';
import type { Transaction, CategoryMap, AccountConfig } from '../types';
import { getLocalDateString } from '../utils';

interface TransactionFormProps {
  transaction?: Transaction | null;
  onCancel?: () => void;
  categories: CategoryMap;
  themeColor?: string;
  accountConfigs: Record<string, AccountConfig>;
  defaultAccountType: string;
  defaultCategory?: string;
  defaultSubCategories?: Record<string, string>;
  onSubmit: (t: Omit<Transaction, 'id'>) => void;
  onUpdate: (t: Transaction) => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onSubmit,
  onUpdate, 
  transaction, 
  onCancel, 
  categories, 
  themeColor = 'emerald',
  accountConfigs,
  defaultAccountType,
  defaultCategory,
  defaultSubCategories
}) => {
  const categoryNames = Object.keys(categories);
  const accountEntries = Object.entries(accountConfigs) as [string, AccountConfig][];

  const getInitialCategory = () => {
    if (transaction) return transaction.spending_category;
    return (defaultCategory && categories[defaultCategory]) ? defaultCategory : (categoryNames[0] || '');
  };

  const getInitialSubCategory = (cat: string) => {
    if (transaction) return transaction.sub_category;
    const defSub = defaultSubCategories?.[cat];
    if (defSub && categories[cat]?.includes(defSub)) return defSub;
    return categories[cat]?.[0] || '';
  };

  const [amount, setAmount] = useState(transaction?.amount.toString() || '');
  const [date, setDate] = useState(transaction?.date || getLocalDateString());
  const [spending_category, setSpendingCategory] = useState(getInitialCategory);
  const [sub_category, setSubCategory] = useState(() => getInitialSubCategory(getInitialCategory()));
  
  const initialAccount = (transaction?.account_type && accountConfigs[transaction.account_type])
    ? transaction.account_type
    : (accountConfigs[defaultAccountType] ? defaultAccountType : accountEntries[0]?.[0] || '');
    
  const [selectedAccount, setSelectedAccount] = useState<string>(initialAccount);
  const [remarks, setRemarks] = useState(transaction?.remarks || '');

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setDate(transaction.date);
      setSpendingCategory(transaction.spending_category);
      setSubCategory(transaction.sub_category);
      setSelectedAccount(accountConfigs[transaction.account_type] ? transaction.account_type : (accountEntries[0]?.[0] || ''));
      setRemarks(transaction.remarks);
    } else {
      // Reset form for new entry
      const initCat = (defaultCategory && categories[defaultCategory]) ? defaultCategory : (categoryNames[0] || '');
      const defSub = defaultSubCategories?.[initCat];
      const initSub = (defSub && categories[initCat]?.includes(defSub)) ? defSub : (categories[initCat]?.[0] || '');
      setAmount('');
      setDate(getLocalDateString());
      setSpendingCategory(initCat);
      setSubCategory(initSub);
      setSelectedAccount(accountConfigs[defaultAccountType] ? defaultAccountType : (accountEntries[0]?.[0] || ''));
      setRemarks('');
    }
  }, [transaction, defaultAccountType, accountConfigs, categories]);

  useEffect(() => {
    if (!transaction || spending_category !== transaction.spending_category) {
      const availableSubs = categories[spending_category] || [];
      const defSub = defaultSubCategories?.[spending_category];
      const sub = (defSub && availableSubs.includes(defSub)) ? defSub : (availableSubs[0] || '');
      setSubCategory(sub);
    }
  }, [spending_category, categories, transaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !spending_category || !selectedAccount) return;

    if (transaction) {
      onUpdate({
        id: transaction.id,
        amount: parseFloat(amount),
        spending_category,
        sub_category,
        date,
        account_type: selectedAccount,
        remarks,
      });
    } else {
      onSubmit({
        amount: parseFloat(amount),
        spending_category,
        sub_category,
        date,
        account_type: selectedAccount,
        remarks,
      });
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
          {accountEntries.map(([type, config]) => (
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
          {accountEntries.length === 0 && <p className="text-rose-500 text-xs italic">No labels found. Please add one in Settings.</p>}
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        {transaction && onCancel && (
          <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl">Cancel</button>
        )}
        <button type="submit" className={`flex-[2] bg-${themeColor}-600 text-white font-bold py-3.5 rounded-xl shadow-lg disabled:opacity-50`} disabled={accountEntries.length === 0}>
          {transaction ? 'Save Changes' : 'Record Entry'}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
