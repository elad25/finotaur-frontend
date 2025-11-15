// ===============================================
// FINOTAUR - PAYMENT TYPES
// מותאם למערכת הקיימת עם profiles table
// ===============================================

// משתמש ב-account_type הקיים שלך
export type AccountType = 'free' | 'basic' | 'premium' | 'trial';
export type PaymentPlan = 'basic' | 'premium';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// היסטוריית תשלום מהדאטאבייס
export interface PaymentHistory {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  plan: PaymentPlan;
  payplus_transaction_id: string;
  invoice_url?: string;
  payment_method?: string;
  error_message?: string;
  created_at: string;
}

// תקופת מנוי מהדאטאבייס
export interface SubscriptionPeriod {
  id: string;
  user_id: string;
  plan: AccountType;
  payplus_transaction_id?: string;
  period_start: string;
  period_end: string;
  auto_renew: boolean;
  canceled_at?: string;
  created_at: string;
  updated_at: string;
}

// PayPlus API Types
export interface PayPlusCreatePaymentRequest {
  terminal_uid: string;
  amount: number;
  currency_code: string;
  product_name: string;
  sendEmailApproval: boolean;
  sendEmailFailure: boolean;
  customer_name: string;
  email_address: string;
  phone_number?: string;
  description?: string;
  custom_fields?: {
    user_id: string;
    plan: PaymentPlan;
  };
  success_url: string;
  failure_url: string;
}

export interface PayPlusCreatePaymentResponse {
  results: {
    status: string;
    description: string;
  };
  data: {
    payment_uid: string;
    payment_page_link: string;
    transaction_uid: string;
  };
}

export interface PayPlusWebhookPayload {
  transaction_uid: string;
  more_info: string;
  status_code: string; // "000" = success
  approval_number: string;
  number_of_payments: string;
  first_payment_amount: string;
  rest_payments_amount: string;
  currency_code: string;
  card_number: string;
  card_exp: string;
  customer_name: string;
  terminal_name: string;
  payment_date: string;
  email_address: string;
  custom_fields: {
    user_id: string;
    plan: PaymentPlan;
  };
}

// תוכניות מחירים
export interface PricingPlan {
  id: PaymentPlan;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  recommended?: boolean;
  maxTrades: number;
  accountType: AccountType;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 19.99,
    currency: 'USD',
    interval: 'month',
    maxTrades: 50,
    accountType: 'basic',
    features: [
      '50 trades per month',
      'Advanced analytics',
      'Multiple screenshots per trade',
      'Calendar view',
      'Strategy management',
      'Export reports'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 24.92,
    currency: 'USD',
    interval: 'month',
    maxTrades: -1, // unlimited
    accountType: 'premium',
    recommended: true,
    features: [
      'Unlimited trades',
      'Everything in Basic',
      'AI insights',
      'Priority support',
      'Early access to new features',
      'Save 38% (billed $299/year)'
    ]
  }
];

export const getPlanDetails = (plan: PaymentPlan): PricingPlan => {
  return PRICING_PLANS.find(p => p.id === plan) || PRICING_PLANS[0];
};