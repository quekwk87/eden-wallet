import React, { useState } from 'react';
import { supabase } from '../supabase';

// Shared household login. Both partners use this same account + PIN.
const SHARED_EMAIL = 'quekwk@gmail.com';

const PinLogin: React.FC = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { setError('Cloud not configured.'); return; }
    if (!pin) return;
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: SHARED_EMAIL, password: pin });
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
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 mb-4">
            <span className="font-black">EW</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">Eden Wallet</h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">Enter your PIN to unlock</p>
        </div>

        <form onSubmit={submit} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          {/* Hidden username so iOS/Safari can save the PIN and offer Face ID autofill */}
          <input type="email" name="email" value={SHARED_EMAIL} autoComplete="username" readOnly hidden />

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
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-center text-2xl tracking-[0.4em] font-bold"
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg disabled:opacity-50"
          >
            {loading ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 text-center mt-4">Shared household access · {SHARED_EMAIL}</p>
      </div>
    </div>
  );
};

export default PinLogin;
