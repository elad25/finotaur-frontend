// =====================================================
// WHOP API CONFIGURATION - v1.0.0
// =====================================================
// 
// 🔥 SINGLE SOURCE OF TRUTH for all Whop API calls
// 
// This file centralizes ALL Whop API endpoints and helper functions.
// When Whop changes their API version, update ONLY this file.
// 
// Usage in other files:
//   import { WhopAPI, cancelMembership, pauseMembership, resumeMembership } from "../_shared/whop-api.ts";
// 
// =====================================================

// ============================================
// CONFIGURATION - Change version here ONLY
// ============================================

const WHOP_API_VERSION = 'v1';
const WHOP_API_BASE_URL = `https://api.whop.com/api/${WHOP_API_VERSION}`;

// Get API key from environment
const getApiKey = (): string => {
  return Deno.env.get("WHOP_API_KEY") || Deno.env.get("WHOP_BEARER_TOKEN") || "";
};

// ============================================
// TYPES
// ============================================

export interface WhopApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface WhopMembership {
  id: string;
  status: 'trialing' | 'active' | 'past_due' | 'completed' | 'canceled' | 'expired' | 'unresolved' | 'drafted' | 'canceling';
  cancel_at_period_end: boolean;
  payment_collection_paused: boolean;
  renewal_period_start?: string;
  renewal_period_end?: string;
  canceled_at?: string;
  user?: {
    id: string;
    email?: string;
    username?: string;
  };
  plan?: {
    id: string;
  };
  product?: {
    id: string;
    title?: string;
  };
}

export interface WhopCheckoutSession {
  id: string;
  purchase_url: string;
}

export type CancellationMode = 'immediate' | 'at_period_end';

// ============================================
// API ENDPOINTS - All URLs defined here
// ============================================

export const WhopAPI = {
  version: WHOP_API_VERSION,
  baseUrl: WHOP_API_BASE_URL,
  
  endpoints: {
    // Memberships
    membership: (membershipId: string) => 
      `${WHOP_API_BASE_URL}/memberships/${membershipId}`,
    
    cancelMembership: (membershipId: string) => 
      `${WHOP_API_BASE_URL}/memberships/${membershipId}/cancel`,
    
    pauseMembership: (membershipId: string) => 
      `${WHOP_API_BASE_URL}/memberships/${membershipId}/pause`,
    
    resumeMembership: (membershipId: string) => 
      `${WHOP_API_BASE_URL}/memberships/${membershipId}/resume`,
    
    uncancelMembership: (membershipId: string) => 
      `${WHOP_API_BASE_URL}/memberships/${membershipId}/uncancel`,
    
    // Checkout - uses v2 (different from memberships which use v1)
    checkoutSessions: () => 
      `https://api.whop.com/api/v2/checkout_sessions`,
    
    // Promo Codes
    promoCodes: () => 
      `${WHOP_API_BASE_URL}/promo_codes`,
  },
} as const;

// ============================================
// HELPER: Standard headers for all requests
// ============================================

