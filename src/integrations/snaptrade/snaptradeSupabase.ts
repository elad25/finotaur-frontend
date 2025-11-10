/**
 * SnapTrade Supabase Integration
 * Handles storing and retrieving SnapTrade credentials from Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import type { SnapTradeCredentials, SnapTradeUser } from './snaptradeTypes';

// ============================================================================
// TYPES
// ============================================================================

interface SnapTradeUserRecord {
  id: string;
  user_id: string;
  snaptrade_user_id: string;
  snaptrade_user_secret: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SUPABASE FUNCTIONS
// ============================================================================

export class SnapTradeSupabaseService {
  private tableName = 'snaptrade_users';

  /**
   * Save SnapTrade credentials to Supabase
   */
  async saveCredentials(
    userId: string,
    credentials: SnapTradeUser
  ): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .upsert({
        user_id: userId,
        snaptrade_user_id: credentials.userId,
        snaptrade_user_secret: credentials.userSecret,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error saving SnapTrade credentials:', error);
      throw new Error(`Failed to save SnapTrade credentials: ${error.message}`);
    }
  }

  /**
   * Get SnapTrade credentials from Supabase
   */
  async getCredentials(userId: string): Promise<SnapTradeCredentials | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('snaptrade_user_id, snaptrade_user_secret')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching SnapTrade credentials:', error);
        return null;
      }

      if (!data) return null;

      return {
        userId: data.snaptrade_user_id,
        userSecret: data.snaptrade_user_secret,
      };
    } catch (error) {
      console.error('Unexpected error fetching SnapTrade credentials:', error);
      return null;
    }
  }

  /**
   * Delete SnapTrade credentials from Supabase
   */
  async deleteCredentials(userId: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting SnapTrade credentials:', error);
      throw new Error(`Failed to delete SnapTrade credentials: ${error.message}`);
    }
  }

  /**
   * Check if user has SnapTrade credentials stored
   */
  async hasCredentials(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking SnapTrade credentials:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Unexpected error checking SnapTrade credentials:', error);
      return false;
    }
  }

  /**
   * Update SnapTrade credentials
   */
  async updateCredentials(
    userId: string,
    updates: Partial<SnapTradeUser>
  ): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.userId) {
      updateData.snaptrade_user_id = updates.userId;
    }
    if (updates.userSecret) {
      updateData.snaptrade_user_secret = updates.userSecret;
    }

    const { error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating SnapTrade credentials:', error);
      throw new Error(`Failed to update SnapTrade credentials: ${error.message}`);
    }
  }
}

// Export singleton instance
export const snaptradeSupabaseService = new SnapTradeSupabaseService();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Initialize SnapTrade for a new user
 * Registers with SnapTrade and saves credentials to Supabase
 */
export async function initializeSnapTradeForUser(
  supabaseUserId: string,
  snaptradeUserId: string
): Promise<SnapTradeCredentials> {
  try {
    // Import here to avoid circular dependencies
    const { snaptradeService } = await import('./snaptradeService');
    
    // Register user with SnapTrade
    const snapTradeUser = await snaptradeService.registerUser({
      userId: snaptradeUserId,
    });

    // Save credentials to Supabase
    await snaptradeSupabaseService.saveCredentials(supabaseUserId, snapTradeUser);

    return {
      userId: snapTradeUser.userId,
      userSecret: snapTradeUser.userSecret,
    };
  } catch (error) {
    console.error('Error initializing SnapTrade for user:', error);
    throw error;
  }
}

/**
 * Get or create SnapTrade credentials for a user
 */
export async function getOrCreateSnapTradeCredentials(
  supabaseUserId: string,
  snaptradeUserId?: string
): Promise<SnapTradeCredentials> {
  // Try to get existing credentials
  const existing = await snaptradeSupabaseService.getCredentials(supabaseUserId);
  
  if (existing) {
    return existing;
  }

  // Create new credentials
  const userId = snaptradeUserId || `finotaur_${supabaseUserId}`;
  return initializeSnapTradeForUser(supabaseUserId, userId);
}

/**
 * Remove SnapTrade integration for a user
 */
export async function removeSnapTradeIntegration(
  supabaseUserId: string
): Promise<void> {
  try {
    // Get credentials
    const credentials = await snaptradeSupabaseService.getCredentials(supabaseUserId);
    
    if (credentials) {
      // Import here to avoid circular dependencies
      const { snaptradeService } = await import('./snaptradeService');
      
      // Delete from SnapTrade
      await snaptradeService.deleteUser(credentials.userId);
    }

    // Delete from Supabase
    await snaptradeSupabaseService.deleteCredentials(supabaseUserId);
  } catch (error) {
    console.error('Error removing SnapTrade integration:', error);
    throw error;
  }
}