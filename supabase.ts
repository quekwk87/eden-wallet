import { createClient } from '@supabase/supabase-js';

// Helper to safely parse local config
const getLocalConfig = () => {
  try {
    return JSON.parse(localStorage.getItem('EW_CLOUD_CONFIG') || '{}');
  } catch {
    return {};
  }
};

const getKeys = () => {
  // Use environment variables if set (for Vercel production)
  // Otherwise use manually entered config from Settings UI
  const localConfig = getLocalConfig();
  
  return {
    url: (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'https://placeholder-url.supabase.co') 
      ? process.env.SUPABASE_URL 
      : localConfig.supabaseUrl,
    key: (process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY !== 'placeholder-key')
      ? process.env.SUPABASE_ANON_KEY
      : localConfig.supabaseKey
  };
};

const { url, key } = getKeys();

// Only create a real client if valid keys exist
export const isSupabaseConfigured = !!(url && key && url.startsWith('https://'));

export const supabase = isSupabaseConfigured 
  ? createClient(url, key)
  : null;