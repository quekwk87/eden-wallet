
import React, { useState } from 'react';
import { WorkspaceSettings, Ledger, AccountType, AccountConfig } from '../types';
import { COLOR_PALETTE } from '../constants';
import { dataStorage } from '../storage';
import { supabase, isSupabaseConfigured, getDebugConfig } from '../supabase';

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
  const [newCategory, setNewCategory] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingLabelType, setEditingLabelType] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error' | 'idle' | 'loading', message: string }>({ type: 'idle', message: '' });
  const [showSql, setShowSql] = useState(true);
  
  const [newLabelName, setNewLabelName] = useState('');

  const testConnection = async () => {
    if (!supabase) {
      const debug = getDebugConfig();
      setTestStatus({ 
        type: 'error', 
        message: `Environment Variables Missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel settings.` 
      });
      return;
    }
    setTestStatus({ type: 'loading', message: 'Testing connection...' });
    
    try {
      const { error: tError } = await supabase.from('transactions').select('id').limit(1);
      if (tError) {
        if (tError.code === '42P01') throw new Error("Table 'transactions' not found. Run the SQL script below.");
        if (tError.code === '42501') throw new Error("Permission Denied: Ensure Row Level Security (RLS) policies are added.");
        throw new Error(tError.message);
      }
      setTestStatus({ type: 'success', message: 'Perfect! Application is correctly connected to your Supabase cloud.' });
    } catch (err: any) {
      setTestStatus({ type: 'error', message: err.message });
    }
  };

  const sqlSchema = `-- 1. Create Transactions Table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  spending_category TEXT NOT NULL,
  sub_category TEXT,
  account_type TEXT NOT NULL,
  remarks TEXT,
  ledger TEXT NOT NULL,
  user_id UUID NOT NULL
);

-- 2. Create Workspace Settings Table
CREATE TABLE workspace_settings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL,
  ledger TEXT NOT NULL,
  settings JSONB NOT NULL,
  UNIQUE(user_id, ledger)
);

-- 3. ENABLE RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

-- 4. CREATE POLICIES (Required for the shared ID used in this app)
CREATE POLICY "Allow Shared Access" ON transactions
FOR ALL TO anon USING (user_id = '00000000-0000-0000-0000-000000000000')
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');

CREATE POLICY "Allow Shared Settings" ON workspace_settings
FOR ALL TO anon USING (user_id = '00000000-0000-0000-0000-000000000000')
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');`;

  const saveSettings = (newSettings: WorkspaceSettings) => {
    setSettings(newSettings);
    dataStorage.saveSettings(newSettings, currentLedger);
  };

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim() || settings.categories[newCategory]) return;
    saveSettings({ ...settings, categories: { ...settings.categories, [newCategory.trim()]: [] } });
    setNewCategory('');
  };

  const deleteCategory = (cat: string) => {
    if (window.confirm(`Delete "${cat}"?`)) {
      const { [cat]: _, ...rest } = settings.categories;
      saveSettings({ ...settings, categories: rest });
      if (selectedCategory === cat) setSelectedCategory(null);
    }
  };

  const addSubCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !newSubCategory.trim()) return;
    if (settings.categories[selectedCategory].includes(newSubCategory.trim())) return;
    saveSettings({ ...settings, categories: { ...settings.categories, [selectedCategory]: [...settings.categories[selectedCategory], newSubCategory.trim()] } });
    setNewSubCategory('');
  };

  const deleteSubCategory = (cat: string, sub: string) => {
    saveSettings({ ...settings, categories: { ...settings.categories, [cat]: settings.categories[cat].filter(s => s !== sub) } });
  };

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
      <div className="flex border-b border-slate-200">
        <button onClick={() => setActiveTab('categories')} className={`px-6 py-4 font-bold text-sm ${activeTab === 'categories' ? `border-b-2 border-${themeColor}-600 text-${themeColor}-700` : 'text-slate-500'}`}>Categories</button>
        <button onClick={() => setActiveTab('accounts')} className={`px-6 py-4 font-bold text-sm ${activeTab === 'accounts' ? `border-b-2 border-${themeColor}-600 text-${themeColor}-700` : 'text-slate-500'}`}>Labels</button>
        <button onClick={() => setActiveTab('cloud')} className={`px-6 py-4 font-bold text-sm ${activeTab === 'cloud' ? `border-b-2 border-amber-600 text-amber-700` : 'text-slate-500'}`}>Cloud Sync ✨</button>
      </div>

      {activeTab === 'categories' && (
        <div className="space-y-6">
          {selectedCategory ? (
            <div className="space-y-6">
              <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                Back to Categories
              </button>
              <h3 className="text-2xl font-black text-slate-800">{selectedCategory}</h3>
              <form onSubmit={addSubCategory} className="flex gap-2">
                <input type="text" value={newSubCategory} onChange={(e) => setNewSubCategory(e.target.value)} className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none" placeholder="Add sub-category..." />
                <button type="submit" className={`px-6 py-3 bg-${themeColor}-600 text-white font-bold rounded-xl`}>Add</button>
              </form>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {settings.categories[selectedCategory].map(sub => (
                  <div key={sub} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group">
                    <span className="font-semibold text-slate-700">{sub}</span>
                    <button onClick={() => deleteSubCategory(selectedCategory, sub)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={addCategory} className="flex gap-2 bg-white p-6 rounded-3xl border border-slate-200">
                <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="New Category (e.g. Health)..." />
                <button type="submit" className={`px-8 py-3 bg-${themeColor}-600 text-white font-bold rounded-xl`}>Create</button>
              </form>
              <div className="space-y-3">
                {Object.keys(settings.categories).map(cat => (
                  <div key={cat} onClick={() => setSelectedCategory(cat)} className="bg-white px-6 py-4 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer group hover:border-slate-400 transition-all">
                    <h4 className="font-bold text-slate-800">{cat}</h4>
                    <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat); }} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
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
                {/* Fix: Explicitly cast Object.entries to ensure config is treated as AccountConfig instead of unknown */}
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
                ? "Your app is pulling Supabase keys from Vercel Environment Variables. This is secure and ready for use."
                : "You must set SUPABASE_URL and SUPABASE_ANON_KEY in your Vercel Project Settings for cloud sync to work."}
            </p>
            <button onClick={testConnection} className="mt-4 px-6 py-2 bg-white/50 hover:bg-white/80 rounded-xl text-sm font-bold transition-all">Test Database Connection</button>
          </div>

          {testStatus.type !== 'idle' && (
            <div className={`p-4 rounded-2xl border text-sm font-medium ${testStatus.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              <p>{testStatus.message}</p>
            </div>
          )}

          <div className="bg-slate-900 text-slate-300 p-6 rounded-3xl overflow-hidden relative group">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Required Supabase SQL</h4>
              <button onClick={() => { navigator.clipboard.writeText(sqlSchema); alert('SQL Copied!'); }} className="text-[10px] bg-slate-800 px-3 py-1 rounded-lg hover:bg-slate-700">Copy Script</button>
            </div>
            <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">{sqlSchema}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsManager;
