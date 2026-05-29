/**
 * Client for the seo-analytics Supabase Edge Function.
 * Invokes the function and returns a typed AnalyticsResponse.
 */

import { supabase } from '@/lib/supabase';
import type { AnalyticsResponse } from './analyticsTypes';

export async function fetchSeoAnalytics(): Promise<AnalyticsResponse> {
  const { data, error } = await supabase.functions.invoke('seo-analytics');
  if (error) throw new Error(`Failed to fetch SEO analytics: ${error.message}`);
  return data as AnalyticsResponse;
}
