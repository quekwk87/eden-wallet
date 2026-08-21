import React, { useState } from 'react';
import { supabase } from '../supabase';
import { LOGIN_USERS } from '../constants';

// Two-person shared household login. Pick who you are, enter your PIN.
// Each person lands on their own ledger by default (handled in App on sign-in).
const PinLogin: React.FC = () => {
  const [selected, setSelected] = useState(LOGIN_USERS[0]);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { setError('Cloud not configured.'); return; }
    if (!pin) return;
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: selected.email, password: pin });
    setLoading(false);
    if (error) {
      setError('Incorrect PIN. Please try again.');
      setPin('');
    }
    // On success, App's onAuthStateChange picks up the session and renders the app.
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className={`w-14 h-14 bg-${selected.color}-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-${selected.color}-200 mb-4 transition-colors`}>
            <span className="font-black">EW</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">Eden Wallet</h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">Who's logging in?</p>
        </div>

        <form onSubmit={submit} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          {/* Person picker */}
          <div className="grid grid-cols-2 gap-2">
            {LOGIN_USERS.map(u => {
              const active = selected.email === u.email;
              return (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => { setSelected(u); setError(''); }}
                  className={`py-3 rounded-xl border text-sm font-black uppercase tracking-widest transition-all ${
                    active
                      ? `border-${u.color}-500 bg-${u.color}-50 text-${u.color}-700 ring-1 ring-${u.color}-500`
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {u.name}
                </button>
              );
            })}
          </div>

          {/* Hidden username so iOS/Safari saves the PIN per-person and offers Face ID autofill */}
          <input type="email" name="email" value={selected.email} autoComplete="username" readOnly hidden />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              autoFocus
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(''); }}
              placeholder="••••••"
              className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-${selected.color}-500 outline-none text-center text-2xl tracking-[0.4em] font-bold`}
            />
          </div>

          {error && <p className="text-xs font-bold text-rose-600 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !pin}
            className={`w-full bg-${selected.color}-600 text-white font-bold py-3.5 rounded-xl shadow-lg disabled:opacity-50 transition-colors`}
          >
            {loading ? 'Unlocking…' : `Unlock as ${selected.name}`}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 text-center mt-4">Shared household · both accounts visible after login</p>
      </div>
    </div>
  );
};

export default PinLogin;
