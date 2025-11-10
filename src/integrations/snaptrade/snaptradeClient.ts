/**
 * SnapTrade API Client
 * Routes all requests through Supabase Edge Function to avoid CORS issues
 */

import { supabase } from '@/integrations/supabase/client';

export interface SnapTradeError {
  status: number;
  message: string;
  code?: string;
  details?: any;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  params?: Record<string, string | number | boolean>;
  userId?: string;
  userSecret?: string;
  skipAuth?: boolean;
}

class SnapTradeClient {
  private cache: Map<string, { data: any; timestamp: number }>;
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor() {
    this.cache = new Map();
    console.log('[SnapTrade Client] Initialized - using Supabase Edge Function proxy');
  }

  /**
   * Build endpoint with query parameters
   */
  private buildEndpoint(endpoint: string, params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return endpoint;
    }

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    
    const queryString = queryParams.toString();
    return queryString ? `${endpoint}?${queryString}` : endpoint;
  }

  /**
   * Get cached data if available and not expired
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Store data in cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Make request through Supabase Edge Function
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      params,
      userId,
      userSecret,
      skipAuth = false,
    } = options;

    // Check cache for GET requests
    if (method === 'GET') {
      const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('[SnapTrade Client] Cache hit:', cacheKey);
        return cached;
      }
    }

    const fullEndpoint = this.buildEndpoint(endpoint, params);

    console.log('[SnapTrade Client] Request:', {
      endpoint: fullEndpoint,
      method,
      hasBody: !!body,
      hasUserId: !!userId,
      hasUserSecret: !!userSecret,
      skipAuth,
    });

    try {
      const { data, error } = await supabase.functions.invoke('snaptrade-proxy', {
        body: {
          endpoint: fullEndpoint,
          method,
          body,
          userId: skipAuth ? undefined : userId,
          userSecret: skipAuth ? undefined : userSecret,
        },
      });

      if (error) {
        console.error('[SnapTrade Client] Edge function error:', error);
        throw {
          status: 500,
          message: error.message || 'Edge function invocation failed',
          details: error,
        } as SnapTradeError;
      }

      if (data?.error) {
        console.error('[SnapTrade Client] API error:', data.error);
        throw {
          status: data.status || 500,
          message: data.error.message || data.error.detail || 'API request failed',
          details: data.error,
        } as SnapTradeError;
      }

      console.log('[SnapTrade Client] Success:', data);

      // Cache successful GET requests
      if (method === 'GET') {
        const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
        this.setCache(cacheKey, data);
      }

      return data;
    } catch (error: any) {
      // If it's already a SnapTradeError, rethrow it
      if (error.status && error.message) {
        throw error;
      }

      // Otherwise, wrap it
      console.error('[SnapTrade Client] Unexpected error:', error);
      throw {
        status: 500,
        message: error.message || 'An unexpected error occurred',
        details: error,
      } as SnapTradeError;
    }
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('[SnapTrade Client] Cache cleared');
  }

  /**
   * GET request
   */
  public async get<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  public async post<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'POST' });
  }

  /**
   * PUT request
   */
  public async put<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PUT' });
  }

  /**
   * DELETE request
   */
  public async delete<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  public async patch<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PATCH' });
  }
}

// Export singleton instance
export const snaptradeClient = new SnapTradeClient();