function getHeaders(): HeadersInit {
  const apiKey = getApiKey();
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

// ============================================
// HELPER: Log API calls for debugging
// ============================================

function logApiCall(method: string, url: string, body?: unknown): void {
  console.log(`🌐 Whop API ${method}: ${url}`);
  if (body) {
    console.log(`   Body:`, JSON.stringify(body));
  }
}

function logApiResponse(status: number, success: boolean, data?: unknown): void {
  const emoji = success ? '✅' : '❌';
  console.log(`${emoji} Whop API Response: ${status}`);
  if (data && !success) {
    console.log(`   Error:`, data);
  }
}

// ============================================
// MEMBERSHIP FUNCTIONS
// ============================================

/**
 * Cancel a Whop membership
 * @param membershipId - The membership ID (mem_xxx)
 * @param mode - 'immediate' or 'at_period_end' (default: 'at_period_end')
 */
export async function cancelMembership(
  membershipId: string,
  mode: CancellationMode = 'at_period_end'
): Promise<WhopApiResponse<WhopMembership>> {
  const url = WhopAPI.endpoints.cancelMembership(membershipId);
  const body = { cancellation_mode: mode };
  
  logApiCall('POST', url, body);
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('⚠️ WHOP_API_KEY not configured');
      return { success: false, error: 'WHOP_API_KEY not configured' };
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    
    const responseText = await response.text();
    let data: WhopMembership | undefined;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      // Response is not JSON
    }
    
    logApiResponse(response.status, response.ok, data);
    
    if (!response.ok) {
      // Handle specific error cases gracefully
      if (response.status === 404) {
        console.warn(`⚠️ Membership ${membershipId} not found (404) - may have been cancelled directly in Whop`);
        return { success: true, error: 'Membership not found', status: 404 };
      }
      if (response.status === 422) {
        console.warn(`⚠️ Membership ${membershipId} cannot be cancelled (422) - may already be cancelled`);
        return { success: true, error: 'Membership already cancelled', status: 422 };
      }
      return { success: false, error: `API error: ${response.status} - ${responseText}`, status: response.status };
    }
    
    return { success: true, data, status: response.status };
    
  } catch (error) {
    console.error(`❌ cancelMembership error:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Pause a Whop membership (stops payment collection)
 * @param membershipId - The membership ID (mem_xxx)
 * @param voidPayments - Whether to void past_due payments (default: true)
 */
export async function pauseMembership(
  membershipId: string,
  voidPayments: boolean = true
): Promise<WhopApiResponse<WhopMembership>> {
  const url = WhopAPI.endpoints.pauseMembership(membershipId);
  const body = { void_payments: voidPayments };
  
  logApiCall('POST', url, body);
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('⚠️ WHOP_API_KEY not configured');
      return { success: false, error: 'WHOP_API_KEY not configured' };
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    
    const responseText = await response.text();
    let data: WhopMembership | undefined;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      // Response is not JSON
    }
    
    logApiResponse(response.status, response.ok, data);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`⚠️ Membership ${membershipId} not found (404)`);
        return { success: true, error: 'Membership not found', status: 404 };
      }
      return { success: false, error: `API error: ${response.status} - ${responseText}`, status: response.status };
    }
    
    return { success: true, data, status: response.status };
    
  } catch (error) {
    console.error(`❌ pauseMembership error:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Resume a paused Whop membership
 * @param membershipId - The membership ID (mem_xxx)
 */
export async function resumeMembership(
  membershipId: string
): Promise<WhopApiResponse<WhopMembership>> {
  const url = WhopAPI.endpoints.resumeMembership(membershipId);
  
  logApiCall('POST', url);
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('⚠️ WHOP_API_KEY not configured');
      return { success: false, error: 'WHOP_API_KEY not configured' };
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
    });
    
    const responseText = await response.text();
    let data: WhopMembership | undefined;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      // Response is not JSON
    }
    
    logApiResponse(response.status, response.ok, data);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`⚠️ Membership ${membershipId} not found (404)`);
        return { success: true, error: 'Membership not found', status: 404 };
      }
      if (response.status === 422) {
        console.warn(`⚠️ Membership ${membershipId} cannot be resumed (422) - may not be paused`);
        return { success: false, error: 'Membership not paused', status: 422 };
      }
      return { success: false, error: `API error: ${response.status} - ${responseText}`, status: response.status };
    }
    
    return { success: true, data, status: response.status };
    
  } catch (error) {
    console.error(`❌ resumeMembership error:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Uncancel a membership that was scheduled for cancellation
 * @param membershipId - The membership ID (mem_xxx)
 */
export async function uncancelMembership(
  membershipId: string
): Promise<WhopApiResponse<WhopMembership>> {
  const url = WhopAPI.endpoints.uncancelMembership(membershipId);
  
  logApiCall('POST', url);
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('⚠️ WHOP_API_KEY not configured');
      return { success: false, error: 'WHOP_API_KEY not configured' };
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
    });
    
    const responseText = await response.text();
    let data: WhopMembership | undefined;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      // Response is not JSON
    }
    
    logApiResponse(response.status, response.ok, data);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, error: 'Membership not found', status: 404 };
      }
      if (response.status === 422) {
        console.warn(`⚠️ Membership ${membershipId} cannot be uncancelled (422) - may not be scheduled for cancellation`);
        return { success: false, error: 'Membership not scheduled for cancellation', status: 422 };
      }
      return { success: false, error: `API error: ${response.status} - ${responseText}`, status: response.status };
    }
    
    return { success: true, data, status: response.status };
    
  } catch (error) {
    console.error(`❌ uncancelMembership error:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get membership details
 * @param membershipId - The membership ID (mem_xxx)
 */
export async function getMembership(
  membershipId: string
): Promise<WhopApiResponse<WhopMembership>> {
  const url = WhopAPI.endpoints.membership(membershipId);
  
  logApiCall('GET', url);
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('⚠️ WHOP_API_KEY not configured');
      return { success: false, error: 'WHOP_API_KEY not configured' };
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    const responseText = await response.text();
    let data: WhopMembership | undefined;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      // Response is not JSON
    }
    
    logApiResponse(response.status, response.ok, data);
    
    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}`, status: response.status };
    }
    
    return { success: true, data, status: response.status };
    
  } catch (error) {
    console.error(`❌ getMembership error:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// CHECKOUT FUNCTIONS
// ============================================

export interface CreateCheckoutOptions {
  planId: string;
  userId?: string;
  userEmail?: string;
  redirectUrl?: string;
  metadata?: Record<string, string>;
}

/**
 * Create a Whop checkout session
 */
export async function createCheckoutSession(
  options: CreateCheckoutOptions
): Promise<WhopApiResponse<WhopCheckoutSession>> {
  const url = WhopAPI.endpoints.checkoutSessions();
  const body = {
    plan_id: options.planId,
    redirect_url: options.redirectUrl,
    metadata: {
      ...options.metadata,
      finotaur_user_id: options.userId,
      finotaur_email: options.userEmail,
    },
  };
  
  logApiCall('POST', url, body);
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('⚠️ WHOP_API_KEY not configured');
      return { success: false, error: 'WHOP_API_KEY not configured' };
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    
    const responseText = await response.text();
    let data: WhopCheckoutSession | undefined;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      // Response is not JSON
    }
    
    logApiResponse(response.status, response.ok, data);
    
    if (!response.ok) {
      return { success: false, error: `API error: ${response.status} - ${responseText}`, status: response.status };
    }
    
    // Add email prefill to checkout URL
    if (data?.purchase_url && options.userEmail) {
      const urlObj = new URL(data.purchase_url);
      urlObj.searchParams.set('email', options.userEmail);
      data.purchase_url = urlObj.toString();
    }
    
    return { success: true, data, status: response.status };
    
  } catch (error) {
    console.error(`❌ createCheckoutSession error:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// UTILITY EXPORTS
// ============================================

export {
  WHOP_API_VERSION,
  WHOP_API_BASE_URL,
  getApiKey,
};