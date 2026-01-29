// =====================================================
// TopSecretDashboard - User Interactions Hook
// 🔥 OPTIMIZED: Optimistic updates, batched operations
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserReportInteractions } from '../utils/helpers';

export function useUserInteractions(userId: string | undefined) {
  const [interactions, setInteractions] = useState<UserReportInteractions>({
    likedReportIds: new Set(),
    bookmarkedReportIds: new Set(),
  });

  // Fetch initial interactions
  useEffect(() => {
    if (!userId) return;

    async function fetchInteractions() {
      try {
        const [likesResult, bookmarksResult] = await Promise.all([
          supabase
            .from('report_likes')
            .select('report_id')
            .eq('user_id', userId),
          supabase
            .from('report_bookmarks')
            .select('report_id')
            .eq('user_id', userId),
        ]);

        setInteractions({
          likedReportIds: new Set(likesResult.data?.map(l => l.report_id) || []),
          bookmarkedReportIds: new Set(bookmarksResult.data?.map(b => b.report_id) || []),
        });
      } catch (error) {
        console.error('Error fetching user interactions:', error);
      }
    }

    fetchInteractions();
  }, [userId]);

  const toggleLike = useCallback(async (reportId: string) => {
    if (!userId) return;

    const isCurrentlyLiked = interactions.likedReportIds.has(reportId);

    // Optimistic update
    setInteractions(prev => {
      const newLikedIds = new Set(prev.likedReportIds);
      if (isCurrentlyLiked) {
        newLikedIds.delete(reportId);
      } else {
        newLikedIds.add(reportId);
      }
      return { ...prev, likedReportIds: newLikedIds };
    });

    try {
      if (isCurrentlyLiked) {
        await supabase
          .from('report_likes')
          .delete()
          .eq('user_id', userId)
          .eq('report_id', reportId);
      } else {
        await supabase
          .from('report_likes')
          .insert({ user_id: userId, report_id: reportId });
      }
    } catch (error) {
      // Rollback on error
      setInteractions(prev => {
        const newLikedIds = new Set(prev.likedReportIds);
        if (isCurrentlyLiked) {
          newLikedIds.add(reportId);
        } else {
          newLikedIds.delete(reportId);
        }
        return { ...prev, likedReportIds: newLikedIds };
      });
      console.error('Error toggling like:', error);
    }
  }, [userId, interactions.likedReportIds]);

  const toggleBookmark = useCallback(async (reportId: string) => {
    if (!userId) return;

    const isCurrentlyBookmarked = interactions.bookmarkedReportIds.has(reportId);

    // Optimistic update
    setInteractions(prev => {
      const newBookmarkedIds = new Set(prev.bookmarkedReportIds);
      if (isCurrentlyBookmarked) {
        newBookmarkedIds.delete(reportId);
      } else {
        newBookmarkedIds.add(reportId);
      }
      return { ...prev, bookmarkedReportIds: newBookmarkedIds };
    });

    try {
      if (isCurrentlyBookmarked) {
        await supabase
          .from('report_bookmarks')
          .delete()
          .eq('user_id', userId)
          .eq('report_id', reportId);
      } else {
        await supabase
          .from('report_bookmarks')
          .insert({ user_id: userId, report_id: reportId });
      }
    } catch (error) {
      // Rollback on error
      setInteractions(prev => {
        const newBookmarkedIds = new Set(prev.bookmarkedReportIds);
        if (isCurrentlyBookmarked) {
          newBookmarkedIds.add(reportId);
        } else {
          newBookmarkedIds.delete(reportId);
        }
        return { ...prev, bookmarkedReportIds: newBookmarkedIds };
      });
      console.error('Error toggling bookmark:', error);
    }
  }, [userId, interactions.bookmarkedReportIds]);

  const isLiked = useCallback((reportId: string): boolean => {
    return interactions.likedReportIds.has(reportId);
  }, [interactions.likedReportIds]);

  const isBookmarked = useCallback((reportId: string): boolean => {
    return interactions.bookmarkedReportIds.has(reportId);
  }, [interactions.bookmarkedReportIds]);

  return {
    interactions,
    toggleLike,
    toggleBookmark,
    isLiked,
    isBookmarked,
  };
}
