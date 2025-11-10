// lib/supabase/service-client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serviceClient: SupabaseClient | null = null;

/**
 * Get Supabase service client with connection reuse
 * Uses singleton pattern to prevent connection pool exhaustion
 * 
 * IMPORTANT: This bypasses RLS - only use in secure server-side contexts
 */
export function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error(
        'Missing Supabase environment variables. ' +
        'Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      );
    }

    serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-application-name': 'finotaur-webhooks',
        },
      },
      // Connection pool settings for high concurrency
      // These help under load but may need tuning based on your Supabase plan
    });

    // Log initialization in development
    if (process.env.NODE_ENV === 'development') {
      console.log('✓ Supabase service client initialized');
    }
  }

  return serviceClient;
}

/**
 * Reset the service client (useful for testing or forced reconnection)
 */
export function resetServiceClient(): void {
  serviceClient = null;
}

/**
 * Health check - verify service client can connect
 * Use this in monitoring/health check endpoints
 */
export async function checkServiceClientHealth(): Promise<boolean> {
  try {
    const client = getServiceClient();
    const { error } = await client.from('trades').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Service client health check failed:', error);
    return false;
  }
}