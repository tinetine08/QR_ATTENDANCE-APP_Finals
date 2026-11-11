import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Load AsyncStorage lazily. If the native module is missing (an old dev build
// that was compiled before AsyncStorage was installed), fall back to
// in-memory storage instead of crashing the whole app on startup.
function getStorage() {
  if (Platform.OS === 'web') return undefined;
  try {
    const mod = require('@react-native-async-storage/async-storage');
    const storage = mod.default ?? mod;
    return storage && typeof storage.getItem === 'function' ? storage : undefined;
  } catch {
    console.warn(
      '[supabase] AsyncStorage native module not available. Session will not persist across restarts.'
    );
    return undefined;
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Only refresh tokens while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}