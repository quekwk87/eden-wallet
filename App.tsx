
import React, { useState, useEffect } from 'react';
import { Transaction, AppTab, WorkspaceSettings, Ledger, SystemAccountType, Envelope } from './types';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SettingsManager from './components/SettingsManager';
import { DEFAULT_SPENDING_CATEGORIES, ACCOUNT_CONFIG } from './constants';
import { dataStorage } from './storage';
import { isSupabaseConfigured } from './supabase';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>('add');
  const [currentLedger, setCurrentLedger] = useState<Ledger>(Ledger.PERSONAL);
  const [personalTransactions, setPersonalTransactions] = useState<Transaction[]>([]);
  const [jointTransactions, setJointTransactions] = useState<Transaction[]>([]);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  
  const [settings, setSettings] = useState<WorkspaceSettings>({
    categories: DEFAULT_SPENDING_CATEGORIES,
    accountConfigs: ACCOUNT_CONFIG,
    defaultAccountType: SystemAccountType.OWN_EXPENSE,
    defaultCategory: '',
    defaultSubCategories: {},
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const fetchData = async () => {
    setLoading(true);
    
    // Load settings for the current workspace
    const savedSettings = await dataStorage.getSettings(currentLedger);
    if (savedSettings) {
      setSettings(savedSettings);
    } else {
      setSettings({
        categories: DEFAULT_SPENDING_CATEGORIES,
        accountConfigs: ACCOUNT_CONFIG,
        defaultAccountType: SystemAccountType.OWN_EXPENSE,
        defaultCategory: '',
        defaultSubCategories: {},
      });
    }

    // Load transactions for BOTH ledgers to support cross-ledger analytics
    const pTxs = await dataStorage.getTransactions(Ledger.PERSONAL);
    const jTxs = await dataStorage.getTransactions(Ledger.JOINT);

    setPersonalTransactions(pTxs);
    setJointTransactions(jTxs);

    // Load envelopes for the current ledger (+ one-time migration of old budgets)
    await loadEnvelopes(currentLedger, savedSettings);

    setLoading(false);
  };

  // Load envelopes for a ledger. On first load, migrate any old categoryBudgets
  // into the matching envelope amounts (once, guarded by settings.budgetsMigrated).
  const loadEnvelopes = async (ledger: Ledger, currentSettings?: WorkspaceSettings | null) => {
    let envs = await dataStorage.getEnvelopes(ledger);

    const s = currentSettings;
    const needsMigration = s && !s.budgetsMigrated && s.categoryBudgets && Object.keys(s.categoryBudgets).length > 0;
    if (needsMigration) {
      for (const [cat, amt] of Object.entries(s!.categoryBudgets!)) {
        const env = envs.find(e => e.name === cat);
        if (env && amt > 0 && (!env.monthly_amount || env.monthly_amount === 0)) {
          await dataStorage.updateEnvelope({ ...env, monthly_amount: amt }, ledger);
        }
      }
      const migrated = { ...s!, budgetsMigrated: true };
      await dataStorage.saveSettings(migrated, ledger);
      setSettings(migrated);
      envs = await dataStorage.getEnvelopes(ledger);
    }

    setEnvelopes(envs);
  };

  const reloadEnvelopes = () => loadEnvelopes(currentLedger);

  // Silently re-fetch settings from Supabase without triggering the full loading spinner.
  // This ensures edits always start from the latest cloud state, preventing stale-state
  // overwrites when the app is open on multiple devices (desktop + mobile).
  const refreshSettings = async () => {
    const savedSettings = await dataStorage.getSettings(currentLedger);
    if (savedSettings) setSettings(savedSettings);
  };

  useEffect(() => {
    fetchData();
  }, [currentLedger]);

  // Re-fetch fresh settings whenever the user opens the settings tab,
  // so any categories added on another device are loaded before editing.
  useEffect(() => {
    if (activeTab === 'settings') {
      refreshSettings();
    }
  }, [activeTab]);

  // Re-fetch when the app regains focus (e.g. switching back from another tab or
  // bringing a mobile browser back to the foreground).
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) refreshSettings();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentLedger]);

  const handleAddTransaction = async (t: Omit<Transaction, 'id'>) => {
    await dataStorage.saveTransaction(t, currentLedger);
    // Refresh both sets of data
    fetchData();
    setActiveTab('history');
  };

  const handleUpdateTransaction = async (t: Transaction) => {
    await dataStorage.updateTransaction(t, currentLedger);
    fetchData();
    setEditingTransaction(null);
    setActiveTab('history');
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this entry?')) {
      await dataStorage.deleteTransaction(id, currentLedger);
      fetchData();
    }
  };

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setActiveTab('add');
  };

  const handleUpdateSettings = async (newSettings: WorkspaceSettings) => {
    setSettings(newSettings);
    await dataStorage.saveSettings(newSettings, currentLedger);
  };
  
  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setActiveTab('history');
  }

  const isJoint = currentLedger === Ledger.JOINT;
  const themeColor = isJoint ? 'indigo' : 'emerald';
  
  const currentTransactions = isJoint ? jointTransactions : personalTransactions;
  const showForm = activeTab === 'add' || editingTransaction !== null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentLedger={currentLedger} 
        setCurrentLedger={setCurrentLedger} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          title={isJoint ? 'Joint' : 'Personal'} 
          toggleSidebar={() => setIsSidebarOpen(true)} 
          currentLedger={currentLedger}
          setCurrentLedger={setCurrentLedger}
        />
        
        {!isSupabaseConfigured && (
          <div className="bg-amber-50 border-b border-amber-100 px-4 md:px-8 py-1.5 flex items-center justify-between">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
              Offline Mode: Data saved locally
            </p>
            <button 
              onClick={() => setActiveTab('settings')}
              className="text-[10px] font-black text-amber-800 underline uppercase tracking-widest"
            >
              Sync Cloud
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className={`animate-spin h-8 w-8 border-4 border-${themeColor}-500 border-t-transparent rounded-full`}></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Updating Ledger...</p>
              </div>
            ) : (
              <>
                {showForm && (
                  <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                          <div className={`w-8 h-8 bg-${themeColor}-500 rounded-lg flex items-center justify-center text-white`}>
                            {editingTransaction ? 
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002 2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                            }
                          </div>
                          {editingTransaction ? 'Edit' : 'Add'} Entry
                        </h2>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{currentLedger}</span>
                      </div>
                      <TransactionForm
                        onSubmit={handleAddTransaction}
                        onUpdate={handleUpdateTransaction}
                        categories={settings.categories}
                        themeColor={themeColor}
                        accountConfigs={settings.accountConfigs}
                        defaultAccountType={settings.defaultAccountType}
                        defaultCategory={settings.defaultCategory}
                        defaultSubCategories={settings.defaultSubCategories}
                        transaction={editingTransaction}
                        onCancel={handleCancelEdit}
                        transactions={currentTransactions}
                        monthlyBudget={settings.monthlyBudget}
                        categoryBudgets={settings.categoryBudgets}
                        envelopes={envelopes}
                      />
                    </section>
                  </div>
                )}
                {activeTab === 'history' && !editingTransaction && (
                  <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <TransactionList 
                      transactions={currentTransactions} 
                      onDelete={handleDelete} 
                      onEdit={handleEdit} 
                      accountConfigs={settings.accountConfigs} 
                    />
                  </section>
                )}
                {activeTab === 'analytics' && !editingTransaction && (
                  <AnalyticsDashboard 
                    personalTransactions={personalTransactions}
                    jointTransactions={jointTransactions}
                    currentLedger={currentLedger} 
                  />
                )}
                {activeTab === 'settings' && !editingTransaction && (
                  <SettingsManager
                    settings={settings}
                    setSettings={handleUpdateSettings}
                    themeColor={themeColor}
                    currentLedger={currentLedger}
                    envelopes={envelopes}
                    onEnvelopesChanged={reloadEnvelopes}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
