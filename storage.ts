
import { Transaction, Ledger, WorkspaceSettings, SystemAccountType, Envelope, ChatMessage } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'eden_wallet_data';
const LOCAL_SETTINGS_KEY = 'eden_wallet_settings';
const LOCAL_ENVELOPES_KEY = 'eden_wallet_envelopes';
const LOCAL_AI_CONVERSATION_KEY = 'eden_wallet_ai_conversation';
const PENDING_TX_KEY = 'eden_wallet_pending_tx';
const SHARED_USER_ID = '00000000-0000-0000-0000-000000000000';

// A flaky connection doesn't always fail fast — a fetch can sit pending for a
// long time before the browser gives up. Race it against a short timeout so a
// save falls back to the offline queue (and the caller gets a result) quickly
// instead of leaving the user staring at nothing.
const TX_TIMEOUT_MS = 6000;
const withTimeout = <T>(query: PromiseLike<T>, ms: number = TX_TIMEOUT_MS): Promise<T> =>
  Promise.race([
    Promise.resolve(query),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms)),
  ]);

// ── Offline-safe transaction sync ──────────────────────────────────────────
// A create/update/delete that can't reach Supabase (offline, dropped request)
// used to silently fall back to a localStorage-only write with no way back —
// the very next successful cloud fetch would overwrite that local copy and
// the change was gone for good. These queue the change per ledger instead, so
// it survives until it can actually be pushed, and getTransactions() merges
// still-pending changes on top of the cloud snapshot rather than clobbering
// them.
type PendingMutation =
  | { kind: 'create'; tempId: string; payload: Omit<Transaction, 'id'> }
  | { kind: 'update'; id: string; payload: Transaction }
  | { kind: 'delete'; id: string };

const getPending = (ledger: Ledger): PendingMutation[] =>
  JSON.parse(localStorage.getItem(`${PENDING_TX_KEY}_${ledger}`) || '[]');

const setPending = (ledger: Ledger, list: PendingMutation[]): void => {
  localStorage.setItem(`${PENDING_TX_KEY}_${ledger}`, JSON.stringify(list));
};

// Applies still-pending updates/deletes on top of a cloud snapshot and adds
// pending creates, so a not-yet-synced change is reflected immediately
// instead of waiting for its flush to succeed.
const applyPending = (cloudRows: Transaction[], pending: PendingMutation[]): Transaction[] => {
  let rows = cloudRows;
  for (const m of pending) {
    if (m.kind === 'update') rows = rows.map(r => (r.id === m.id ? m.payload : r));
    else if (m.kind === 'delete') rows = rows.filter(r => r.id !== m.id);
  }
  const creates = pending
    .filter((m): m is Extract<PendingMutation, { kind: 'create' }> => m.kind === 'create')
    .map(m => ({ ...m.payload, id: m.tempId } as Transaction));
  return [...creates, ...rows];
};

// Attempts to push every queued change for a ledger to Supabase, in order.
// Stops at the first mutation that throws (almost always still offline) and
// keeps it plus everything after it queued for the next attempt; a mutation
// Supabase actively rejects (returns an error rather than throwing) is also
// kept queued so it isn't silently dropped.
const flushPendingTransactions = async (ledger: Ledger): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) return;
  const pending = getPending(ledger);
  if (pending.length === 0) return;

  const remaining: PendingMutation[] = [];
  for (let i = 0; i < pending.length; i++) {
    const m = pending[i];
    try {
      if (m.kind === 'create') {
        const { error } = await withTimeout(supabase
          .from('transactions')
          .insert([{ ...m.payload, id: m.tempId, user_id: SHARED_USER_ID, ledger }]));
        if (error) remaining.push(m);
      } else if (m.kind === 'update') {
        const { id, ...fields } = m.payload;
        const { error } = await withTimeout(supabase
          .from('transactions')
          .update({ ...fields, user_id: SHARED_USER_ID, ledger })
          .eq('id', id));
        if (error) remaining.push(m);
      } else {
        const { error } = await withTimeout(supabase.from('transactions').delete().eq('id', m.id));
        if (error) remaining.push(m);
      }
    } catch (e) {
      remaining.push(...pending.slice(i));
      break;
    }
  }
  setPending(ledger, remaining);
};

