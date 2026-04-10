
import React, { useState } from 'react';
import { WorkspaceSettings, Ledger, AccountConfig, CategoryMap } from '../types';
import { COLOR_PALETTE } from '../constants';
import { dataStorage } from '../storage';
import { supabase, isSupabaseConfigured } from '../supabase';
import CategoryManager from './CategoryManager';

interface SettingsManagerProps {
  settings: WorkspaceSettings;
  setSettings: (s: WorkspaceSettings) => void;
  themeColor: string;
  currentLedger: Ledger;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ 
  settings, 
  setSettings, 
  themeColor, 
  currentLedger 
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'accounts' | 'cloud'>('categories');
  const [editingLabelType, setEditingLabelType] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error' | 'idle' | 'loading', message: string }>({ type: 'idle', message: '' });
  const [newLabelName, setNewLabelName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const saveSettings = async (newSettings: WorkspaceSettings) => {
    setIsSyncing(true);
    setSettings(newSettings);
    await dataStorage.saveSettings(newSettings, currentLedger);
    setTimeout(() => setIsSyncing(false), 800);
  };

  const handleUpdateCategories = (newCategories: CategoryMap | ((prev: CategoryMap) => CategoryMap)) => {
    const categoriesValue = typeof newCategories === 'function' ? newCategories(settings.categories) : newCategories;
    saveSettings({ ...settings, categories: categoriesValue });
  };

  const handleSetDefaultCategory = (cat: string) => {
    saveSettings({ ...settings, defaultCategory: cat });
  };

  const handleSetDefaultSubCategory = (cat: string, sub: string) => {
    saveSettings({ ...settings, defaultSubCategories: { ...(settings.defaultSubCategories || {}), [cat]: sub } });
  };

  const testConnection = async () => {
    if (!supabase) {
      setTestStatus({ 
        type: 'error', 
        message: `Environment Variables Missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in your deployment settings.` 
      });
      return;
    }
    setTestStatus({ type: 'loading', message: 'Testing connection...' });
    
    try {
      const { error: tError } = await supabase.from('transactions').select('id').limit(1);
      if (tError) {
        if (tError.code === '42P01') throw new Error("Tables not found. Please run the SQL script below in your Supabase SQL Editor.");
        throw new Error(tError.message);
      }
      setTestStatus({ type: 'success', message: 'Perfect! Application is correctly connected to your Supabase cloud.' });
    } catch (err: any) {
      setTestStatus({ type: 'error', message: err.message });
    }
  };

  const sqlSchema = `-- 1. CREATE TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ledger TEXT NOT NULL,
  date TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  spending_category TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  account_type TEXT NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREATE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS workspace_settings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ledger TEXT NOT NULL,
  settings JSONB NOT NULL,
  UNIQUE(user_id, ledger)
);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

-- 4. CREATE ACCESS POLICIES (SHARED ACCESS)
CREATE POLICY "Allow Anonymous Transactions" ON transactions
FOR ALL TO anon USING (user_id = '00000000-0000-0000-0000-000000000000')
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');

CREATE POLICY "Allow Anonymous Settings" ON workspace_settings
FOR ALL TO anon USING (user_id = '00000000-0000-0000-0000-000000000000')
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');`;

  const updateAccountField = (type: string, field: keyof AccountConfig, value: string) => {
    saveSettings({ ...settings, accountConfigs: { ...settings.accountConfigs, [type]: { ...settings.accountConfigs[type], [field]: value } } });
  };

  const addAccountLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    const newId = `USER_${Date.now()}`;
    saveSettings({ ...settings, accountConfigs: { ...settings.accountConfigs, [newId]: { label: newLabelName.trim(), color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)], description: "Custom label" } } });
    setNewLabelName('');
  };

  const deleteAccountLabel = (type: string) => {
    if (Object.keys(settings.accountConfigs).length <= 1) return alert("At least one label required.");
    if (window.confirm(`Delete label "${settings.accountConfigs[type].label}"?`)) {
      const { [type]: _, ...rest } = settings.accountConfigs;
      saveSettings({ ...settings, accountConfigs: rest, defaultAccountType: type === settings.defaultAccountType ? Object.keys(rest)[0] : settings.defaultAccountType });
      setEditingLabelType(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex">
          <button onClick={() => setActiveTab('categories')} className={`px-6 py-4 font-bold text-sm ${activeTab === 'categories' ? `border-b-2 border-${themeColor}-600 text-${themeColor}-700` : 'text-slate-500'}`}>Master Categories</button>
          <button onClick={() => setActiveTab('accounts')} className={`px-6 py-4 font-bold text-sm ${activeTab === 'accounts' ? `border-b-2 border-${themeColor}-600 text-${themeColor}-700` : 'text-slate-500'}`}>Account Labels</button>
          <button onClick={() => setActiveTab('cloud')} className={`px-6 py-4 font-bold text-sm ${activeTab === 'cloud' ? `border-b-2 border-amber-600 text-amber-700` : 'text-slate-500'}`}>Cloud Sync ✨</button>
        </div>
        
        {isSyncing && (
          <div className="pr-4 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Cloud Saving...
          </div>
        )}
      </div>

      {activeTab === 'categories' && (
        <CategoryManager
          categories={settings.categories}
          setCategories={handleUpdateCategories}
          defaultCategory={settings.defaultCategory || ''}
          onSetDefaultCategory={handleSetDefaultCategory}
          defaultSubCategories={settings.defaultSubCategories || {}}
          onSetDefaultSubCategory={handleSetDefaultSubCategory}
          themeColor={themeColor}
        />
      )}

      {activeTab === 'accounts' && (
        <div className="space-y-6">
          {editingLabelType ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 space-y-6">
              <button onClick={() => setEditingLabelType(null)} className="text-slate-500 font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                Back to Labels
              </button>
              <input value={settings.accountConfigs[editingLabelType].label} onChange={(e) => updateAccountField(editingLabelType, 'label', e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold" />
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PALETTE.map(c => (
                  <button key={c} onClick={() => updateAccountField(editingLabelType, 'color', c)} className={`h-10 rounded-lg bg-${c}-500 border-4 ${settings.accountConfigs[editingLabelType].color === c ? 'border-slate-800' : 'border-white'}`} />
                ))}
              </div>
              <button onClick={() => deleteAccountLabel(editingLabelType)} className="w-full py-3 text-rose-600 font-bold border border-rose-100 rounded-xl hover:bg-rose-50">Delete Label</button>
            </div>
          ) : (
            <>
              <form onSubmit={addAccountLabel} className="bg-white p-6 rounded-3xl border border-slate-200 flex gap-2">
                <input value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="New Label (e.g. Work)..." />
                <button type="submit" className={`px-8 py-3 bg-${themeColor}-600 text-white font-bold rounded-xl`}>Add</button>
              </form>
              <div className="space-y-3">
                {(Object.entries(settings.accountConfigs) as [string, AccountConfig][]).map(([type, config]) => (
                  <div key={type} onClick={() => setEditingLabelType(type)} className="bg-white px-6 py-4 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-400">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full bg-${config.color}-500`} />
                      <h4 className="font-bold text-slate-800">{config.label}</h4>
                    </div>
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'cloud' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border ${isSupabaseConfigured ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
            <h3 className="text-lg font-black mb-1 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              {isSupabaseConfigured ? 'Environment Keys Detected' : 'No Keys Detected'}
            </h3>
            <p className="text-sm opacity-90">
              {isSupabaseConfigured 
                ? "Your transactions, categories, and labels are synced to your Supabase project."
                : "Cloud Sync is disabled. Set your Environment Variables in Vercel to enable data synchronization."}
            </p>
            <button onClick={testConnection} className="mt-4 px-6 py-2 bg-white/50 hover:bg-white/80 rounded-xl text-sm font-bold transition-all">Check Connection Status</button>
          </div>

          {testStatus.type !== 'idle' && (
            <div className={`p-4 rounded-2xl border text-sm font-medium ${testStatus.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              <p>{testStatus.message}</p>
            </div>
          )}

          <div className="bg-slate-900 text-slate-300 p-6 rounded-3xl overflow-hidden relative group">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Database Setup SQL</h4>
              <button onClick={() => { navigator.clipboard.writeText(sqlSchema); alert('SQL Copied!'); }} className="text-[10px] bg-slate-800 px-3 py-1 rounded-lg hover:bg-slate-700 transition-colors">Copy Full Script</button>
            </div>
            <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">{sqlSchema}</pre>
            <p className="mt-4 text-[10px] text-slate-500 italic">Paste this into the Supabase SQL Editor and click 'Run'.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsManager;
