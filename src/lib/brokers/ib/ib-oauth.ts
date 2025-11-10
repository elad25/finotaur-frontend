// lib/brokers/ib/ib-oauth.ts
// Interactive Brokers OAuth 2.0 integration

import { createClient } from '@supabase/supabase-js';

interface IBOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
}

// IB OAuth configuration
const IB_CONFIG: IBOAuthConfig = {
  clientId: process.env.IB_CLIENT_ID!,
  clientSecret: process.env.IB_CLIENT_SECRET!,
  redirectUri: process.env.IB_REDIRECT_URI || 'https://finotaur.com/api/brokers/ib/callback',
  authUrl: 'https://api.ibkr.com/v1/oauth2/authorize',
  tokenUrl: 'https://api.ibkr.com/v1/oauth2/token',
  apiBaseUrl: 'https://api.ibkr.com/v1',
};

// Step 1: Generate authorization URL
export function getIBAuthorizationUrl(userId: string): string {
  const state = encodeURIComponent(JSON.stringify({
    userId,
    timestamp: Date.now(),
  }));
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: IB_CONFIG.clientId,
    redirect_uri: IB_CONFIG.redirectUri,
    scope: 'read_trades read_positions read_account',
    state,
  });
  
  return `${IB_CONFIG.authUrl}?${params.toString()}`;
}

// Step 2: Exchange authorization code for access token
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(IB_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: IB_CONFIG.clientId,
      client_secret: IB_CONFIG.clientSecret,
      redirect_uri: IB_CONFIG.redirectUri,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }
  
  return response.json();
}

// Step 3: Refresh access token
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(IB_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: IB_CONFIG.clientId,
      client_secret: IB_CONFIG.clientSecret,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }
  
  return response.json();
}

// Step 4: Save encrypted tokens to database
export async function saveTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Encrypt tokens before storing (use your encryption method)
  const encryptedAccessToken = await encryptToken(accessToken);
  const encryptedRefreshToken = await encryptToken(refreshToken);
  
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  
  const { error } = await supabase
    .from('broker_connections')
    .upsert({
      user_id: userId,
      broker: 'interactive_brokers',
      status: 'connected',
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: expiresAt,
      connected_at: new Date().toISOString(),
    });
  
  if (error) {
    throw new Error(`Failed to save tokens: ${error.message}`);
  }
}

// Step 5: Get valid access token (refresh if needed)
export async function getValidAccessToken(userId: string): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data: connection, error } = await supabase
    .from('broker_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('broker', 'interactive_brokers')
    .single();
  
  if (error || !connection) {
    throw new Error('No IB connection found');
  }
  
  // Check if token is expired
  const now = new Date();
  const expiresAt = new Date(connection.expires_at);
  
  if (now >= expiresAt) {
    // Token expired, refresh it
    const decryptedRefreshToken = await decryptToken(connection.refresh_token);
    const tokens = await refreshAccessToken(decryptedRefreshToken);
    
    // Save new tokens
    await saveTokens(
      userId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in
    );
    
    return tokens.access_token;
  }
  
  // Token still valid
  return await decryptToken(connection.access_token);
}

// Encryption helpers (implement with your preferred method)
async function encryptToken(token: string): Promise<string> {
  // TODO: Implement encryption using Web Crypto API or similar
  // For now, return base64 (NOT SECURE - use proper encryption in production)
  return Buffer.from(token).toString('base64');
}

async function decryptToken(encryptedToken: string): Promise<string> {
  // TODO: Implement decryption
  return Buffer.from(encryptedToken, 'base64').toString('utf-8');
}

// Example API route handler for callback
/*
// app/api/brokers/ib/callback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, saveTokens } from '@/lib/brokers/ib/ib-oauth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code || !state) {
    return NextResponse.redirect('/app/journal/settings?error=auth_failed');
  }
  
  try {
    const { userId } = JSON.parse(decodeURIComponent(state));
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForToken(code);
    
    // Save tokens
    await saveTokens(
      userId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in
    );
    
    // Redirect to success page
    return NextResponse.redirect('/app/journal/settings?ib_connected=true');
    
  } catch (error: any) {
    console.error('IB OAuth error:', error);
    return NextResponse.redirect('/app/journal/settings?error=auth_failed');
  }
}
*/