// =====================================================
// FINOTAUR AFFILIATE TRACKER - v2.2 FIXED
// =====================================================
// Place in: src/features/affiliate/components/AffiliateTracker.tsx
// 
// FIXES v2.2:
// - ✅ Syncs with useWhopCheckout localStorage keys
// - ✅ Stores in BOTH formats for compatibility
// - ✅ Better debugging
// =====================================================

import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

// ============================================
// CONSTANTS - MUST MATCH useWhopCheckout!
// ============================================

const STORAGE_KEYS = {
  code: 'finotaur_affiliate_code',           // Primary key for useWhopCheckout
  clickId: 'finotaur_affiliate_click_id',
  expires: 'finotaur_affiliate_expires',
  fullData: 'finotaur_affiliate',            // Full data object
};

const AFFILIATE_COOKIE_NAME = 'finotaur_affiliate_code';
const AFFILIATE_COOKIE_DAYS = 30;

// ============================================
// COOKIE HELPERS
// ============================================

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  // Set cookie with proper attributes
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;domain=.finotaur.com;SameSite=Lax;Secure`;
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');
  
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  return null;
}

// ============================================
// 🔥 FIXED: Store affiliate data in ALL required formats
// ============================================

interface AffiliateData {
  code: string;
  clickId?: string;
  timestamp: number;
  expiresAt: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
}

/**
 * Store affiliate data in ALL required locations
 * This ensures compatibility with useWhopCheckout
 */
function storeAffiliateData(data: AffiliateData): void {
  const upperCode = data.code.toUpperCase();
  
  try {
    // 🔥 KEY FIX: Store in individual keys (for useWhopCheckout)
    localStorage.setItem(STORAGE_KEYS.code, upperCode);
    localStorage.setItem(STORAGE_KEYS.expires, String(data.expiresAt));
    
    if (data.clickId) {
      localStorage.setItem(STORAGE_KEYS.clickId, data.clickId);
    }
    
    // Also store full data object (for other uses)
    localStorage.setItem(STORAGE_KEYS.fullData, JSON.stringify({
      ...data,
      code: upperCode,
    }));
    
    console.log('✅ Affiliate data stored:', {
      code: upperCode,
      expiresAt: new Date(data.expiresAt).toISOString(),
      keys: Object.keys(STORAGE_KEYS),
    });
    
    // Verify storage worked
    const verify = localStorage.getItem(STORAGE_KEYS.code);
    console.log('🔍 Verification - stored code:', verify);
    
  } catch (e) {
    console.error('❌ Failed to store affiliate data:', e);
  }
}

/**
 * Get stored affiliate data (checking all possible locations)
 */
export function getStoredAffiliateData(): { code: string; clickId?: string } | null {
  try {
    // Check expiration first
    const expiresStr = localStorage.getItem(STORAGE_KEYS.expires);
    if (expiresStr && Number(expiresStr) < Date.now()) {
      console.log('⏰ Affiliate data expired, clearing...');
      clearAffiliateData();
      return null;
    }
    
    // Try primary key
    let code = localStorage.getItem(STORAGE_KEYS.code);
    let clickId = localStorage.getItem(STORAGE_KEYS.clickId) || undefined;
    
    // Fallback to full data object
    if (!code) {
      const fullData = localStorage.getItem(STORAGE_KEYS.fullData);
      if (fullData) {
        const parsed = JSON.parse(fullData);
        code = parsed.code;
        clickId = parsed.clickId;
      }
    }
    
    // Fallback to cookie
    if (!code) {
      code = getCookie(AFFILIATE_COOKIE_NAME);
    }
    
    if (code) {
      return { code: code.toUpperCase(), clickId };
    }
    
    return null;
  } catch (e) {
    console.error('Error reading affiliate data:', e);
    return null;
  }
}

/**
 * Clear all affiliate data
 */
export function clearStoredAffiliateData(): void {
  localStorage.removeItem(STORAGE_KEYS.code);
  localStorage.removeItem(STORAGE_KEYS.clickId);
  localStorage.removeItem(STORAGE_KEYS.expires);
  localStorage.removeItem(STORAGE_KEYS.fullData);
  
  // Clear cookie too
  document.cookie = `${AFFILIATE_COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  
  console.log('🗑️ Affiliate data cleared');
}

// Alias for backward compatibility
export const clearAffiliateData = clearStoredAffiliateData;

/**
 * Get the stored affiliate code only
 */
export function getStoredAffiliateCode(): string | null {
  const data = getStoredAffiliateData();
  return data?.code || null;
}

// ============================================
// TRACKING FUNCTIONS
// ============================================

/**
 * Track an affiliate click
 */
