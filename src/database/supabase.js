import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

let clientInstance = null;

// Node.js 20 environment fallback for Supabase Realtime client checks
if (typeof window === 'undefined' && !globalThis.WebSocket) {
  // Define a synchronous dummy class to satisfy the supabase-js validation check.
  // Since we only use database features and never realtime sockets, this dummy
  // class is never instantiated, avoiding runtime crashes.
  globalThis.WebSocket = class DummyWebSocket {
    constructor() {
      throw new Error('Realtime WebSockets are not configured in this Node environment.');
    }
  };
}

if (supabaseUrl && supabaseKey) {
  try {
    clientInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.error('[Supabase] Failed to initialize client:', err.message);
  }
} else {
  console.warn('[Supabase] Missing credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). Database will operate in demo mode.');
}

// Proxy wrapper around supabase client.
// Prevents boot-time crashes by intercepting calls and returning graceful fallbacks
// or descriptive warnings when credentials are not configured.
export const supabase = new Proxy({}, {
  get(target, prop) {
    if (clientInstance) {
      const value = clientInstance[prop];
      if (typeof value === 'function') {
        return value.bind(clientInstance);
      }
      return value;
    }

    // Fallback Mock implementation to prevent boot crashes
    console.warn(`[Supabase Proxy] Database offline. Call to "${String(prop)}" intercepted.`);
    
    // Return mock chainable database queries
    return function() {
      const mockResult = {
        select: () => mockResult,
        insert: () => Promise.resolve({ data: [], error: { message: 'Supabase offline' } }),
        upsert: () => mockResult,
        update: () => mockResult,
        delete: () => mockResult,
        eq: () => mockResult,
        in: () => mockResult,
        order: () => mockResult,
        limit: () => mockResult,
        single: () => Promise.resolve({ data: null, error: { message: 'Supabase offline' } }),
        then: (onfulfilled) => onfulfilled({ data: [], error: { message: 'Supabase offline' } })
      };
      return mockResult;
    };
  }
});
