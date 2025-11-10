// src/types/database.types.ts
// ============================================
// Complete Type Definitions for Finotaur
// Synced with Supabase Schema
// ============================================

export interface Profile {
  id: string; // UUID from auth.users
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category?: string;
  timeframe?: string;
  setup_type?: string;
  default_stop_loss?: number;
  default_take_profit?: number;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  user_id: string; // UUID - must match auth.users.id
  
  // Timestamps
  open_at: string; // timestamptz
  close_at?: string; // timestamptz - nullable
  created_at: string;
  updated_at: string;
  
  // Trade Details
  symbol: string; // varchar - required
  asset_class?: string; // varchar - nullable
  side: 'LONG' | 'SHORT'; // varchar - required
  quantity: number; // numeric - required
  
  // Prices
  entry_price: number; // numeric - required
  stop_price: number; // numeric - required
  take_profit_price?: number; // numeric - nullable
  exit_price?: number; // numeric - nullable
  
  // Fees
  fees?: number; // numeric - nullable
  fees_mode?: string; // varchar - nullable
  
  // Classification
  session?: string; // varchar - nullable
  strategy_id?: string; // UUID - references strategies.id
  strategy?: string; // varchar - DEPRECATED, kept for backward compatibility
  setup?: string; // varchar - nullable
  
  // Analysis
  notes?: string; // text - nullable
  mistake?: string; // varchar - nullable
  next_time?: string; // varchar - nullable
  tags?: string[]; // array - nullable
  screenshot_url?: string; // text - nullable
  
  // Results
  outcome?: 'WIN' | 'LOSS' | 'BE' | 'OPEN'; // text - nullable
  pnl?: number; // numeric - nullable
  quality_tag?: string; // text - nullable
  
  // Metrics (stored as JSONB)
  metrics?: TradeMetrics;
}

export interface TradeMetrics {
  rr?: number; // Risk/Reward ratio
  riskUSD?: number; // Risk in USD
  rewardUSD?: number; // Reward in USD
  riskPts?: number; // Risk in points
  rewardPts?: number; // Reward in points
  actual_r?: number; // Actual R achieved
}

// ============================================
// Database Schema Types
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'> & {
          id: string;
        };
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      strategies: {
        Row: Strategy;
        Insert: Omit<Strategy, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
        };
        Update: Partial<Omit<Strategy, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      trades: {
        Row: Trade;
        Insert: Omit<Trade, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
        };
        Update: Partial<Omit<Trade, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// ============================================
// Helper Types
// ============================================

export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

export type Inserts<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert'];

export type Updates<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update'];

// ============================================
// Trade with Strategy (for joins)
// ============================================

export interface TradeWithStrategy extends Trade {
  strategies?: Strategy; // For joined queries
}

// ============================================
// Form Types (for UI components)
// ============================================

export interface TradeFormData {
  // Required fields
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entry_price: number;
  stop_price: number;
  open_at: string;
  
  // Optional fields
  take_profit_price?: number;
  exit_price?: number;
  close_at?: string;
  asset_class?: string;
  fees?: number;
  fees_mode?: string;
  session?: string;
  strategy_id?: string;
  setup?: string;
  notes?: string;
  mistake?: string;
  next_time?: string;
  tags?: string[];
  screenshot_url?: string;
  outcome?: 'WIN' | 'LOSS' | 'BE' | 'OPEN';
}

export interface StrategyFormData {
  name: string;
  description?: string;
  category?: string;
  timeframe?: string;
  setup_type?: string;
  default_stop_loss?: number;
  default_take_profit?: number;
  status?: 'active' | 'archived';
}