export async function trackAffiliateClick(
  code: string,
  metadata?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    landingPage?: string;
  }
): Promise<boolean> {
  const upperCode = code.toUpperCase();
  
  console.log('🎯 Tracking affiliate click:', upperCode);
  
  try {
    // 1. Calculate expiration
    const expiresAt = Date.now() + (AFFILIATE_COOKIE_DAYS * 24 * 60 * 60 * 1000);
    
    // 2. Store in cookie
    setCookie(AFFILIATE_COOKIE_NAME, upperCode, AFFILIATE_COOKIE_DAYS);
    
    // 3. Store in localStorage (ALL keys)
    storeAffiliateData({
      code: upperCode,
      timestamp: Date.now(),
      expiresAt,
      utmSource: metadata?.utmSource,
      utmMedium: metadata?.utmMedium,
      utmCampaign: metadata?.utmCampaign,
      utmContent: metadata?.utmContent,
    });
    
    // 4. Record click in database
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id')
      .or(`affiliate_code.ilike.${upperCode},coupon_code.ilike.${upperCode}`)
      .eq('status', 'active')
      .maybeSingle();
    
    if (affiliate) {
      // Increment click count
      await supabase.rpc('increment_affiliate_clicks', { 
        p_affiliate_id: affiliate.id 
      });
      
      // Log the click with metadata
      await supabase.from('affiliate_clicks').insert({
        affiliate_id: affiliate.id,
        user_agent: navigator.userAgent.substring(0, 255),
        referrer_url: document.referrer || null,
        landing_page: metadata?.landingPage || window.location.pathname,
        utm_source: metadata?.utmSource,
        utm_medium: metadata?.utmMedium,
        utm_campaign: metadata?.utmCampaign,
        utm_content: metadata?.utmContent,
      });
      
      console.log(`✅ Affiliate click tracked in DB: ${upperCode}`);
      return true;
    } else {
      console.warn(`⚠️ Affiliate code not found in DB: ${upperCode} (still stored locally)`);
      return true; // Still stored locally
    }
  } catch (error) {
    console.error('❌ Failed to track affiliate click:', error);
    return false;
  }
}

/**
 * Track a referral signup
 */
export async function trackReferralSignup(userId: string, userEmail: string): Promise<boolean> {
  try {
    const affiliateData = getStoredAffiliateData();
    if (!affiliateData?.code) {
      console.log('ℹ️ No affiliate code found for signup');
      return false;
    }
    
    const affiliateCode = affiliateData.code;
    console.log('📝 Tracking referral signup:', { affiliateCode, userId });
    
    // Get affiliate
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, user_id')
      .or(`affiliate_code.ilike.${affiliateCode},coupon_code.ilike.${affiliateCode}`)
      .eq('status', 'active')
      .maybeSingle();
    
    if (!affiliate) {
      console.warn('⚠️ Affiliate not found for code:', affiliateCode);
      return false;
    }
    
    // Don't allow self-referral
    if (affiliate.user_id === userId) {
      console.warn('⚠️ Self-referral attempt blocked');
      return false;
    }
    
    // Check if referral already exists
    const { data: existingReferral } = await supabase
      .from('affiliate_referrals')
      .select('id')
      .eq('referred_user_id', userId)
      .maybeSingle();
    
    if (existingReferral) {
      console.log('ℹ️ Referral already exists for user');
      return false;
    }
    
    // Create referral record
    const { error } = await supabase
      .from('affiliate_referrals')
      .insert({
        affiliate_id: affiliate.id,
        referred_user_id: userId,
        referred_user_email: userEmail,
        status: 'pending',
        signup_date: new Date().toISOString(),
      });
    
    if (error) throw error;
    
    // Update affiliate stats
    await supabase.rpc('increment_affiliate_signups', {
      p_affiliate_id: affiliate.id
    });
    
    console.log(`✅ Referral signup tracked: ${affiliateCode} -> ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to track referral signup:', error);
    return false;
  }
}

// ============================================
// AFFILIATE TRACKER COMPONENT
// ============================================

export function AffiliateTracker() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Extract affiliate code from various sources
    let affiliateCode: string | null = null;
    
    // 1. Check query params: ?ref=CODE, ?affiliate=CODE, ?coupon=CODE
    affiliateCode = searchParams.get('ref') 
      || searchParams.get('affiliate') 
      || searchParams.get('coupon')
      || searchParams.get('aff')
      || searchParams.get('a');
    
    // 2. Check path: /ref/CODE
    if (!affiliateCode) {
      const pathMatch = location.pathname.match(/\/ref\/([A-Za-z0-9_-]+)/i);
      if (pathMatch) {
        affiliateCode = pathMatch[1];
      }
    }
    
    if (affiliateCode) {
      console.log('🎯 Affiliate code detected:', affiliateCode);
      
      // Extract UTM parameters
      const utmParams = {
        utmSource: searchParams.get('utm_source') || undefined,
        utmMedium: searchParams.get('utm_medium') || undefined,
        utmCampaign: searchParams.get('utm_campaign') || undefined,
        utmContent: searchParams.get('utm_content') || undefined,
        landingPage: location.pathname,
      };
      
      // Track the click
      trackAffiliateClick(affiliateCode, utmParams);
    }
  }, [location.pathname, searchParams]);
  
  return null;
}

// ============================================
// AFFILIATE REF ROUTE COMPONENT
// ============================================

export function AffiliateRefRoute() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!code) {
      window.location.href = 'https://www.finotaur.com';
      return;
    }
    
    const processReferral = async () => {
      const utmParams = {
        utmSource: searchParams.get('utm_source') || 'referral',
        utmMedium: searchParams.get('utm_medium') || 'affiliate',
        utmCampaign: searchParams.get('utm_campaign') || undefined,
        utmContent: searchParams.get('utm_content') || undefined,
        landingPage: '/ref/' + code,
      };
      
      await trackAffiliateClick(code, utmParams);
      
      // Redirect
      const baseUrl = window.location.hostname === 'localhost' 
        ? '/' 
        : 'https://www.finotaur.com';
      
      setTimeout(() => {
        if (window.location.hostname === 'localhost') {
          navigate('/');
        } else {
          window.location.href = baseUrl;
        }
      }, 100);
    };
    
    processReferral();
  }, [code, searchParams, navigate]);
  
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#C9A646] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#C9A646] text-lg font-medium">Activating your referral...</p>
        <p className="text-zinc-500 text-sm mt-2">Redirecting to Finotaur...</p>
      </div>
    </div>
  );
}

export default AffiliateTracker;