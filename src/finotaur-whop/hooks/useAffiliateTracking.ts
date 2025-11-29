// hooks/useAffiliateTracking.ts

import { useState, useEffect, useCallback } from 'react';
import { AffiliateData } from '@/types/whop';
import { AFFILIATE_CONFIG } from '@/lib/whop-config';
import { supabase } from '@/lib/supabase';

interface UseAffiliateTrackingReturn extends AffiliateData {
  trackClick: () => Promise<void>;
  clearAffiliateData: () => void;
  isLoading: boolean;
}

export function useAffiliateTracking(): UseAffiliateTrackingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [affiliateData, setAffiliateData] = useState<AffiliateData>({
    affiliateCode: null,
    clickId: null,
    hasAffiliate: false,
    expiresAt: null,
  });

  const { storageKeys, cookieDurationDays, urlParams } = AFFILIATE_CONFIG;

  const loadStoredData = useCallback(() => {
    if (typeof window === 'undefined') return;

    const code = localStorage.getItem(storageKeys.code);
    const clickId = localStorage.getItem(storageKeys.clickId);
    const expires = localStorage.getItem(storageKeys.expires);
    const expiresAt = expires ? Number(expires) : null;

    if (code && expiresAt && Date.now() < expiresAt) {
      setAffiliateData({
        affiliateCode: code,
        clickId,
        hasAffiliate: true,
        expiresAt,
      });
    } else if (code) {
      clearAffiliateData();
    }
  }, [storageKeys]);

  const clearAffiliateData = useCallback(() => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(storageKeys.code);
    localStorage.removeItem(storageKeys.clickId);
    localStorage.removeItem(storageKeys.expires);
    sessionStorage.removeItem('affiliate_tracked');

    setAffiliateData({
      affiliateCode: null,
      clickId: null,
      hasAffiliate: false,
      expiresAt: null,
    });
  }, [storageKeys]);

  const trackClick = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('affiliate_tracked')) return;

    const searchParams = new URLSearchParams(window.location.search);
    let affiliateCode: string | null = null;

    for (const param of urlParams) {
      const value = searchParams.get(param);
      if (value) {
        affiliateCode = value.toUpperCase();
        break;
      }
    }

    if (!affiliateCode) return;

    setIsLoading(true);

    try {
      const { data: clickId, error } = await supabase.rpc('record_affiliate_click', {
        p_affiliate_code: affiliateCode,
        p_ip_address: null,
        p_user_agent: navigator.userAgent,
        p_referrer_url: document.referrer || null,
        p_landing_page: window.location.href,
        p_utm_source: searchParams.get('utm_source'),
        p_utm_medium: searchParams.get('utm_medium'),
        p_utm_campaign: searchParams.get('utm_campaign'),
        p_utm_content: searchParams.get('utm_content'),
      });

      if (error) {
        console.error('[Affiliate] Failed to track click:', error);
        return;
      }

      const expiresAt = Date.now() + (cookieDurationDays * 24 * 60 * 60 * 1000);

      localStorage.setItem(storageKeys.code, affiliateCode);
      if (clickId) {
        localStorage.setItem(storageKeys.clickId, clickId);
      }
      localStorage.setItem(storageKeys.expires, String(expiresAt));

      sessionStorage.setItem('affiliate_tracked', 'true');

      setAffiliateData({
        affiliateCode,
        clickId,
        hasAffiliate: true,
        expiresAt,
      });

      console.log('[Affiliate] Click tracked:', affiliateCode, clickId);

    } catch (err) {
      console.error('[Affiliate] Error tracking click:', err);
    } finally {
      setIsLoading(false);
    }
  }, [urlParams, cookieDurationDays, storageKeys]);

  useEffect(() => {
    loadStoredData();
  }, [loadStoredData]);

  useEffect(() => {
    trackClick();
  }, [trackClick]);

  return {
    ...affiliateData,
    trackClick,
    clearAffiliateData,
    isLoading,
  };
}

export default useAffiliateTracking;