export const dataStorage = {
  /**
   * Transactions Logic
   */
  async getTransactions(ledger: Ledger): Promise<Transaction[]> {
    if (isSupabaseConfigured && supabase) {
      await flushPendingTransactions(ledger).catch(() => {});
      try {
        const { data, error } = await withTimeout(supabase
          .from('transactions')
          .select('*')
          .eq('user_id', SHARED_USER_ID)
          .eq('ledger', ledger)
          .order('date', { ascending: false }));

        if (!error && data) {
          // Merge in anything still queued (didn't flush — still offline) so it
          // isn't clobbered by this cloud snapshot.
          const merged = applyPending(data, getPending(ledger));
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_${ledger}`, JSON.stringify(merged));
          return merged;
        }
      } catch (e) {
        console.error("Cloud Transaction Fetch Failed:", e);
      }
    }

    return JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_KEY}_${ledger}`) || '[]');
  },

  async saveTransaction(t: Omit<Transaction, 'id'>, ledger: Ledger): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await withTimeout(supabase.from('transactions').insert([{
          ...t,
          user_id: SHARED_USER_ID,
          ledger: ledger
        }]));
        if (!error) return true;
      } catch (e) {
        // fall through — offline path below
      }
    }

    // Offline, or the cloud write failed — save locally and queue it to sync
    // once Supabase is reachable again, instead of losing it on the next fetch.
    const tempId = crypto.randomUUID();
    const current = JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_KEY}_${ledger}`) || '[]');
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${ledger}`, JSON.stringify([{ ...t, id: tempId }, ...current]));
    setPending(ledger, [...getPending(ledger), { kind: 'create', tempId, payload: t }]);
    return true;
  },

  async updateTransaction(t: Transaction, ledger: Ledger): Promise<boolean> {
    const pending = getPending(ledger);
    const pendingCreateIdx = pending.findIndex(m => m.kind === 'create' && m.tempId === t.id);

    // If this row hasn't even reached the cloud yet, there's nothing to PATCH
    // there — just update the queued create in place.
    if (pendingCreateIdx === -1 && isSupabaseConfigured && supabase) {
      try {
        const { id, ...fields } = t;
        const { error } = await withTimeout(supabase
          .from('transactions')
          .update({ ...fields, user_id: SHARED_USER_ID, ledger })
          .eq('id', id));
        if (!error) return true;
      } catch (e) {
        // fall through — offline path below
      }
    }

    const current: Transaction[] = JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_KEY}_${ledger}`) || '[]');
    const updated = current.map((item) => item.id === t.id ? t : item);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${ledger}`, JSON.stringify(updated));

    if (pendingCreateIdx !== -1) {
      const { id, ...fields } = t;
      const next = [...pending];
      next[pendingCreateIdx] = { kind: 'create', tempId: t.id, payload: fields };
      setPending(ledger, next);
    } else {
      setPending(ledger, [...pending.filter(m => !(m.kind === 'update' && m.id === t.id)), { kind: 'update', id: t.id, payload: t }]);
    }
    return true;
  },

  async deleteTransaction(id: string, ledger: Ledger): Promise<boolean> {
    const pending = getPending(ledger);
    const pendingCreateIdx = pending.findIndex(m => m.kind === 'create' && m.tempId === id);

    if (pendingCreateIdx === -1 && isSupabaseConfigured && supabase) {
      try {
        const { error } = await withTimeout(supabase.from('transactions').delete().eq('id', id));
        if (!error) {
          const current = JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_KEY}_${ledger}`) || '[]');
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_${ledger}`, JSON.stringify(current.filter((t: any) => t.id !== id)));
          setPending(ledger, pending.filter(m => !(m.kind === 'update' && m.id === id)));
          return true;
        }
      } catch (e) {
        // fall through — offline path below
      }
    }

    const current = JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_KEY}_${ledger}`) || '[]');
    const filtered = current.filter((t: any) => t.id !== id);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${ledger}`, JSON.stringify(filtered));

    if (pendingCreateIdx !== -1) {
      // Never made it to the cloud — just drop the queued create.
      setPending(ledger, pending.filter((_, i) => i !== pendingCreateIdx));
    } else {
      setPending(ledger, [...pending.filter(m => !(m.kind === 'update' && m.id === id) && !(m.kind === 'delete' && m.id === id)), { kind: 'delete', id }]);
    }
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
  },

  /**
   * AI Analyzer conversation history — per ledger, so it survives closing the
   * app and reopening on another device. Mirrors the settings/envelope pattern:
   * Supabase first, localStorage mirror/fallback.
   */
  async getAiConversation(ledger: Ledger): Promise<ChatMessage[]> {
    const local = localStorage.getItem(`${LOCAL_AI_CONVERSATION_KEY}_${ledger}`);
    const parsedLocal: ChatMessage[] = local ? JSON.parse(local) : [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('ai_conversations')
          .select('messages')
          .eq('user_id', SHARED_USER_ID)
          .eq('ledger', ledger)
          .maybeSingle();

        if (!error && data?.messages) {
          localStorage.setItem(`${LOCAL_AI_CONVERSATION_KEY}_${ledger}`, JSON.stringify(data.messages));
          return data.messages;
        }
      } catch (e) {
        console.error("AI Conversation Fetch Failed:", e);
      }
    }

    return parsedLocal;
  },

  async saveAiConversation(ledger: Ledger, messages: ChatMessage[]): Promise<void> {
    localStorage.setItem(`${LOCAL_AI_CONVERSATION_KEY}_${ledger}`, JSON.stringify(messages));

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('ai_conversations')
        .upsert({
          user_id: SHARED_USER_ID,
          ledger,
          messages,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,ledger' });

      if (error) console.error("Cloud AI Conversation Sync Failed:", error.message);
    }
  }
};
