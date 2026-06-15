import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

// ============================================================
// Hook
// ============================================================

export function useTradeTags(tradeId: string | undefined): {
  tagIds: string[];
  isLoading: boolean;
  setTradeTags: (tagIds: string[]) => Promise<void>;
} {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();

  const queryKey = ['trade-tag-links', tradeId];

  const linksQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tradeId) return [];
      const { data, error } = await supabase
        .from('trade_tag_links')
        .select('tag_id')
        .eq('trade_id', tradeId);
      if (error) throw error;
      return (data ?? []).map((row: { tag_id: string }) => row.tag_id);
    },
    enabled: !!tradeId && !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });

  // ── setTradeTags ──────────────────────────────────────────
  // Diffs current links against desired set, then deletes removed
  // and inserts added in the fewest Supabase calls (max 2).
  const setTradeTags = async (nextTagIds: string[]): Promise<void> => {
    if (!tradeId || !userId) return;

    const currentTagIds: string[] = linksQuery.data ?? [];
    const currentSet = new Set(currentTagIds);
    const nextSet = new Set(nextTagIds);

    const toAdd = nextTagIds.filter(id => !currentSet.has(id));
    const toRemove = currentTagIds.filter(id => !nextSet.has(id));

    // Delete removed links (single call via .in())
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('trade_tag_links')
        .delete()
        .eq('trade_id', tradeId)
        .in('tag_id', toRemove);
      if (error) throw error;
    }

    // Insert added links (single call via array insert)
    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('trade_tag_links')
        .insert(toAdd.map(tag_id => ({ trade_id: tradeId, tag_id })));
      if (error) throw error;
    }

    await invalidate();
  };

  return {
    tagIds: linksQuery.data ?? [],
    isLoading: linksQuery.isLoading,
    setTradeTags,
  };
}
