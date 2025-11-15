/**
 * SnapTrade Supabase Integration
 * ✅ FIXED VERSION - Properly registers users and validates userSecret
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
   * ✅ VALIDATES that userSecret is not empty
   */
  async saveCredentials(
    userId: string,
    credentials: SnapTradeUser
  ): Promise<void> {
    console.log('💾 Saving credentials to DB:', {
      userId,
      snaptradeUserId: credentials.userId,
      hasUserSecret: !!credentials.userSecret,
      userSecretLength: credentials.userSecret?.length || 0
    });

    // ✅ VALIDATION: Ensure userSecret is not empty
    if (!credentials.userSecret || credentials.userSecret.trim() === '') {
      throw new Error('Cannot save credentials: userSecret is empty!');
    }

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

    console.log('✅ Credentials saved successfully');
  }

  /**
   * Get SnapTrade credentials from Supabase
   * ✅ VALIDATES that userSecret exists and is not empty
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

      console.log('📖 Retrieved credentials from DB:', {
        userId: data.snaptrade_user_id,
        hasUserSecret: !!data.snaptrade_user_secret,
        userSecretLength: data.snaptrade_user_secret?.length || 0
      });

      // ✅ VALIDATION: Check if userSecret is empty
      if (!data.snaptrade_user_secret || data.snaptrade_user_secret.trim() === '') {
        console.warn('⚠️ Found credentials with EMPTY userSecret - returning null');
        return null;
      }

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
   * ✅ Also validates that userSecret is not empty
   */
  async hasCredentials(userId: string): Promise<boolean> {
    try {
      const credentials = await this.getCredentials(userId);
      return credentials !== null && !!credentials.userSecret;
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
    if (updates.userSecret !== undefined) {
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
 * ✅ FIXED: Actually registers user and gets real userSecret
 */
export async function initializeSnapTradeForUser(
  supabaseUserId: string,
  snaptradeUserId?: string
): Promise<SnapTradeCredentials> {
  try {
    console.log('🔄 Initializing SnapTrade for user:', supabaseUserId);
    
    const userId = snaptradeUserId || supabaseUserId;
    
    // ✅ CRITICAL FIX: Actually call registerUser to get userSecret!
    console.log('📝 Registering user with SnapTrade API...');
    
    // Import snaptradeService here to avoid circular dependency
    const { snaptradeService } = await import('./snaptradeService');
    
    try {
      const registeredUser = await snaptradeService.registerUser(userId);
      
      console.log('✅ User registered successfully:', {
        userId: registeredUser.userId,
        hasUserSecret: !!registeredUser.userSecret,
        userSecretLength: registeredUser.userSecret?.length || 0
      });

      // ✅ VALIDATION: Ensure we got a userSecret
      if (!registeredUser.userSecret || registeredUser.userSecret.trim() === '') {
        throw new Error('SnapTrade registration did not return userSecret!');
      }
      
      // Save credentials with real userSecret
      await snaptradeSupabaseService.saveCredentials(supabaseUserId, {
        userId: registeredUser.userId,
        userSecret: registeredUser.userSecret,
      });

      console.log('✅ Credentials saved to database');
      
      return {
        userId: registeredUser.userId,
        userSecret: registeredUser.userSecret,
      };
      
    } catch (registerError: any) {
      console.error('❌ Failed to register user with SnapTrade:', registerError);
      throw registerError; // Don't save empty credentials
    }
    
  } catch (error) {
    console.error('❌ Error initializing SnapTrade:', error);
    throw error;
  }
}

/**
 * Get or create SnapTrade credentials for a user
 * ✅ FIXED: Properly initializes if credentials don't exist or are empty
 */
export async function getOrCreateSnapTradeCredentials(
  supabaseUserId: string,
  snaptradeUserId?: string
): Promise<SnapTradeCredentials> {
  console.log('🔍 Getting or creating SnapTrade credentials for:', supabaseUserId);
  
  // Try to get existing credentials
  const existing = await snaptradeSupabaseService.getCredentials(supabaseUserId);
  
  if (existing && existing.userSecret && existing.userSecret.trim() !== '') {
    console.log('✅ Found existing valid credentials');
    return existing;
  }
  
  if (existing) {
    console.warn('⚠️ Found existing credentials WITHOUT valid userSecret - deleting and re-registering');
    // Delete invalid credentials
    await snaptradeSupabaseService.deleteCredentials(supabaseUserId);
  }

  // Create new credentials with proper registration
  console.log('🆕 Creating new SnapTrade credentials with registration');
  const userId = snaptradeUserId || supabaseUserId;
  return initializeSnapTradeForUser(supabaseUserId, userId);
}

/**
 * Remove SnapTrade integration for a user
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
        
        // Disconnect all broker connections
        await snaptradeService.disconnectAllBrokerages(credentials);
        console.log('✅ Disconnected all brokerages');
        
        // Delete user from SnapTrade
        try {
          await snaptradeService.deleteUser(credentials.userId, credentials.userSecret);
          console.log('✅ Deleted user from SnapTrade');
        } catch (deleteError) {
          console.warn('⚠️ Could not delete user from SnapTrade');
        }
      } catch (error) {
        console.error('⚠️ Error disconnecting/deleting from SnapTrade:', error);
      }
    }

    // Delete credentials from database
    await snaptradeSupabaseService.deleteCredentials(supabaseUserId);
    console.log('✅ SnapTrade credentials removed from database');
    
  } catch (error) {
    console.error('Error removing SnapTrade integration:', error);
    throw error;
  }
}