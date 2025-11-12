/**
 * SnapTrade Supabase Integration
 * ✅ PAY-AS-YOU-GO VERSION with automatic user registration
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
 * ✅ PAY-AS-YOU-GO: No API registration - OAuth creates user automatically
 * Just creates the userId format and saves to database for tracking.
 */
export async function initializeSnapTradeForUser(
  supabaseUserId: string,
  snaptradeUserId?: string
): Promise<SnapTradeCredentials> {
  try {
    console.log('🔄 Initializing SnapTrade for user (Pay-as-you-go mode - no registration needed)');
    
    // For Pay-as-you-go: Just use the Finotaur user ID with prefix
    // OAuth will create the user automatically on first connection
    const userId = snaptradeUserId || `finotaur_${supabaseUserId}`;
    
    const credentials: SnapTradeCredentials = {
      userId: userId,
      userSecret: '', // Empty for Pay-as-you-go
    };

    // Save to Supabase for tracking
    await snaptradeSupabaseService.saveCredentials(supabaseUserId, {
      userId: credentials.userId,
      userSecret: '', // Empty for Pay-as-you-go
    });

    console.log('✅ SnapTrade initialized (user will be created automatically via OAuth)');
    return credentials;
    
  } catch (error) {
    console.error('Error initializing SnapTrade for user:', error);
    throw error;
  }
}

/**
 * Get or create SnapTrade credentials for a user
 * ✅ PAY-AS-YOU-GO: Auto-registers if not exists
 */
export async function getOrCreateSnapTradeCredentials(
  supabaseUserId: string,
  snaptradeUserId?: string
): Promise<SnapTradeCredentials> {
  // Try to get existing credentials
  const existing = await snaptradeSupabaseService.getCredentials(supabaseUserId);
  
  if (existing) {
    console.log('✅ Found existing SnapTrade credentials');
    return existing;
  }

  // Create new credentials (registers with SnapTrade API)
  console.log('🆕 Creating new SnapTrade credentials');
  const userId = snaptradeUserId || `finotaur_${supabaseUserId}`;
  return initializeSnapTradeForUser(supabaseUserId, userId);
}

/**
 * Remove SnapTrade integration for a user
 * ✅ PAY-AS-YOU-GO: Disconnects brokers and deletes from SnapTrade
 */
export async function removeSnapTradeIntegration(
  supabaseUserId: string
): Promise<void> {
  try {
    console.log('🗑️ Removing SnapTrade integration');
    
    // Get credentials
    const credentials = await snaptradeSupabaseService.getCredentials(supabaseUserId);
    
    if (credentials) {
      try {
        // Import here to avoid circular dependencies
        const { snaptradeService } = await import('./snaptradeService');
        
        // Disconnect all broker connections (cost optimization!)
        await snaptradeService.disconnectAllBrokerages(credentials);
        console.log('✅ Disconnected all brokerages');
        
        // Delete user from SnapTrade
        await snaptradeService.deleteUser(credentials.userId);
        console.log('✅ Deleted user from SnapTrade');
      } catch (error) {
        console.error('⚠️ Error disconnecting/deleting from SnapTrade:', error);
        // Continue anyway - we still want to clean up database
      }
    }

    // Delete credentials from Supabase database
    await snaptradeSupabaseService.deleteCredentials(supabaseUserId);
    console.log('✅ SnapTrade credentials removed from database');
    
  } catch (error) {
    console.error('Error removing SnapTrade integration:', error);
    throw error;
  }
}