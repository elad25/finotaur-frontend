// supabase/functions/cleanup-inactive-snaptrade-users/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SNAPTRADE_CLIENT_ID = Deno.env.get('SNAPTRADE_CLIENT_ID')!;
const SNAPTRADE_CONSUMER_KEY = Deno.env.get('SNAPTRADE_CONSUMER_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLEANUP_SECRET = Deno.env.get('CLEANUP_SECRET') || 'CHANGE_THIS_SECRET';

const INACTIVITY_DAYS = 7;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🧹 ========== CLEANUP JOB STARTED ==========');
  console.log('⏰ Timestamp:', new Date().toISOString());

  try {
    // Verify secret (only you can trigger this)
    const requestBody = await req.json();
    const { secret } = requestBody;
    
    if (secret !== CLEANUP_SECRET) {
      console.error('❌ Unauthorized attempt - invalid secret');
      throw new Error('Unauthorized');
    }

    console.log('✅ Authorization verified');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Use the helper function to get inactive users
    const { data: inactiveUsers, error: queryError } = await supabase
      .rpc('get_inactive_snaptrade_users', { days_threshold: INACTIVITY_DAYS });

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`);
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      console.log('✅ No inactive users found - all users are active or already disconnected');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No inactive users to cleanup',
          inactive_count: 0,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Found ${inactiveUsers.length} inactive users (inactive > ${INACTIVITY_DAYS} days)`);
    
    const results = {
      total_processed: inactiveUsers.length,
      successfully_disconnected: 0,
      failed: 0,
      disconnected_details: [] as any[],
      errors: [] as any[],
    };

    // Process each inactive user
    for (const user of inactiveUsers) {
      console.log(`\n📋 Processing user: ${user.user_id}`);
      console.log(`   Days inactive: ${user.days_inactive}`);
      console.log(`   Connection ID: ${user.brokerage_connection_id}`);

      try {
        const credentials = {
          userId: user.snaptrade_user_id,
          userSecret: user.snaptrade_user_secret,
        };

        // Delete the brokerage connection
        if (user.brokerage_connection_id) {
          await deleteSnapTradeConnection(credentials, user.brokerage_connection_id);
          console.log(`   ✅ Deleted SnapTrade connection`);
        }

        // Update our database
        const { error: updateError } = await supabase
          .from('snaptrade_activity')
          .update({
            connection_status: 'disconnected',
            disconnected_at: new Date().toISOString(),
            brokerage_connection_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.user_id);

        if (updateError) {
          throw updateError;
        }

        results.successfully_disconnected++;
        results.disconnected_details.push({
          user_id: user.user_id,
          days_inactive: user.days_inactive,
          connection_id: user.brokerage_connection_id,
          disconnected_at: new Date().toISOString(),
        });

        console.log(`   ✅ Updated database - user disconnected`);

      } catch (error: any) {
        console.error(`   ❌ Failed:`, error.message);
        results.failed++;
        results.errors.push({
          user_id: user.user_id,
          error: error.message,
          connection_id: user.brokerage_connection_id,
        });
      }
    }

    console.log('\n📊 ========== CLEANUP SUMMARY ==========');
    console.log(`Total processed: ${results.total_processed}`);
    console.log(`Successfully disconnected: ${results.successfully_disconnected}`);
    console.log(`Failed: ${results.failed}`);
    console.log('=======================================\n');

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        inactivity_threshold_days: INACTIVITY_DAYS,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('💥 FATAL ERROR:', error.message);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Delete a SnapTrade brokerage connection
 */
async function deleteSnapTradeConnection(
  credentials: { userId: string; userSecret: string },
  connectionId: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const endpoint = `/connections/${connectionId}`;
  
  const url = new URL(`https://api.snaptrade.com/api/v1${endpoint}`);
  url.searchParams.set('userId', credentials.userId);
  url.searchParams.set('userSecret', credentials.userSecret);
  url.searchParams.set('clientId', SNAPTRADE_CLIENT_ID);
  url.searchParams.set('timestamp', timestamp);

  // Generate HMAC signature
  const content = `${endpoint}${SNAPTRADE_CLIENT_ID}${timestamp}`;
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SNAPTRADE_CONSUMER_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(content));
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Signature': signature,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SnapTrade API error (${response.status}): ${errorText}`);
  }
}