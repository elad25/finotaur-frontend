import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, saveTokens } from '@/lib/brokers/ib/ib-oauth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code || !state) {
    return NextResponse.redirect(new URL('/app/journal/settings?error=auth_failed', request.url));
  }
  
  try {
    const { userId } = JSON.parse(decodeURIComponent(state));
    const tokens = await exchangeCodeForToken(code);
    await saveTokens(userId, tokens.access_token, tokens.refresh_token, tokens.expires_in);
    return NextResponse.redirect(new URL('/app/journal/settings?ib_connected=true', request.url));
  } catch (error: any) {
    return NextResponse.redirect(new URL('/app/journal/settings?error=auth_failed', request.url));
  }
}