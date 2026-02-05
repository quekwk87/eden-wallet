
import { createClient } from '@supabase/supabase-js';

const getKeys = () => {
  let env: any = {};
  try {
    // Check for process.env or standard global access
    if (typeof process !== 'undefined' && process.env) {
      env = process.env;
    } else if ((window as any).process?.env) {
      env = (window as any).process.env;
    }
  } catch (e) {
    console.warn("Environment access restricted.");
  }

  const url = env.SUPABASE_URL || '';
  const key = env.SUPABASE_ANON_KEY || '';

  const isValidUrl = (u: any) => typeof u === 'string' && u.startsWith('https://');
  const isValidKey = (k: any) => typeof k === 'string' && k.length > 20;

  return {
    url: isValidUrl(url) ? url.trim() : '',
    key: isValidKey(key) ? key.trim() : ''
  };
};

const { url, key } = getKeys();

export const isSupabaseConfigured = !!(url && key);

export const supabase = isSupabaseConfigured 
  ? createClient(url, key)
  : null;
