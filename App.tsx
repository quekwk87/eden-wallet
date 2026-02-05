
import React, { useState, useEffect } from 'react';
import { Transaction, AppTab, WorkspaceSettings, Ledger, AccountType, SystemAccountType } from './types';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SettingsManager from './components/SettingsManager';
import SmartAdd from './components/SmartAdd';
import { DEFAULT_SPENDING_CATEGORIES, ACCOUNT_CONFIG } from './constants';
import { dataStorage } from './storage';
import { isSupabaseConfigured } from './supabase';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>('add');
  const [currentLedger, setCurrentLedger] = useState<Ledger>(Ledger.PERSONAL);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [settings, setSettings] = useState<WorkspaceSettings>({
    categories: DEFAULT_SPENDING_CATEGORIES,
    accountConfigs: ACCOUNT_CONFIG,
    defaultAccountType: SystemAccountType.OWN_EXPENSE
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const fetchData = async () => {
    setLoading(true);
    
    // Load Master Lists from Cloud
    const savedSettings = await dataStorage.getSettings(currentLedger);
    if (savedSettings) {
      setSettings(savedSettings);
    } else {
      // If no cloud data found, use defaults and SEED the cloud
      const defaults = {
        categories: DEFAULT_SPENDING_CATEGORIES,
        accountConfigs: ACCOUNT_CONFIG,
        defaultAccountType: SystemAccountType.OWN_EXPENSE
      };
      setSettings(defaults);
      if (isSupabaseConfigured) {
        console.log("Seeding initial master lists to cloud...");
        await dataStorage.saveSettings(defaults, currentLedger);
      }
    }

    // Load transactions
    const txs = await dataStorage.getTransactions(currentLedger);
    setTransactions(txs);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentLedger]);

  const handleAddTransaction = async (t: Omit<Transaction, 'id'>) => {
    await dataStorage.saveTransaction(t, currentLedger);
    const txs = await dataStorage.getTransactions(currentLedger);
    setTransactions(txs);
    setActiveTab('history');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this entry?')) {
      await dataStorage.deleteTransaction(id, currentLedger);
      const txs = await dataStorage.getTransactions(currentLedger);
      setTransactions(txs);
    }
  };

  const handleUpdateSettings = async (newSettings: WorkspaceSettings) => {
    setSettings(newSettings);
    await dataStorage.saveSettings(newSettings, currentLedger);
  };

  const isJoint = currentLedger === Ledger.JOINT;
  const themeColor = isJoint ? 'indigo' : 'emerald';

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
          title={isJoint ? 'Joint Ledger' : 'Personal Ledger'} 
          toggleSidebar={() => setIsSidebarOpen(true)} 
          currentLedger={currentLedger} 
        />
        
        {!isSupabaseConfigured && (
          <div className="bg-amber-50 border-b border-amber-100 px-8 py-2 flex items-center justify-between">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
              Offline Mode: Master Lists stored in this browser only.
            </p>
            <button onClick={() => setActiveTab('settings')} className="text-[10px] font-black text-amber-800 underline uppercase tracking-widest">Setup Cloud Sync</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className={`animate-spin h-10 w-10 border-4 border-${themeColor}-500 border-t-transparent rounded-full`}></div>
                <p className="text-sm font-medium text-slate-400">Loading Master Lists...</p>
              </div>
            ) : (
              <>
                {activeTab === 'add' && (
                  <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                      <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
                        <div className={`w-8 h-8 bg-${themeColor}-500 rounded-xl flex items-center justify-center text-white`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        Smart Add
                      </h2>
                      <SmartAdd categories={settings.categories} onAdd={handleAddTransaction} currentLedger={currentLedger} accountConfigs={settings.accountConfigs} />
                    </section>
                    <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                      <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><span className="w-2 h-6 bg-slate-200 rounded-full"></span>Manual Entry</h2>
                      <TransactionForm onSubmit={handleAddTransaction} categories={settings.categories} themeColor={themeColor} accountConfigs={settings.accountConfigs} defaultAccountType={settings.defaultAccountType} />
                    </section>
                  </div>
                )}
                {activeTab === 'history' && (
                  <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <TransactionList transactions={transactions} onDelete={handleDelete} onEdit={setEditingTransaction} accountConfigs={settings.accountConfigs} />
                  </section>
                )}
                {activeTab === 'analytics' && <AnalyticsDashboard transactions={transactions} currentLedger={currentLedger} />}
                {activeTab === 'settings' && <SettingsManager settings={settings} setSettings={handleUpdateSettings} themeColor={themeColor} currentLedger={currentLedger} />}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
