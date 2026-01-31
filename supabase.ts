
import { createClient } from '@supabase/supabase-js';

const getKeys = () => {
  // Use Vercel / Vite environment variables
  // Note: Vite typically uses import.meta.env, but the provided vite.config.ts
  // maps process.env for compatibility.
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  const isValidUrl = (u: any) => typeof u === 'string' && u.startsWith('https://');
  const isValidKey = (k: any) => typeof k === 'string' && k.length > 20;

  return {
    url: isValidUrl(url) ? url.trim() : '',
    key: isValidKey(key) ? key.trim() : ''
  };
};

const { url, key } = getKeys();

// Only create a real client if valid keys exist in the environment
export const isSupabaseConfigured = !!(url && key);

export const supabase = isSupabaseConfigured 
  ? createClient(url, key)
  : null;

export const getDebugConfig = () => {
  const keys = getKeys();
  return {
    url: keys.url || 'Missing SUPABASE_URL in Environment',
    keySuffix: keys.key ? `...${keys.key.slice(-8)}` : 'Missing SUPABASE_ANON_KEY in Environment',
    isConfigured: isSupabaseConfigured
  };
};
