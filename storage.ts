
import { Transaction, Ledger, WorkspaceSettings, CategoryMap, AccountConfig } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'eden_wallet_data';
const LOCAL_SETTINGS_KEY = 'eden_wallet_settings';
const SHARED_USER_ID = '00000000-0000-0000-0000-000000000000';

export const dataStorage = {
  /**
   * Transactions Logic
   */
  async getTransactions(ledger: Ledger): Promise<Transaction[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', SHARED_USER_ID)
          .eq('ledger', ledger)
          .order('date', { ascending: false });
        
        if (!error && data) {
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_${ledger}`, JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.error("Cloud Transaction Fetch Failed:", e);
      }
    }
    return JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_KEY}_${ledger}`) || '[]');
  },

  async saveTransaction(t: Omit<Transaction, 'id'>, ledger: Ledger): Promise<boolean> {
    const tempId = crypto.randomUUID();
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('transactions').insert([{
        ...t,
        user_id: SHARED_USER_ID,
        ledger: ledger
      }]);
      if (!error) return true;
    }
    const current = JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_KEY}_${ledger}`) || '[]');
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${ledger}`, JSON.stringify([{ ...t, id: tempId }, ...current]));
    return true;
  },

  async deleteTransaction(id: string, ledger: Ledger): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('transactions').delete().eq('id', id);
    }
    const current = JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_KEY}_${ledger}`) || '[]');
    const filtered = current.filter((t: any) => t.id !== id);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${ledger}`, JSON.stringify(filtered));
    return true;
  },

  /**
   * Settings & Master Lists Logic (Categories & Account Labels)
   */
  async getSettings(ledger: Ledger): Promise<WorkspaceSettings | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        // Fetch Categories
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('name, sub_categories')
          .eq('user_id', SHARED_USER_ID)
          .eq('ledger', ledger);

        // Fetch Labels
        const { data: labelData, error: labelError } = await supabase
          .from('account_labels')
          .select('key, label, color')
          .eq('user_id', SHARED_USER_ID)
          .eq('ledger', ledger);

        if (!catError && !labelError && catData && labelData && catData.length > 0) {
          const categories: CategoryMap = {};
          catData.forEach(c => categories[c.name] = c.sub_categories);

          const accountConfigs: Record<string, AccountConfig> = {};
          labelData.forEach(l => accountConfigs[l.key] = { label: l.label, color: l.color, description: "" });

          const settings: WorkspaceSettings = {
            categories,
            accountConfigs,
            defaultAccountType: labelData[0]?.key || 'OWN_EXPENSE'
          };

          localStorage.setItem(`${LOCAL_SETTINGS_KEY}_${ledger}`, JSON.stringify(settings));
          return settings;
        }
      } catch (e) {
        console.error("Cloud Settings Fetch Error:", e);
      }
    }
    const local = localStorage.getItem(`${LOCAL_SETTINGS_KEY}_${ledger}`);
    return local ? JSON.parse(local) : null;
  },

  async saveSettings(settings: WorkspaceSettings, ledger: Ledger): Promise<void> {
    // 1. Save Locally for instant update
    localStorage.setItem(`${LOCAL_SETTINGS_KEY}_${ledger}`, JSON.stringify(settings));

    // 2. Sync to Cloud
    if (isSupabaseConfigured && supabase) {
      try {
        // --- Sync Categories ---
        // Step A: Clear existing categories for this ledger
        await supabase.from('categories').delete().eq('user_id', SHARED_USER_ID).eq('ledger', ledger);
        // Step B: Insert current master list
        const categoryInserts = Object.entries(settings.categories).map(([name, subs]) => ({
          user_id: SHARED_USER_ID,
          ledger,
          name,
          sub_categories: subs
        }));
        await supabase.from('categories').insert(categoryInserts);

        // --- Sync Labels ---
        // Step A: Clear existing labels
        await supabase.from('account_labels').delete().eq('user_id', SHARED_USER_ID).eq('ledger', ledger);
        // Step B: Insert current labels
        const labelInserts = Object.entries(settings.accountConfigs).map(([key, cfg]) => ({
          user_id: SHARED_USER_ID,
          ledger,
          key,
          label: cfg.label,
          color: cfg.color
        }));
        await supabase.from('account_labels').insert(labelInserts);
        
      } catch (e) {
        console.error("Cloud Master List Sync Failed:", e);
      }
    }
  }
};
