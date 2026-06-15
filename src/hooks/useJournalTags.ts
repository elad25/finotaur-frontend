import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

// ============================================================
// Types
// ============================================================

export type JournalTagCategory = 'mistake' | 'mental';

export type JournalTag = {
  id: string;
  category: JournalTagCategory;
  name: string;
  notebookEntryId: string | null;
  color: string | null;
  createdAt: string;
};

// ============================================================
// DB row → domain type mapper
// ============================================================

function mapTag(row: {
  id: string;
  category: string;
  name: string;
  notebook_entry_id: string | null;
  color: string | null;
  created_at: string;
}): JournalTag {
  return {
    id: row.id,
    category: row.category as JournalTagCategory,
    name: row.name,
    notebookEntryId: row.notebook_entry_id,
    color: row.color,
    createdAt: row.created_at,
  };
}

// ============================================================
// Hook
// ============================================================

export function useJournalTags(category?: JournalTagCategory): {
  tags: JournalTag[];
  isLoading: boolean;
  createTag: (input: { category: JournalTagCategory; name: string; color?: string | null }) => Promise<JournalTag>;
  updateTag: (id: string, patch: Partial<Pick<JournalTag, 'name' | 'color' | 'notebookEntryId'>>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
} {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();

  const queryKey = ['journal-tags', userId, category ?? 'all'];

  const tagsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return [];
      let q = supabase
        .from('journal_tags')
        .select('id, category, name, notebook_entry_id, color, created_at')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      if (category) {
        q = q.eq('category', category);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(mapTag);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['journal-tags', userId] });

  // ── createTag ─────────────────────────────────────────────
  // Upserts on (user_id, category, name) conflict — returns the
  // existing tag instead of throwing a UNIQUE violation.
  const createTag = async (input: {
    category: JournalTagCategory;
    name: string;
    color?: string | null;
  }): Promise<JournalTag> => {
    if (!userId) throw new Error('No user ID');

    const { data, error } = await supabase
      .from('journal_tags')
      .upsert(
        {
          user_id: userId,
          category: input.category,
          name: input.name,
          color: input.color ?? null,
        },
        { onConflict: 'user_id,category,name', ignoreDuplicates: false },
      )
      .select('id, category, name, notebook_entry_id, color, created_at')
      .single();

    if (error) throw error;
    await invalidate();
    return mapTag(data);
  };

  // ── updateTag ─────────────────────────────────────────────
  const updateTag = async (
    id: string,
    patch: Partial<Pick<JournalTag, 'name' | 'color' | 'notebookEntryId'>>,
  ): Promise<void> => {
    if (!userId) throw new Error('No user ID');

    const payload: Record<string, unknown> = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.color !== undefined) payload.color = patch.color;
    if (patch.notebookEntryId !== undefined) payload.notebook_entry_id = patch.notebookEntryId;

    const { error } = await supabase
      .from('journal_tags')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    await invalidate();
  };

  // ── deleteTag ─────────────────────────────────────────────
  const deleteTag = async (id: string): Promise<void> => {
    if (!userId) throw new Error('No user ID');

    const { error } = await supabase
      .from('journal_tags')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    await invalidate();
  };

  return {
    tags: tagsQuery.data ?? [],
    isLoading: tagsQuery.isLoading,
    createTag,
    updateTag,
    deleteTag,
  };
}
