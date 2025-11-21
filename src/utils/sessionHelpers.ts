// src/utils/sessionHelpers.ts
// ✅ v8.5.2: Helper functions for trading sessions
import { supabase } from '@/lib/supabase';

export interface SessionInfo {
  session_name: string;
  description: string;
  color: string;
  start_hour_ny: number;
  end_hour_ny: number;
  is_current: boolean;
}

/**
 * Get session for a specific timestamp
 */
export async function getSessionForTimestamp(timestamp: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .rpc('get_trading_session', { p_timestamp: timestamp });

    if (error) throw error;

    return data || 'UNKNOWN';
  } catch (error) {
    console.error('Failed to get session:', error);
    return 'UNKNOWN';
  }
}

/**
 * Get all session info with current session indicator
 */
export async function getAllSessionInfo(timestamp?: string): Promise<SessionInfo[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_session_info', { 
        p_timestamp: timestamp ? timestamp : new Date().toISOString() 
      });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Failed to get session info:', error);
    return [];
  }
}

/**
 * Get current session name
 */
export async function getCurrentSession(): Promise<string> {
  try {
    const { data, error } = await supabase
      .rpc('get_current_session');

    if (error) throw error;

    return data || 'UNKNOWN';
  } catch (error) {
    console.error('Failed to get current session:', error);
    return 'UNKNOWN';
  }
}

/**
 * Format session name for display
 */
export function formatSessionName(session: string): string {
  const map: Record<string, string> = {
    'ASIA': 'Asian Session',
    'LONDON': 'London Session',
    'NEW_YORK': 'New York Session',
    'OVERLAP': 'London-NY Overlap',
    'AFTER_HOURS': 'After Hours',
  };

  return map[session] || session;
}

/**
 * Get session color
 */
export function getSessionColor(session: string): string {
  const colors: Record<string, string> = {
    'ASIA': '#10B981',      // Green
    'LONDON': '#3B82F6',    // Blue
    'NEW_YORK': '#F59E0B',  // Amber
    'OVERLAP': '#EF4444',   // Red
    'AFTER_HOURS': '#6B7280', // Gray
  };

  return colors[session] || '#6B7280';
}