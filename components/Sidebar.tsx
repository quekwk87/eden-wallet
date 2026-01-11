
import React from 'react';
import { AppTab, Ledger } from '../types';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  currentLedger: Ledger;
  setCurrentLedger: (ledger: Ledger) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  currentLedger, 
  setCurrentLedger, 
  isOpen, 
  onClose 
}) => {
  const isJoint = currentLedger === Ledger.JOINT;
  const themeColor = isJoint ? 'indigo' : 'emerald';

  const navItems = [
    { id: 'add', label: 'Add Entry', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
    )},
    { id: 'history', label: 'History', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )},
    { id: 'analytics', label: 'Analytics', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    )},
    { id: 'settings', label: 'Settings', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    )}
  ] as const;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-slate-900/50 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <h1 className={`text-xl font-bold text-${themeColor}-600 flex items-center gap-2 transition-colors`}>
              <div className={`w-8 h-8 bg-${themeColor}-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-${themeColor}-200`}>
                <span className="text-xs">EW</span>
              </div>
              Eden Wallet
            </h1>
          </div>

          <div className="px-4 mb-4">
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
              <button
                onClick={() => setCurrentLedger(Ledger.PERSONAL)}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  currentLedger === Ledger.PERSONAL 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => setCurrentLedger(Ledger.JOINT)}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  currentLedger === Ledger.JOINT 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Joint
              </button>
            </div>
          </div>
          
          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as AppTab);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id 
                    ? `bg-${themeColor}-50 text-${themeColor}-700 shadow-sm shadow-${themeColor}-100/50` 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
          
          <div className="p-4 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1 font-medium">Active Account</p>
              <p className={`text-sm font-bold text-${themeColor}-700`}>{currentLedger === Ledger.PERSONAL ? 'QWK Personal' : 'NXQWK Joint'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
