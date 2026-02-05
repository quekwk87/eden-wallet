
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

  const testConnection = async () => {
    if (!supabase) {
      setTestStatus({ type: 'error', message: `Environment Variables Missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.` });
      return;
    }
    setTestStatus({ type: 'loading', message: 'Testing connection...' });
    try {
      const { error } = await supabase.from('categories').select('count');
      if (error) throw error;
      setTestStatus({ type: 'success', message: 'Perfect! Categories and Labels are successfully syncing to your database rows.' });
    } catch (err: any) {
      setTestStatus({ type: 'error', message: err.message || 'Table not found. Please run the SQL script below.' });
    }
  };

  const sqlSchema = `-- MASTER LIST TABLES FOR CATEGORIES AND LABELS
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger TEXT NOT NULL,
  name TEXT NOT NULL,
  sub_categories TEXT[] NOT NULL,
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'
);

CREATE TABLE account_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'
);

-- ENABLE PUBLIC ACCESS FOR SHARED USER
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow Public Categories" ON categories FOR ALL TO anon USING (user_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Allow Public Labels" ON account_labels FOR ALL TO anon USING (user_id = '00000000-0000-0000-0000-000000000000');`;

  const updateAccountField = (type: string, field: keyof AccountConfig, value: string) => {
    saveSettings({ ...settings, accountConfigs: { ...settings.accountConfigs, [type]: { ...settings.accountConfigs[type], [field]: value } } });
  };

  const addAccountLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    const newId = `USER_${Date.now()}`;
    saveSettings({ ...settings, accountConfigs: { ...settings.accountConfigs, [newId]: { label: newLabelName.trim(), color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)], description: "" } } });
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
            Syncing Master Lists...
          </div>
        )}
      </div>

      {activeTab === 'categories' && <CategoryManager categories={settings.categories} setCategories={handleUpdateCategories} themeColor={themeColor} />}

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
            <h3 className="text-lg font-black mb-1 flex items-center gap-2">Cloud Configuration</h3>
            <p className="text-sm opacity-90">To sync Categories and Labels, you must create the <code>categories</code> and <code>account_labels</code> tables in Supabase.</p>
            <button onClick={testConnection} className="mt-4 px-6 py-2 bg-white/50 hover:bg-white/80 rounded-xl text-sm font-bold transition-all">Check Connection</button>
          </div>
          {testStatus.type !== 'idle' && (
            <div className={`p-4 rounded-2xl border text-sm font-medium ${testStatus.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              <p>{testStatus.message}</p>
            </div>
          )}
          <div className="bg-slate-900 text-slate-300 p-6 rounded-3xl overflow-hidden relative group">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Master List Tables SQL</h4>
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
