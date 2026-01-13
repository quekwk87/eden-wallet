import React, { useState } from 'react';
import { WorkspaceSettings, Ledger, AccountType, AccountConfig } from '../types';
import { COLOR_PALETTE } from '../constants';
import { dataStorage } from '../storage';
import { supabase, isSupabaseConfigured } from '../supabase';

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
  const [showSql, setShowSql] = useState(false);
  
  const [newLabelName, setNewLabelName] = useState('');

  // Supabase Cloud Sync Settings State
  const [sbUrl, setSbUrl] = useState(JSON.parse(localStorage.getItem('EW_CLOUD_CONFIG') || '{}').supabaseUrl || '');
  const [sbKey, setSbKey] = useState(JSON.parse(localStorage.getItem('EW_CLOUD_CONFIG') || '{}').supabaseKey || '');

  const saveSupabaseConfig = () => {
    if (!sbUrl.trim() || !sbKey.trim()) {
      localStorage.removeItem('EW_CLOUD_CONFIG');
    } else {
      const config = { supabaseUrl: sbUrl.trim(), supabaseKey: sbKey.trim() };
      localStorage.setItem('EW_CLOUD_CONFIG', JSON.stringify(config));
    }
    window.location.reload();
  };

  const testConnection = async () => {
    if (!supabase) {
      setTestStatus({ type: 'error', message: 'Supabase client not initialized. Enter keys and save first.' });
      return;
    }
    setTestStatus({ type: 'loading', message: 'Testing connection and permissions...' });
    
    try {
      // 1. Basic Read Test
      const { error: tError } = await supabase.from('transactions').select('id').limit(1);
      if (tError) {
        if (tError.code === '42P01') throw new Error("Table 'transactions' does not exist. Run the SQL script below.");
        if (tError.code === '42501') throw new Error("Row Level Security (RLS) is blocking access. Add a Policy in Supabase.");
        throw new Error(`Transactions Table: ${tError.message}`);
      }

      // 2. Permission Test (Try to fetch settings)
      const { error: sError } = await supabase.from('workspace_settings').select('id').limit(1);
      if (sError) throw new Error(`Settings Table: ${sError.message}`);

      setTestStatus({ type: 'success', message: 'Connected! Tables found and accessible.' });
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

-- 3. ENABLE RLS (Required for security)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

-- 4. CREATE POLICIES (Allow the app to work with the Shared ID)
-- This allows anyone with the 'anon' key to manage rows with the shared ID
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

  // Rest of original implementation for categories and labels...
  const addCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim() || settings.categories[newCategory]) return;
    saveSettings({
      ...settings,
      categories: { ...settings.categories, [newCategory.trim()]: [] }
    });
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
    saveSettings({
      ...settings,
      categories: {
        ...settings.categories,
        [selectedCategory]: [...settings.categories[selectedCategory], newSubCategory.trim()]
      }
    });
    setNewSubCategory('');
  };

  const deleteSubCategory = (cat: string, sub: string) => {
    saveSettings({
      ...settings,
      categories: {
        ...settings.categories,
        [cat]: settings.categories[cat].filter(s => s !== sub)
      }
    });
  };

  const updateAccountField = (type: string, field: keyof AccountConfig, value: string) => {
    saveSettings({
      ...settings,
      accountConfigs: {
        ...settings.accountConfigs,
        [type]: { ...settings.accountConfigs[type], [field]: value }
      }
    });
  };

  const addAccountLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    const newId = `USER_${Date.now()}`;
    saveSettings({
      ...settings,
      accountConfigs: {
        ...settings.accountConfigs,
        [newId]: {
          label: newLabelName.trim(),
          color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
          description: "Custom label"
        }
      }
    });
    setNewLabelName('');
  };

  const deleteAccountLabel = (type: string) => {
    if (Object.keys(settings.accountConfigs).length <= 1) {
      alert("You must have at least one label.");
      return;
    }
    if (window.confirm(`Delete label "${settings.accountConfigs[type].label}"? Existing transactions using this label will still exist but will show as Unknown.`)) {
      const { [type]: _, ...rest } = settings.accountConfigs;
      let newDefault = settings.defaultAccountType;
      if (type === settings.defaultAccountType) {
        newDefault = Object.keys(rest)[0];
      }
      saveSettings({
        ...settings,
        accountConfigs: rest,
        defaultAccountType: newDefault
      });
      setEditingLabelType(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === 'categories' ? `border-${themeColor}-600 text-${themeColor}-700` : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Categories
        </button>
        <button 
          onClick={() => setActiveTab('accounts')}
          className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === 'accounts' ? `border-${themeColor}-600 text-${themeColor}-700` : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Labels
        </button>
        <button 
          onClick={() => setActiveTab('cloud')}
          className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === 'cloud' ? `border-amber-600 text-amber-700` : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Cloud Sync ✨
        </button>
      </div>

      {activeTab === 'categories' && (
        <div className="space-y-6">
          {selectedCategory ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedCategory(null)} className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h3 className="text-xl font-bold text-slate-800">{selectedCategory}</h3>
              </div>
              <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <form onSubmit={addSubCategory} className="flex gap-2">
                  <input
                    type="text"
                    value={newSubCategory}
                    onChange={(e) => setNewSubCategory(e.target.value)}
                    className={`flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-${themeColor}-500/20`}
                    placeholder="New sub-category..."
                  />
                  <button type="submit" className={`px-6 py-2 bg-${themeColor}-600 text-white font-bold rounded-xl`}>Add</button>
                </form>
              </section>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {settings.categories[selectedCategory].map(sub => (
                  <div key={sub} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group">
                    <span className="font-semibold text-slate-700">{sub}</span>
                    <button onClick={() => deleteSubCategory(selectedCategory, sub)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Add Main Category</h4>
                <form onSubmit={addCategory} className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className={`flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-${themeColor}-500/20`}
                    placeholder="e.g., Insurance, Pet Care..."
                  />
                  <button type="submit" className={`px-8 py-3 bg-${themeColor}-600 text-white font-bold rounded-xl`}>Create</button>
                </form>
              </section>
              <div className="space-y-3">
                {Object.keys(settings.categories).map(cat => (
                  <div key={cat} onClick={() => setSelectedCategory(cat)} className={`bg-white px-6 py-4 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-${themeColor}-500/30 group transition-all`}>
                    <div>
                      <h4 className="font-bold text-slate-800">{cat}</h4>
                      <p className="text-xs text-slate-400">{settings.categories[cat].length} items</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat); }} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'accounts' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {editingLabelType ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4">
                <button onClick={() => setEditingLabelType(null)} className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h3 className="text-xl font-bold text-slate-800">Edit Label</h3>
              </div>
              <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Label Name</label>
                  <input
                    type="text"
                    value={settings.accountConfigs[editingLabelType].label}
                    onChange={(e) => updateAccountField(editingLabelType, 'label', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-slate-200 outline-none"
                    placeholder="Label Name"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Pick a Color</label>
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-3">
                    {COLOR_PALETTE.map(color => (
                      <button
                        key={color}
                        onClick={() => updateAccountField(editingLabelType, 'color', color)}
                        className={`w-10 h-10 rounded-xl bg-${color}-500 border-4 transition-all ${settings.accountConfigs[editingLabelType].color === color ? 'border-slate-800 scale-110 shadow-lg' : 'border-white hover:scale-105'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button 
                    onClick={() => deleteAccountLabel(editingLabelType)}
                    className="w-full py-4 text-rose-600 font-bold border-2 border-rose-100 rounded-xl hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete this Label
                  </button>
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Create New Label</h4>
                <form onSubmit={addAccountLabel} className="flex gap-2">
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className={`flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-${themeColor}-500/20 font-bold`}
                    placeholder="e.g., Company, Vacation..."
                  />
                  <button type="submit" className={`px-8 py-3 bg-${themeColor}-600 text-white font-bold rounded-xl`}>Add</button>
                </form>
              </section>

              <div className="space-y-3">
                {(Object.entries(settings.accountConfigs) as [string, AccountConfig][]).map(([type, config]) => (
                  <div key={type} className="bg-white px-6 py-5 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer group hover:border-slate-400 transition-all" onClick={() => setEditingLabelType(type)}>
                    <div className="flex items-center gap-5">
                      <div className={`w-4 h-4 rounded-full bg-${config.color}-500 shadow-sm shadow-${config.color}-200`}></div>
                      <h4 className="font-bold text-slate-800">{config.label}</h4>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteAccountLabel(type); }} 
                        className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <svg className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'cloud' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200">
            <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Cloud Sync Status
            </h3>
            <p className="text-sm text-amber-700">
              {isSupabaseConfigured 
                ? "Connected to Supabase. Your data is being stored in the cloud."
                : "Not connected. Data is currently being saved to your browser's local storage only."
              }
            </p>
          </div>

          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <h4 className="font-bold text-xl text-slate-800">Supabase Settings</h4>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowSql(!showSql)}
                  className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-xs font-bold border border-slate-100 hover:bg-slate-100 transition-all"
                >
                  {showSql ? 'Hide SQL' : 'Show Setup SQL'}
                </button>
                {isSupabaseConfigured && (
                  <button 
                    onClick={testConnection}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Test Connection
                  </button>
                )}
              </div>
            </div>

            {showSql && (
              <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl font-mono text-[11px] overflow-x-auto relative group animate-in slide-in-from-top-4">
                <p className="text-slate-500 mb-4">-- Run this in your Supabase SQL Editor:</p>
                <pre>{sqlSchema}</pre>
                <button 
                  onClick={() => { navigator.clipboard.writeText(sqlSchema); alert('Copied to clipboard!'); }}
                  className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
                >
                  Copy SQL
                </button>
              </div>
            )}

            {testStatus.type !== 'idle' && (
              <div className={`p-4 rounded-2xl border text-sm flex gap-3 ${
                testStatus.type === 'loading' ? 'bg-slate-50 border-slate-200 text-slate-600' :
                testStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                'bg-rose-50 border-rose-200 text-rose-700'
              }`}>
                {testStatus.type === 'loading' && <div className="animate-spin h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full" />}
                <div className="flex-1">
                  <p className="font-bold">{testStatus.type === 'error' ? 'Connection Failed' : 'Connection Status'}</p>
                  <p>{testStatus.message}</p>
                  {testStatus.type === 'error' && (
                    <p className="mt-2 text-xs italic opacity-80">Check that you have run the SQL script and that RLS policies are added.</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Project URL</label>
                <input
                  type="text"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  placeholder="https://xyz.supabase.co"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">API Key (Anon Public)</label>
                <input
                  type="password"
                  value={sbKey}
                  onChange={(e) => setSbKey(e.target.value)}
                  placeholder="Paste your anon public key here"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="pt-2">
                <button 
                  onClick={saveSupabaseConfig}
                  className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default SettingsManager;
