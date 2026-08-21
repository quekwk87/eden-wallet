
import { Transaction, Ledger, WorkspaceSettings, SystemAccountType, Envelope } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'eden_wallet_data';
const LOCAL_SETTINGS_KEY = 'eden_wallet_settings';
const LOCAL_ENVELOPES_KEY = 'eden_wallet_envelopes';
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

  async updateTransaction(t: Transaction, ledger: Ledger): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { id, ...fields } = t;
      const { error } = await supabase
        .from('transactions')
        .update({ ...fields, user_id: SHARED_USER_ID, ledger })
        .eq('id', id);
      if (!error) return true;
    }

    const current: Transaction[] = JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_KEY}_${ledger}`) || '[]');
    const updated = current.map((item) => item.id === t.id ? t : item);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${ledger}`, JSON.stringify(updated));
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
   * Settings & Categories Logic
   */
  async getSettings(ledger: Ledger): Promise<WorkspaceSettings | null> {
    const localSettings = localStorage.getItem(`${LOCAL_SETTINGS_KEY}_${ledger}`);
    const parsedLocal = localSettings ? JSON.parse(localSettings) : null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('workspace_settings')
          .select('settings')
          .eq('user_id', SHARED_USER_ID)
          .eq('ledger', ledger)
          .maybeSingle();
        
        if (!error && data?.settings) {
          localStorage.setItem(`${LOCAL_SETTINGS_KEY}_${ledger}`, JSON.stringify(data.settings));
          return data.settings;
        } else if (!error && !data && parsedLocal) {
          // Sync existing local settings to cloud if cloud is empty
          await this.saveSettings(parsedLocal, ledger);
          return parsedLocal;
        }
      } catch (e) {
        console.error("Settings Sync Error:", e);
      }
    }
    
    return parsedLocal;
  },

  async saveSettings(settings: WorkspaceSettings, ledger: Ledger): Promise<void> {
    localStorage.setItem(`${LOCAL_SETTINGS_KEY}_${ledger}`, JSON.stringify(settings));

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('workspace_settings')
        .upsert({
          user_id: SHARED_USER_ID,
          ledger,
          settings,
        }, { onConflict: 'user_id,ledger' });

      if (error) console.error("Cloud Settings Sync Failed:", error.message);
    }
  },

  /**
   * Envelopes Logic (budgets + sinking funds)
   * Mirrors the transaction pattern: Supabase first, localStorage mirror/fallback.
   * Only active envelopes are returned (delete = set active=false).
   */
  async getEnvelopes(ledger: Ledger): Promise<Envelope[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('envelopes')
          .select('*')
          .eq('user_id', SHARED_USER_ID)
          .eq('ledger', ledger)
          .eq('active', true)
          .order('sort_order', { ascending: true });

        if (!error && data) {
          localStorage.setItem(`${LOCAL_ENVELOPES_KEY}_${ledger}`, JSON.stringify(data));
          return data as Envelope[];
        }
      } catch (e) {
        console.error("Cloud Envelope Fetch Failed:", e);
      }
    }

    return JSON.parse(localStorage.getItem(`${LOCAL_ENVELOPES_KEY}_${ledger}`) || '[]');
  },

  async saveEnvelope(env: Omit<Envelope, 'id'>, ledger: Ledger): Promise<Envelope | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('envelopes')
        .insert([{ ...env, user_id: SHARED_USER_ID, ledger }])
        .select()
        .single();
      if (!error && data) return data as Envelope;
    }

    // localStorage fallback
    const created = { ...env, id: crypto.randomUUID(), ledger } as Envelope;
    const current: Envelope[] = JSON.parse(localStorage.getItem(`${LOCAL_ENVELOPES_KEY}_${ledger}`) || '[]');
    localStorage.setItem(`${LOCAL_ENVELOPES_KEY}_${ledger}`, JSON.stringify([...current, created]));
    return created;
  },

  async updateEnvelope(env: Envelope, ledger: Ledger): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { id, ...fields } = env;
      const { error } = await supabase
        .from('envelopes')
        .update({ ...fields, user_id: SHARED_USER_ID, ledger })
        .eq('id', id);
      if (!error) return true;
    }

    const current: Envelope[] = JSON.parse(localStorage.getItem(`${LOCAL_ENVELOPES_KEY}_${ledger}`) || '[]');
    const updated = current.map((e) => e.id === env.id ? env : e);
    localStorage.setItem(`${LOCAL_ENVELOPES_KEY}_${ledger}`, JSON.stringify(updated));
    return true;
  },

  async deactivateEnvelope(id: string, ledger: Ledger): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('envelopes').update({ active: false }).eq('id', id);
    }

    const current: Envelope[] = JSON.parse(localStorage.getItem(`${LOCAL_ENVELOPES_KEY}_${ledger}`) || '[]');
    const filtered = current.filter((e) => e.id !== id);
    localStorage.setItem(`${LOCAL_ENVELOPES_KEY}_${ledger}`, JSON.stringify(filtered));
    return true;
  }
};
