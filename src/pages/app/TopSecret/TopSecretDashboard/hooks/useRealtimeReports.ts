// =====================================================
// TopSecretDashboard - Realtime Reports Hook v3.0
// 🔥 OPTIMIZED: Batched updates, debounced processing
// 🔥 PERFORMANCE: Minimal re-renders
// =====================================================

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { transformReport, sortReports, type Report } from '../utils/helpers';

interface UseRealtimeReportsOptions {
  userId: string | undefined;
  isTester: boolean;
  isUserLoaded: boolean;
  onReportInsert: (report: Report) => void;
  onReportUpdate: (reportId: string, updates: Partial<Report>) => void;
  onReportPromoted: (report: Report) => void;
}

export function useRealtimeReports({
  userId,
  isTester,
  isUserLoaded,
  onReportInsert,
  onReportUpdate,
  onReportPromoted,
}: UseRealtimeReportsOptions) {
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<string, any>>(new Map());

  const flushUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.size === 0) return;

    for (const [id, data] of pendingUpdatesRef.current) {
      if (data._action === 'insert') {
        onReportInsert(data.report);
      } else if (data._action === 'update') {
        onReportUpdate(id, data.changes);
      } else if (data._action === 'promote') {
        onReportPromoted(data.report);
      }
    }

    pendingUpdatesRef.current.clear();
  }, [onReportInsert, onReportUpdate, onReportPromoted]);

  const scheduleUpdate = useCallback((id: string, data: any) => {
    pendingUpdatesRef.current.set(id, data);

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(flushUpdates, 100);
  }, [flushUpdates]);

  useEffect(() => {
    if (!userId || !isUserLoaded) return;

    const channel = supabase
      .channel('published_reports_realtime_v3')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'published_reports',
        },
        (payload) => {
          const newReport = payload.new as any;
          const transformed = transformReport(newReport);

          if (!transformed) return;

          // Visibility check
          const visibility = newReport.visibility || 'live';
          const shouldShow = isTester ? true : visibility !== 'test';

          if (!shouldShow) return;

          scheduleUpdate(newReport.id, { _action: 'insert', report: transformed });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'published_reports',
        },
        (payload) => {
          const updatedReport = payload.new as any;
          const oldReport = payload.old as any;

          const oldVisibility = oldReport?.visibility || 'test';
          const newVisibility = updatedReport.visibility || 'live';
          const visibilityChanged = oldVisibility !== newVisibility;

          // If promoted from test to live, non-testers should now see it
          if (visibilityChanged && newVisibility === 'live' && !isTester) {
            const transformed = transformReport(updatedReport);
            if (transformed) {
              scheduleUpdate(updatedReport.id, { _action: 'promote', report: transformed });
            }
            return;
          }

          // Regular update
          const changes = {
            title: updatedReport.title,
            subtitle: updatedReport.subtitle,
            pdfUrl: updatedReport.pdf_url,
            pdfStoragePath: updatedReport.pdf_storage_path,
            qaScore: updatedReport.qa_score,
            visibility: newVisibility,
            likesCount: updatedReport.likes_count || 0,
            commentsCount: updatedReport.comments_count || 0,
          };

          scheduleUpdate(updatedReport.id, { _action: 'update', changes });
        }
      )
      .subscribe();

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [userId, isTester, isUserLoaded, scheduleUpdate]);

  // Broadcast channel for cross-tab sync
  useEffect(() => {
    if (!userId) return;

    let broadcastChannel: BroadcastChannel | null = null;

    try {
      broadcastChannel = new BroadcastChannel('finotaur_reports');

      broadcastChannel.onmessage = (event) => {
        const { type, reportId } = event.data;

        if (type === 'REPORT_PROMOTED') {
          onReportUpdate(reportId, { visibility: 'live' });
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    return () => {
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, [userId, onReportUpdate]);
}

// Helper to broadcast promote action
export function broadcastReportPromoted(reportId: string): void {
  try {
    const channel = new BroadcastChannel('finotaur_reports');
    channel.postMessage({
      type: 'REPORT_PROMOTED',
      reportId,
      timestamp: Date.now(),
    });
    channel.close();
  } catch {
    // Ignore
  }
}
