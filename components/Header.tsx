
import React from 'react';
import { Ledger } from '../types';

interface HeaderProps {
  title: string;
  toggleSidebar: () => void;
  currentLedger: Ledger;
}

const Header: React.FC<HeaderProps> = ({ title, toggleSidebar, currentLedger }) => {
  const isJoint = currentLedger === Ledger.JOINT;
  const themeColor = isJoint ? 'indigo' : 'emerald';

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex flex-col">
          <h2 className="text-lg md:text-xl font-bold text-slate-800 leading-none">{title}</h2>
          <span className={`text-[10px] font-black uppercase tracking-widest text-${themeColor}-600 mt-1 transition-colors`}>
            {isJoint ? 'Joint Account' : 'Personal Account'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl bg-${themeColor}-100 flex items-center justify-center text-${themeColor}-700 text-xs font-bold ring-2 ring-white ring-offset-2 ring-${themeColor}-50 transition-all`}>
          {isJoint ? 'NX' : 'QW'}
        </div>
      </div>
    </header>
  );
};

export default Header;
