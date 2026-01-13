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
  const localConfig = getLocalConfig();
  
  // Check process.env first, but ensure they aren't placeholders or empty
  const envUrl = process.env.SUPABASE_URL;
  const envKey = process.env.SUPABASE_ANON_KEY;
  
  const finalUrl = (envUrl && envUrl.startsWith('https://') && !envUrl.includes('placeholder')) 
    ? envUrl 
    : localConfig.supabaseUrl;
    
  const finalKey = (envKey && envKey.length > 20 && !envKey.includes('placeholder'))
    ? envKey
    : localConfig.supabaseKey;

  return { url: finalUrl, key: finalKey };
};

const { url, key } = getKeys();

// Only create a real client if valid keys exist
export const isSupabaseConfigured = !!(url && key && url.startsWith('https://'));

export const supabase = isSupabaseConfigured 
  ? createClient(url, key)
  : null;
