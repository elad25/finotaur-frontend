// =====================================================
// FINOTAUR NEWSLETTER SIGNUP - EDGE FUNCTION
// =====================================================
// Place in: supabase/functions/newsletter-signup/index.ts
//
// This function handles newsletter signups from the public
// landing page. It creates new users or updates existing ones,
// then redirects to Whop checkout.
//
// 🔥 FEATURES:
// - Creates new user with FREE account if doesn't exist
// - Updates newsletter_enabled for existing users
// - Returns Whop checkout URL with user metadata
// - No password required (user can reset later)
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================
// CORS HEADERS
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================
// WHOP CONFIGURATION
// ============================================

const WHOP_NEWSLETTER_PLAN_ID = 'plan_LCBG5yJpoNtW3';
const WHOP_CHECKOUT_BASE_URL = `https://whop.com/checkout/${WHOP_NEWSLETTER_PLAN_ID}`;
const REDIRECT_URL = 'https://www.finotaur.com/app/all-markets/warzone';

// ============================================
// TYPES
// ============================================

interface SignupRequest {
  email: string;
  firstName: string;
  lastName?: string;
  source?: string; // e.g., 'instagram', 'landing_page'
}

interface SignupResponse {
  success: boolean;
  message: string;
  checkoutUrl?: string;
  isNewUser?: boolean;
  error?: string;
}

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse request body
    const body: SignupRequest = await req.json();
    const { email, firstName, lastName, source } = body;

    // Validate required fields
    if (!email || !firstName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email and first name are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email format' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role (admin access)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id, email, newsletter_enabled, account_type')
      .eq('email', email.toLowerCase().trim())
      .single();

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // ============================================
      // EXISTING USER - Check account type
      // ============================================
      console.log('📧 Existing user found:', existingUser.id, 'Type:', existingUser.account_type);
      
      userId = existingUser.id;

      // 🔒 BLOCK PREMIUM USERS - Newsletter is included in Premium
      if (existingUser.account_type === 'PREMIUM') {
        console.log('⛔ Premium user tried to subscribe to newsletter');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'PREMIUM_USER',
            message: 'You already have Premium access! War Zone Intelligence is included in your subscription. Check your email for the daily reports.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 🔒 CHECK IF ALREADY SUBSCRIBED TO NEWSLETTER
      if (existingUser.newsletter_enabled) {
        console.log('ℹ️ User already has newsletter enabled');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'ALREADY_SUBSCRIBED',
            message: 'You\'re already subscribed to War Zone Intelligence! Check your email for the daily reports.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update newsletter_enabled for FREE/BASIC users
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          newsletter_signup_source: source || 'landing_page',
          newsletter_signed_up_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
        throw new Error('Failed to update profile');
      }
      console.log('✅ Ready for newsletter checkout - existing user');

    } else {
      // ============================================
      // NEW USER - Create Auth user + Profile
      // ============================================
      console.log('🆕 Creating new user for:', email);
      isNewUser = true;

      // Generate a random password (user will reset via email if needed)
      const tempPassword = crypto.randomUUID() + crypto.randomUUID();

      // Create Auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name: firstName.trim(),
          last_name: lastName?.trim() || '',
          signup_source: 'newsletter_landing',
        },
      });

      if (authError) {
        console.error('❌ Error creating auth user:', authError);
        
        // Check if user exists in auth but not in profiles
        if (authError.message.includes('already been registered')) {
          // Try to get user from auth
          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingAuthUser = authUsers?.users.find(
            u => u.email?.toLowerCase() === email.toLowerCase().trim()
          );
          
          if (existingAuthUser) {
            userId = existingAuthUser.id;
            console.log('📧 Found existing auth user:', userId);
          } else {
            throw new Error('User already exists but could not be found');
          }
        } else {
          throw new Error(authError.message);
        }
      } else {
        userId = authData.user.id;
      }

      // Create or update profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          email: email.toLowerCase().trim(),
          first_name: firstName.trim(),
          last_name: lastName?.trim() || '',
          account_type: 'FREE',
          newsletter_enabled: true,
          newsletter_signup_source: source || 'landing_page',
          newsletter_signed_up_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        throw new Error('Failed to create profile');
      }

      console.log('✅ New user created successfully:', userId);
    }

    // ============================================
    // BUILD WHOP CHECKOUT URL
    // ============================================
    
    const params = new URLSearchParams();
    params.set('email', email.toLowerCase().trim());
    params.set('metadata[finotaur_user_id]', userId);
    params.set('metadata[source]', source || 'landing_page');
    params.set('redirect_url', `${REDIRECT_URL}?payment=success`);

    const checkoutUrl = `${WHOP_CHECKOUT_BASE_URL}?${params.toString()}`;

    console.log('🔗 Checkout URL generated for user:', userId);

    // ============================================
    // RETURN SUCCESS RESPONSE
    // ============================================
    
    const response: SignupResponse = {
      success: true,
      message: isNewUser 
        ? 'Account created successfully! Redirecting to checkout...'
        : 'Welcome back! Redirecting to checkout...',
      checkoutUrl,
      isNewUser,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Newsletter signup error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});