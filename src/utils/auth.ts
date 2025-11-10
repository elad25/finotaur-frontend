// src/utils/auth.ts
import { supabase } from '@/lib/supabase';

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (error) {
    console.error('Failed to get user ID:', error);
    return null;
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('⚠️  No active session');
      return null;
    }

    return session.user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Sign out user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      return { ok: false, message: error.message };
    }
    return { ok: true };
  } catch (error: any) {
    console.error('Sign out exception:', error);
    return { ok: false, message: error.message || 'Sign out failed' };
  }
}

/**
 * Initialize auth listener
 */
export function initAuthListener(
  onSignIn?: (user: any) => void,
  onSignOut?: () => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log('🔐 Auth event:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in:', session.user.id);
        onSignIn?.(session.user);
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        onSignOut?.();
      }
    }
  );

  return subscription;
}