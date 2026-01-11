
import React, { useState } from 'react';
import { WorkspaceSettings, Ledger, AccountType, AccountConfig } from '../types';
import { COLOR_PALETTE } from '../constants';

interface SettingsManagerProps {
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
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
  const [editingLabelType, setEditingLabelType] = useState<AccountType | null>(null);

  // Supabase Cloud Sync Settings State
  const [sbUrl, setSbUrl] = useState(JSON.parse(localStorage.getItem('EW_CLOUD_CONFIG') || '{}').supabaseUrl || '');
  const [sbKey, setSbKey] = useState(JSON.parse(localStorage.getItem('EW_CLOUD_CONFIG') || '{}').supabaseKey || '');

  const saveSupabaseConfig = () => {
    if (!sbUrl.trim() || !sbKey.trim()) {
      localStorage.removeItem('EW_CLOUD_CONFIG');
    } else {
      const config = { supabaseUrl: sbUrl, supabaseKey: sbKey };
      localStorage.setItem('EW_CLOUD_CONFIG', JSON.stringify(config));
    }
    window.location.reload(); // Reload to apply new database connection
  };

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    if (settings.categories[newCategory]) return;
    setSettings(prev => ({
      ...prev,
      categories: { ...prev.categories, [newCategory.trim()]: [] }
    }));
    setNewCategory('');
  };

  const deleteCategory = (cat: string) => {
    if (window.confirm(`Delete "${cat}"?`)) {
      const { [cat]: _, ...rest } = settings.categories;
      setSettings(prev => ({ ...prev, categories: rest }));
      if (selectedCategory === cat) setSelectedCategory(null);
    }
  };

  const addSubCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !newSubCategory.trim()) return;
    if (settings.categories[selectedCategory].includes(newSubCategory.trim())) return;
    setSettings(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [selectedCategory]: [...prev.categories[selectedCategory], newSubCategory.trim()]
      }
    }));
    setNewSubCategory('');
  };

  const deleteSubCategory = (cat: string, sub: string) => {
    setSettings(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [cat]: prev.categories[cat].filter(s => s !== sub)
      }
    }));
  };

  const updateAccountField = (type: AccountType, field: keyof AccountConfig, value: string) => {
    setSettings(prev => ({
      ...prev,
      accountConfigs: {
        ...prev.accountConfigs,
        [type]: { ...prev.accountConfigs[type], [field]: value }
      }
    }));
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
                <input
                  type="text"
                  value={settings.accountConfigs[editingLabelType].label}
                  onChange={(e) => updateAccountField(editingLabelType, 'label', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  placeholder="Label Name"
                />
                <div className="flex flex-wrap gap-3">
                  {COLOR_PALETTE.map(color => (
                    <button
                      key={color}
                      onClick={() => updateAccountField(editingLabelType, 'color', color)}
                      className={`w-10 h-10 rounded-xl bg-${color}-500 border-2 ${settings.accountConfigs[editingLabelType].color === color ? 'border-slate-900 shadow-lg' : 'border-white'}`}
                    />
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-3">
              {(Object.entries(settings.accountConfigs) as [AccountType, AccountConfig][]).map(([type, config]) => (
                <div key={type} onClick={() => setEditingLabelType(type)} className="bg-white px-6 py-5 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer group hover:border-slate-400 transition-all">
                  <div className="flex items-center gap-5">
                    <div className={`w-4 h-4 rounded-full bg-${config.color}-500`}></div>
                    <h4 className="font-bold text-slate-800">{config.label}</h4>
                  </div>
                  <svg className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'cloud' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200">
            <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Cloud Sync
            </h3>
            <p className="text-sm text-amber-700">
              To sync your data with your wife's phone, enter your Supabase credentials below. 
              Once saved, your data will be stored securely in the cloud.
            </p>
          </div>

          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <h4 className="font-bold text-xl text-slate-800">Supabase Configuration</h4>
            </div>
            
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

              <button 
                onClick={saveSupabaseConfig}
                className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
              >
                Connect & Refresh
              </button>
              
              <p className="text-[10px] text-center text-slate-400 px-4">
                Leave fields empty and click "Connect & Refresh" to go back to Offline-only mode.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default SettingsManager;
