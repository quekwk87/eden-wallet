
import React from 'react';
import { Ledger } from '../types';

interface HeaderProps {
  title: string;
  toggleSidebar: () => void;
  currentLedger: Ledger;
  setCurrentLedger: (l: Ledger) => void;
  onSignOut?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, toggleSidebar, currentLedger, setCurrentLedger, onSignOut }) => {
  const isJoint = currentLedger === Ledger.JOINT;
  const themeColor = isJoint ? 'indigo' : 'emerald';

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        
        <div className="hidden sm:flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 leading-none">{title} Ledger</h2>
          <span className={`text-[10px] font-black uppercase tracking-widest text-${themeColor}-600 mt-1 transition-colors`}>
            {isJoint ? 'Shared Funds' : 'Private Workspace'}
          </span>
        </div>
      </div>

      {/* Persistence Ledger Switcher for iPhone/Touch */}
      <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200 shadow-inner">
        <button
          onClick={() => setCurrentLedger(Ledger.PERSONAL)}
          className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
            !isJoint 
              ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-50' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Personal
        </button>
        <button
          onClick={() => setCurrentLedger(Ledger.JOINT)}
          className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
            isJoint 
              ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-50' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Joint
        </button>
      </div>
      
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full bg-${themeColor}-100 flex items-center justify-center text-${themeColor}-700 text-xs font-black border-2 border-white shadow-sm transition-all`}>
          {isJoint ? 'NX' : 'QW'}
        </div>
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
            aria-label="Lock / sign out"
            title="Lock"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
