// =====================================================
// CRON STATUS SECTION COMPONENT
// =====================================================
// Add this component to NewsletterSub.tsx
// Shows CRON job status and allows manual control
// =====================================================

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Calendar,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Zap,
  History,
  Timer,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================
// TYPES
// ============================================

interface CronStatus {
  enabled: boolean;
  schedule: string;
  timezone: string;
  lastRun: string | null;
  lastStatus: 'success' | 'error' | 'pending' | null;
  lastError: string | null;
  nextRun: string | null;
}

interface CronLog {
  id: string;
  status: 'started' | 'completed' | 'error';
  recipient_count: number;
  subject: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  executed_at: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatNextRun = (dateString: string | null): string => {
  if (!dateString) return 'Not scheduled';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours < 0) return 'Calculating...';
  if (diffHours === 0) return `In ${diffMins} minutes`;
  if (diffHours < 24) return `In ${diffHours}h ${diffMins}m`;
  
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
};

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return '-';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

// ============================================
// CRON STATUS SECTION COMPONENT
// ============================================

const CronStatusSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [isTriggering, setIsTriggering] = useState(false);
  
  // Fetch CRON status
  const { data: cronStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['newsletter-cron-status'],
    queryFn: async (): Promise<CronStatus> => {
      const res = await fetch(`${API_BASE}/api/newsletter/cron/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Fetch CRON logs
  const { data: cronLogs } = useQuery({
    queryKey: ['newsletter-cron-logs'],
    queryFn: async (): Promise<CronLog[]> => {
      const res = await fetch(`${API_BASE}/api/newsletter/cron/logs?limit=5`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
  });
  
  // Toggle CRON mutation
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const endpoint = enabled ? 'start' : 'stop';
      const res = await fetch(`${API_BASE}/api/newsletter/cron/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, enabled) => {
      toast.success(enabled ? 'CRON job started' : 'CRON job stopped');
      queryClient.invalidateQueries({ queryKey: ['newsletter-cron-status'] });
    },
    onError: (error) => {
      toast.error(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
  
  // Manual trigger
  const handleManualTrigger = async () => {
    setIsTriggering(true);
    try {
      const res = await fetch(`${API_BASE}/api/newsletter/cron/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
        },
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Newsletter generation and send started!');
        queryClient.invalidateQueries({ queryKey: ['newsletter-cron-status'] });
        queryClient.invalidateQueries({ queryKey: ['newsletter-cron-logs'] });
      } else {
        toast.error(data.error || 'Failed to trigger');
      }
    } catch (error) {
      toast.error('Failed to trigger newsletter');
    } finally {
      setIsTriggering(false);
    }
  };
  
  if (statusLoading) {
    return (
      <div className="bg-[#0d0d18] rounded-xl border border-gray-800/50 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          <span className="text-gray-500">Loading CRON status...</span>
        </div>
      </div>
    );
  }

  const isEnabled = cronStatus?.enabled ?? false;
  const lastStatus = cronStatus?.lastStatus;

  return (
    <div className="bg-[#0d0d18] rounded-xl border border-gray-800/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800/50 bg-[#080812] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isEnabled ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-gray-800 border border-gray-700'}`}>
            <Timer className={`w-5 h-5 ${isEnabled ? 'text-emerald-400' : 'text-gray-500'}`} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              Automated Delivery
              {isEnabled && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  ACTIVE
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500">Mon-Fri at 9:00 AM New York Time</p>
          </div>
        </div>
        
        {/* Toggle Button */}
        <button
          onClick={() => toggleMutation.mutate(!isEnabled)}
          disabled={toggleMutation.isPending}
          className={`relative w-14 h-7 rounded-full transition-all ${
            isEnabled ? 'bg-emerald-500' : 'bg-gray-700'
          } ${toggleMutation.isPending ? 'opacity-50' : ''}`}
        >
          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
            isEnabled ? 'translate-x-8' : 'translate-x-1'
          }`}>
            {toggleMutation.isPending && (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            )}
          </div>
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Schedule Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#080812] rounded-xl p-4 border border-gray-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-[#C9A646]" />
              <span className="text-xs text-gray-500">Schedule</span>
            </div>
            <p className="text-white font-medium">Monday - Friday</p>
            <p className="text-sm text-gray-400">9:00 AM New York</p>
          </div>
          
          <div className="bg-[#080812] rounded-xl p-4 border border-gray-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-500">Next Run</span>
            </div>
            <p className="text-white font-medium">
              {isEnabled ? formatNextRun(cronStatus?.nextRun || null) : 'Disabled'}
            </p>
          </div>
        </div>

        {/* Last Run Status */}
        {cronStatus?.lastRun && (
          <div className={`flex items-center justify-between p-4 rounded-xl border ${
            lastStatus === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30' 
              : lastStatus === 'error'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-gray-800/50 border-gray-700'
          }`}>
            <div className="flex items-center gap-3">
              {lastStatus === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : lastStatus === 'error' ? (
                <XCircle className="w-5 h-5 text-red-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              )}
              <div>
                <p className={`font-medium ${
                  lastStatus === 'success' ? 'text-emerald-400' : 
                  lastStatus === 'error' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  Last run: {lastStatus === 'success' ? 'Success' : lastStatus === 'error' ? 'Failed' : 'Pending'}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(cronStatus.lastRun).toLocaleString()}
                </p>
              </div>
            </div>
            {lastStatus === 'error' && cronStatus.lastError && (
              <p className="text-xs text-red-400 max-w-xs truncate">{cronStatus.lastError}</p>
            )}
          </div>
        )}

        {/* Manual Trigger Button */}
        <button
          onClick={handleManualTrigger}
          disabled={isTriggering}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9A646] to-orange-500 hover:from-[#d4af4f] hover:to-orange-400 disabled:opacity-50 transition-all text-black font-bold flex items-center justify-center gap-2"
        >
          {isTriggering ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating & Sending...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Generate & Send Now
            </>
          )}
        </button>

        <p className="text-xs text-gray-600 text-center">
          This will generate the report and automatically send to all eligible recipients
        </p>

        {/* Recent CRON Logs */}
        {cronLogs && cronLogs.length > 0 && (
          <div className="border-t border-gray-800 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400 font-medium">Recent Runs</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {cronLogs.map((log) => (
                <div 
                  key={log.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#080812] border border-gray-800/50"
                >
                  <div className="flex items-center gap-2">
                    {log.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : log.status === 'error' ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                    )}
                    <span className="text-sm text-gray-300">
                      {new Date(log.executed_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {log.recipient_count > 0 && (
                      <span className="text-emerald-400">
                        <Send className="w-3 h-3 inline mr-1" />
                        {log.recipient_count}
                      </span>
                    )}
                    <span className="text-gray-500">
                      {formatDuration(log.duration_seconds)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CronStatusSection;

// =====================================================
// HOW TO INTEGRATE INTO NewsletterSub.tsx:
// =====================================================
//
// 1. Import the component at the top:
//    import CronStatusSection from './CronStatusSection';
//
// 2. Add it to the page layout, after the Newsletter Settings Section:
//    {/* Newsletter Settings Section */}
//    <NewsletterSettingsSection ... />
//    
//    {/* CRON Status Section */}
//    <CronStatusSection />
//    
//    {/* Send Newsletter Section */}
//    <div className="bg-[#0d0d18] ...">
//
// =====================================================