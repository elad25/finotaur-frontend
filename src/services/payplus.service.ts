// ===============================================
// FINOTAUR - PAYPLUS SERVICE - PRODUCTION READY
// ✅ Fixed TypeScript export conflicts
// ===============================================

import type {
  PayPlusCreatePaymentRequest,
  PaymentPlan,
  PricingPlan
} from '@/types/payment.types';
import { getPlanDetails } from '@/types/payment.types';

// ================================================
// CONFIGURATION
// ================================================

const CONFIG = {
  TIMEOUT: 30000,           // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,        // 1 second
  RETRY_BACKOFF: 2,         // Exponential backoff multiplier
} as const;

// ================================================
// ERROR CLASSES - ✅ No duplicate exports
// ================================================

export class PayPlusError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'PayPlusError';
  }
}

export class PayPlusNetworkError extends PayPlusError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'PayPlusNetworkError';
  }
}

export class PayPlusTimeoutError extends PayPlusError {
  constructor() {
    super('Payment request timed out', 'TIMEOUT');
    this.name = 'PayPlusTimeoutError';
  }
}

// ================================================
// PAYPLUS SERVICE - SINGLETON
// ================================================

class PayPlusService {
  private static instance: PayPlusService | null = null;
  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private initialized: boolean = false;

  private constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      console.error('❌ PayPlus configuration missing!');
    } else {
      this.initialized = true;
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PayPlusService {
    if (!PayPlusService.instance) {
      PayPlusService.instance = new PayPlusService();
    }
    return PayPlusService.instance;
  }

  /**
   * Check if service is ready
   */
  public isReady(): boolean {
    return this.initialized;
  }

  // ================================================
  // MAIN API METHODS
  // ================================================

  /**
   * Create payment page with retry logic
   */
  async createPaymentPage(
    userId: string,
    plan: PaymentPlan,
    userEmail: string,
    userName: string,
    phoneNumber?: string
  ): Promise<{ paymentUrl: string; transactionUid: string }> {
    if (!this.initialized) {
      throw new PayPlusError('PayPlus service not initialized', 'NOT_INITIALIZED');
    }

    try {
      const planDetails = getPlanDetails(plan);
      const amount = this.calculateAmount(planDetails);
      const currency = planDetails.currency === 'USD' ? 'USD' : 'ILS';

      const payload: Partial<PayPlusCreatePaymentRequest> = {
        amount,
        currency_code: currency,
        product_name: `Finotaur ${planDetails.name}`,
        sendEmailApproval: true,
        sendEmailFailure: true,
        customer_name: userName,
        email_address: userEmail,
        phone_number: phoneNumber,
        description: `Upgrade to Finotaur ${planDetails.name} plan`,
        custom_fields: {
          user_id: userId,
          plan: plan
        },
        success_url: `${window.location.origin}/app/journal/payment/success?plan=${plan}`,
        failure_url: `${window.location.origin}/app/journal/payment/failure?plan=${plan}`
      };

      console.log('💳 Creating payment page:', {
        userId,
        plan,
        amount: amount / 100,
        currency
      });

      // 🎯 Call with retry logic
      const data = await this.fetchWithRetry(
        `${this.supabaseUrl}/functions/v1/create-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.supabaseAnonKey}`
          },
          body: JSON.stringify(payload)
        }
      );

      console.log('✅ Payment page created successfully');

      return {
        paymentUrl: data.payment_page_link,
        transactionUid: data.transaction_uid
      };
    } catch (error) {
      console.error('❌ PayPlus createPaymentPage error:', error);
      
      if (error instanceof PayPlusError) {
        throw error;
      }
      
      throw new PayPlusError(
        error instanceof Error ? error.message : 'Unknown error creating payment',
        'CREATE_PAYMENT_FAILED'
      );
    }
  }

  /**
   * Cancel subscription with retry logic
   */
  async cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    if (!this.initialized) {
      throw new PayPlusError('PayPlus service not initialized', 'NOT_INITIALIZED');
    }

    try {
      console.log('🚫 Canceling subscription for user:', userId);

      const data = await this.fetchWithRetry(
        `${this.supabaseUrl}/functions/v1/cancel-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.supabaseAnonKey}`
          },
          body: JSON.stringify({ userId })
        }
      );

      console.log('✅ Subscription canceled successfully');
      return data;
    } catch (error) {
      console.error('❌ cancelSubscription error:', error);
      
      if (error instanceof PayPlusError) {
        throw error;
      }
      
      throw new PayPlusError(
        error instanceof Error ? error.message : 'Unknown error canceling subscription',
        'CANCEL_SUBSCRIPTION_FAILED'
      );
    }
  }

  // ================================================
  // PRIVATE HELPERS
  // ================================================

  /**
   * Fetch with timeout and retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt: number = 1
  ): Promise<any> {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new PayPlusError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code || 'HTTP_ERROR',
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        if (attempt < CONFIG.RETRY_ATTEMPTS) {
          console.warn(`⏱️ Request timeout, retrying (${attempt}/${CONFIG.RETRY_ATTEMPTS})...`);
          await this.sleep(CONFIG.RETRY_DELAY * Math.pow(CONFIG.RETRY_BACKOFF, attempt - 1));
          return this.fetchWithRetry(url, options, attempt + 1);
        }
        throw new PayPlusTimeoutError();
      }

      // Handle network errors with retry
      if (error instanceof TypeError && attempt < CONFIG.RETRY_ATTEMPTS) {
        console.warn(`🔌 Network error, retrying (${attempt}/${CONFIG.RETRY_ATTEMPTS})...`);
        await this.sleep(CONFIG.RETRY_DELAY * Math.pow(CONFIG.RETRY_BACKOFF, attempt - 1));
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      // Re-throw PayPlus errors
      if (error instanceof PayPlusError) {
        throw error;
      }

      // Wrap unknown errors
      throw new PayPlusNetworkError(
        error instanceof Error ? error.message : 'Network request failed'
      );
    }
  }

  /**
   * Calculate amount in cents/agorot
   */
  private calculateAmount(plan: PricingPlan): number {
    if (plan.interval === 'year') {
      // Basic Yearly: $149 | Premium Yearly: $299
      return Math.round(plan.price * 100);
    }
    // Basic Monthly: $19.99 | Premium Monthly: $39.99
    return Math.round(plan.price * 100);
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ================================================
// EXPORT SINGLETON INSTANCE
// ================================================

export const payPlusService = PayPlusService.getInstance();