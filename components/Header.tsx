
import React from 'react';
import { Ledger } from '../types';
import { LEDGER_META, LEDGER_ORDER } from '../constants';

interface HeaderProps {
  title: string;
  toggleSidebar: () => void;
  currentLedger: Ledger;
  setCurrentLedger: (l: Ledger) => void;
  onSignOut?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, toggleSidebar, currentLedger, setCurrentLedger, onSignOut }) => {
  const meta = LEDGER_META[currentLedger];
  const themeColor = meta.color;

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
          <h2 className="text-lg font-bold text-slate-800 leading-none">{title}</h2>
          <span className={`text-[10px] font-black uppercase tracking-widest text-${themeColor}-600 mt-1 transition-colors`}>
            {meta.subtitle}
          </span>
        </div>
      </div>

      {/* Ledger switcher (Ducky / Monkey / Joint) */}
      <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200 shadow-inner">
        {LEDGER_ORDER.map((l) => {
          const active = currentLedger === l;
          const c = LEDGER_META[l].color;
          return (
            <button
              key={l}
              onClick={() => setCurrentLedger(l)}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all ${
                active ? `bg-white text-${c}-600 shadow-sm ring-1 ring-${c}-50` : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {LEDGER_META[l].label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full bg-${themeColor}-100 flex items-center justify-center text-${themeColor}-700 text-xs font-black border-2 border-white shadow-sm transition-all`}>
          {meta.initials}
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
