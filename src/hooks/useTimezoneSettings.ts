// src/hooks/useTimezoneSettings.ts
// ✅ v8.5.2: Timezone settings with backend sync + trading sessions
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export interface TradingSession {
  id: string;
  session_name: string;
  start_hour_ny: number;
  end_hour_ny: number;
  description: string;
  color: string;
  is_active: boolean;
  display_order: number;
}

export function useTimezoneSettings() {
  const [timezone, setTimezone] = useState<string>('America/New_York');
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<TradingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);

  // ✅ Load user's preferred timezone from profiles
  useEffect(() => {
    const loadTimezone = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('preferred_timezone')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (profile?.preferred_timezone) {
          setTimezone(profile.preferred_timezone);
        } else {
          // Fallback to localStorage or default
          const savedTz = localStorage.getItem('user-timezone');
          if (savedTz) {
            setTimezone(savedTz);
          }
        }
      } catch (error) {
        console.error('Failed to load timezone:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTimezone();
  }, []);

  // ✅ Load trading sessions from database
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('trading_sessions')
          .select('*')
          .eq('is_active', true)
          .order('display_order');

        if (error) throw error;

        if (data) {
          setSessions(data);
        }
      } catch (error) {
        console.error('Failed to load trading sessions:', error);
      }
    };

    loadSessions();
  }, []);

  // ✅ Get current trading session
  useEffect(() => {
    const getCurrentSession = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_current_session');

        if (error) throw error;

        setCurrentSession(data);
      } catch (error) {
        console.error('Failed to get current session:', error);
      }
    };

    getCurrentSession();

    // Update every minute
    const interval = setInterval(getCurrentSession, 60000);
    return () => clearInterval(interval);
  }, []);

  const updateTimezone = (newTimezone: string) => {
    setTimezone(newTimezone);
  };

  const saveTimezone = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      // Save to database
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_timezone: timezone })
        .eq('id', user.id);

      if (error) throw error;

      // Also save to localStorage as backup
      localStorage.setItem('user-timezone', timezone);

      toast.success('Timezone saved successfully!');
    } catch (error: any) {
      console.error('Failed to save timezone:', error);
      toast.error(error.message || 'Failed to save timezone');
    }
  };

  // ✅ Get session for a specific timestamp
  const getSessionForTime = async (timestamp: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .rpc('get_trading_session', { p_timestamp: timestamp });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  };

  // ✅ Convert timestamp to user's timezone
  const convertToUserTimezone = (timestamp: string): Date => {
    const date = new Date(timestamp);
    return date; // Browser automatically converts to local timezone
  };

  // ✅ Format timestamp in user's timezone
  const formatInTimezone = (
    timestamp: string, 
    format: 'date' | 'time' | 'datetime' = 'datetime'
  ): string => {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone === 'system' ? undefined : timezone,
    };

    switch (format) {
      case 'date':
        options.year = 'numeric';
        options.month = 'short';
        options.day = 'numeric';
        break;
      case 'time':
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.hour12 = true;
        break;
      case 'datetime':
        options.year = 'numeric';
        options.month = 'short';
        options.day = 'numeric';
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.hour12 = true;
        break;
    }

    return new Intl.DateTimeFormat('en-US', options).format(date);
  };

  return {
    timezone,
    loading,
    sessions,
    currentSession,
    updateTimezone,
    saveTimezone,
    getSessionForTime,
    convertToUserTimezone,
    formatInTimezone,
  };
}