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
      
      if (error) {
        console.error(`Supabase Fetch Error (${ledger}):`, error.message);
      } else if (data) {
        return data;
      }
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
      
      if (error) {
        console.error("Supabase Save Error:", error.message);
        // We return false here if we want to force local fallback, 
        // but logging helps the user see WHY it failed.
      } else {
        return true;
      }
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
      if (error) {
        console.error("Supabase Delete Error:", error.message);
      } else {
        return true;
      }
    }

    // 2. Local Storage
    const current = await this.getTransactions(ledger);
    const filtered = current.filter(t => t.id !== id);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${ledger}`, JSON.stringify(filtered));
    return true;
  },

  async getSettings(ledger: Ledger): Promise<WorkspaceSettings | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('workspace_settings')
        .select('settings')
        .eq('user_id', SHARED_USER_ID)
        .eq('ledger', ledger)
        .maybeSingle();
      
      if (error) console.error("Supabase Settings Fetch Error:", error.message);
      if (data) return data.settings;
    }
    return null;
  },

  async saveSettings(settings: WorkspaceSettings, ledger: Ledger): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('workspace_settings')
        .upsert({ user_id: SHARED_USER_ID, ledger, settings });
      
      if (error) console.error("Supabase Settings Save Error:", error.message);
    }
  }
};
