// ================================================
// 🔥 src/types/database.ts - COMPLETE v3.0
// ================================================
// ✅ ALL tables from Finotaur schema
// ✅ Fixes all "never" TypeScript errors
// ✅ Complete type safety
// ================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================
// MAIN TABLES
// ============================================

export interface Profile {
  id: string
  email: string
  display_name?: string | null
  avatar_url?: string | null
  role: string
  account_type: string
  subscription_status: string
  subscription_interval?: string | null
  subscription_started_at?: string | null
  subscription_expires_at?: string | null
  trial_ends_at?: string | null
  last_login_at?: string | null
  login_count: number
  is_banned: boolean
  ban_reason?: string | null
  current_month_trades_count: number
  trade_count: number
  max_trades: number
  current_portfolio?: number | null
  initial_portfolio?: number | null
  total_pnl?: number | null
  metadata?: Json | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
  onboarding_completed?: boolean
  affiliate_code?: string | null
  referred_by?: string | null
  referral_count?: number | null
  portfolio_size?: number | null
  risk_percentage?: number | null
  risk_mode?: string | null
  fixed_risk_amount?: number | null
}

export interface Trade {
  id: string
  user_id: string
  symbol: string
  asset_class?: string | null
  side: 'LONG' | 'SHORT'
  quantity: number
  entry_price: number
  stop_price?: number | null
  take_profit_price?: number | null
  exit_price?: number | null
  fees?: number | null
  fees_mode?: string | null
  session?: string | null
  strategy_id?: string | null
  setup?: string | null
  notes?: string | null
  mistake?: string | null
  next_time?: string | null
  tags?: string[] | null
  screenshot_url?: string | null
  screenshots?: string[] | null
  outcome?: 'WIN' | 'LOSS' | 'BE' | 'OPEN' | null
  pnl?: number | null
  quality_tag?: string | null
  metrics?: Json | null
  broker?: string | null
  external_id?: string | null
  multiplier?: number | null
  actual_r?: number | null
  user_risk_r?: number | null
  user_reward_r?: number | null
  actual_user_r?: number | null
  risk_pts?: number | null
  reward_pts?: number | null
  rr?: number | null
  risk_usd?: number | null
  reward_usd?: number | null
  open_at: string
  close_at?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
  deleted_by?: string | null
  snaptrade_activity_id?: string | null
  snaptrade_account_id?: string | null
  import_source?: string | null
  imported_at?: string | null
}

export interface Strategy {
  id: string
  user_id: string
  name: string
  description?: string | null
  category?: string | null
  timeframe?: string | null
  setup_type?: string | null
  default_stop_loss?: number | null
  default_take_profit?: number | null
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  referral_code: string
  status: string
  reward_granted_to_referrer: boolean
  reward_granted_to_referred: boolean
  signed_up_at: string
  converted_to_paid_at?: string | null
  discount_applied: boolean
  converted_to_paid: boolean
  created_at: string
  updated_at: string
}

export interface SnapTradeActivity {
  id: string
  user_id: string
  last_activity_at: string
  connection_status: string
  brokerage_connection_id?: string | null
  brokerage_name?: string | null
  connected_at?: string | null
  disconnected_at?: string | null
  created_at: string
  updated_at: string
}

export interface SnapTradeUser {
  id: string
  user_id: string
  snaptrade_user_id: string
  snaptrade_user_secret?: string | null
  created_at: string
  updated_at: string
}

export interface PaymentHistory {
  id: string
  user_id: string
  amount: number
  currency: string
  status: string
  plan: string
  payplus_transaction_id: string
  invoice_url?: string | null
  payment_method?: string | null
  error_message?: string | null
  created_at: string
}

export interface AdminImpersonationSession {
  id: string
  admin_id: string
  impersonated_user_id: string
  session_token: string
  created_at: string
  expires_at: string
  last_activity_at: string
  is_active: boolean
  ip_address?: string | null
  user_agent?: string | null
  impersonated_user_email?: string | null
  impersonated_user_name?: string | null
  admin_email?: string | null
}

// ============================================
// DATABASE SCHEMA
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          id: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      trades: {
        Row: Trade
        Insert: Omit<Trade, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Trade, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      strategies: {
        Row: Strategy
        Insert: Omit<Strategy, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Strategy, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      referrals: {
        Row: Referral
        Insert: Omit<Referral, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Referral, 'id' | 'created_at' | 'updated_at'>>
      }
      snaptrade_activity: {
        Row: SnapTradeActivity
        Insert: Omit<SnapTradeActivity, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<SnapTradeActivity, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      snaptrade_users: {
        Row: SnapTradeUser
        Insert: Omit<SnapTradeUser, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<SnapTradeUser, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      payment_history: {
        Row: PaymentHistory
        Insert: Omit<PaymentHistory, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<PaymentHistory, 'id' | 'user_id' | 'created_at'>>
      }
      admin_impersonation_sessions: {
        Row: AdminImpersonationSession
        Insert: Omit<AdminImpersonationSession, 'id' | 'created_at' | 'last_activity_at'> & {
          id?: string
          created_at?: string
          last_activity_at?: string
        }
        Update: Partial<Omit<AdminImpersonationSession, 'id' | 'admin_id' | 'impersonated_user_id' | 'created_at'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_impersonation_session: {
        Args: {
          p_session_token: string
        }
        Returns: Array<{
          admin_id: string
          impersonated_user_id: string
          impersonated_user_email: string
          expires_at: string
          is_active: boolean
        }>
      }
      get_user_subscription_status: {
        Args: {
          user_id_param: string
        }
        Returns: Array<{
          remaining: number
          used: number
          max_trades: number
          plan: string
          reset_date: string
          account_type: string
          subscription_interval: string | null
          subscription_status: string
          subscription_expires_at: string | null
          role: string
          initial_portfolio: number
          current_portfolio: number
        }>
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// ============================================
// HELPER TYPES
// ============================================

export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row']

export type Inserts<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert']

export type Updates<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update']