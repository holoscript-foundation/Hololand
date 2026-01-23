/**
 * Database Service Stub
 * 
 * This is a placeholder that replaces the @infinitus/shared dependency.
 * In production, implement proper Supabase connection.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DatabaseService {
  supabase: SupabaseClient;
}

let instance: DatabaseService | null = null;

export function getDatabaseService(): DatabaseService {
  if (!instance) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not configured. Using mock client.');
      // Create a mock client for development
      instance = {
        supabase: createMockSupabaseClient(),
      };
    } else {
      instance = {
        supabase: createClient(supabaseUrl, supabaseKey),
      };
    }
  }
  return instance;
}

function createMockSupabaseClient(): SupabaseClient {
  // Return a mock that no-ops all operations
  const mockQuery = {
    insert: () => Promise.resolve({ data: null, error: null }),
    select: () => Promise.resolve({ data: [], error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
    eq: () => mockQuery,
    single: () => Promise.resolve({ data: null, error: null }),
    order: () => mockQuery,
    limit: () => mockQuery,
  };

  return {
    from: () => mockQuery,
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  } as unknown as SupabaseClient;
}

export default getDatabaseService;
