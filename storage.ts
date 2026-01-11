
import { Transaction, Ledger, WorkspaceSettings } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'eden_wallet_data';
const SHARED_USER_ID = '00000000-0000-0000-0000-000000000000';

export const dataStorage = {
  async getTransactions(ledger: Ledger): Promise<Transaction[]> {
    // 1. Try Supabase
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', SHARED_USER_ID)
        .eq('ledger', ledger)
        .order('date', { ascending: false });
      
      if (!error && data) return data;
    }
    
    // 2. Fallback to local storage
    const localData = JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_KEY}_${ledger}`) || '[]');
    return localData;
  },

  async saveTransaction(t: Omit<Transaction, 'id'>, ledger: Ledger): Promise<boolean> {
    // 1. Try Supabase
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('transactions').insert([{
        ...t,
        user_id: SHARED_USER_ID,
        ledger: ledger
      }]);
      if (!error) return true;
    }

    // 2. Fallback to local storage
    const current = await this.getTransactions(ledger);
    const newTx = { ...t, id: crypto.randomUUID() };
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${ledger}`, JSON.stringify([newTx, ...current]));
    return true;
  },

  async deleteTransaction(id: string, ledger: Ledger): Promise<boolean> {
    // 1. Try Supabase
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (!error) return true;
    }

    // 2. Local Storage
    const current = await this.getTransactions(ledger);
    const filtered = current.filter(t => t.id !== id);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${ledger}`, JSON.stringify(filtered));
    return true;
  },

  async getSettings(ledger: Ledger): Promise<WorkspaceSettings | null> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('workspace_settings')
        .select('settings')
        .eq('user_id', SHARED_USER_ID)
        .eq('ledger', ledger)
        .maybeSingle();
      if (data) return data.settings;
    }
    return null;
  },

  async saveSettings(settings: WorkspaceSettings, ledger: Ledger): Promise<void> {
    // In a full implementation, we would update Supabase here as well.
    // For now, we prioritize persistence via local storage or initial cloud fetch.
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('workspace_settings')
        .upsert({ user_id: SHARED_USER_ID, ledger, settings });
    }
  }
};
