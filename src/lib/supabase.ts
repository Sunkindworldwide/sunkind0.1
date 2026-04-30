import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Create a safe dummy client that returns dummy objects instead of throwing
// This allows the app to stay functional (though limited) even when keys are missing
const createSafeProxy = (message: string) => {
  const dummyFn: any = (...args: any[]) => {
    console.warn(message);
    const chainable = {
      data: null,
      error: null,
      on: () => chainable,
      subscribe: () => ({ unsubscribe: () => {} }),
      channel: () => dummyFn(), // Recursive for chaining
      from: () => dummyFn(),
      select: () => dummyFn(),
      insert: () => dummyFn(),
      upsert: () => dummyFn(),
      delete: () => dummyFn(),
      update: () => dummyFn(),
      eq: () => dummyFn(),
      order: () => dummyFn(),
      limit: () => dummyFn(),
      single: () => dummyFn(),
      maybeSingle: () => dummyFn(),
      then: (cb: any) => Promise.resolve({ data: null, error: null }).then(cb),
      catch: (cb: any) => Promise.resolve().catch(cb),
    };
    return chainable;
  };

  const handler: ProxyHandler<any> = {
    get: (target, prop) => {
      if (prop === 'auth') {
        return {
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithOAuth: () => Promise.resolve({ error: new Error(message) }),
          signOut: () => Promise.resolve({ error: null }),
        };
      }
      // Return a function that is itself a proxy to prevent "is not a function" errors
      return new Proxy(dummyFn, handler);
    }
  };

  return new Proxy({}, handler);
};

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createSafeProxy('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
