import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

// ============================================================
// Types
// ============================================================

export type NotebookFolder = {
  id: string;
  name: string;
  color: string | null;
  order: number;
  createdAt: string;
};

export type NotebookEntry = {
  id: string;
  folderId: string | null;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

// ============================================================
// DB row → domain type mappers
// ============================================================

function mapFolder(row: {
  id: string;
  name: string;
  color: string | null;
  order: number;
  created_at: string;
}): NotebookFolder {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    order: row.order,
    createdAt: row.created_at,
  };
}

function mapEntry(row: {
  id: string;
  folder_id: string | null;
  title: string;
  content: string;
  tags: string[] | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}): NotebookEntry {
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// Hook
// ============================================================

export function useNotebook() {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();

  // ── Folders ───────────────────────────────────────────────
  const foldersQuery = useQuery({
    queryKey: ['journal-notebook-folders', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_notebook_folders')
        .select('id, name, color, "order", created_at')
        .eq('user_id', userId!)
        .order('"order"', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapFolder);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // ── Entries (pinned first, then updatedAt desc) ───────────
  const entriesQuery = useQuery({
    queryKey: ['journal-notebook-entries', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_notebook_entries')
        .select('id, folder_id, title, content, tags, pinned, created_at, updated_at')
        .eq('user_id', userId!)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapEntry);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const folders = foldersQuery.data ?? [];
  const entries = entriesQuery.data ?? [];

  const invalidateFolders = () =>
    qc.invalidateQueries({ queryKey: ['journal-notebook-folders', userId] });
  const invalidateEntries = () =>
    qc.invalidateQueries({ queryKey: ['journal-notebook-entries', userId] });
  const invalidateAll = () => { invalidateFolders(); invalidateEntries(); };

  // ── Folder mutations ──────────────────────────────────────

  const createFolderMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      if (!userId) throw new Error('No user ID');
      const maxOrder = folders.length > 0 ? Math.max(...folders.map(f => f.order)) : -1;
      const { error } = await supabase.from('journal_notebook_folders').insert({
        user_id: userId,
        name,
        color: color ?? null,
        order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: invalidateFolders,
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!userId) throw new Error('No user ID');
      const { error } = await supabase
        .from('journal_notebook_folders')
        .update({ name })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidateFolders,
  });

  // DB has ON DELETE SET NULL on journal_notebook_entries.folder_id — just delete the row
  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('No user ID');
      const { error } = await supabase
        .from('journal_notebook_folders')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  // ── Entry mutations ───────────────────────────────────────

  const createEntryMutation = useMutation({
    mutationFn: async (
      partial: Partial<Pick<NotebookEntry, 'folderId' | 'title' | 'content' | 'tags' | 'pinned'>>,
    ) => {
      if (!userId) throw new Error('No user ID');
      const { error } = await supabase.from('journal_notebook_entries').insert({
        user_id: userId,
        folder_id: partial.folderId ?? null,
        title: partial.title ?? '',
        content: partial.content ?? '',
        tags: partial.tags ?? [],
        pinned: partial.pinned ?? false,
      });
      if (error) throw error;
    },
    onSuccess: invalidateEntries,
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({
      id,
      partial,
    }: {
      id: string;
      partial: Partial<Pick<NotebookEntry, 'folderId' | 'title' | 'content' | 'tags' | 'pinned'>>;
    }) => {
      if (!userId) throw new Error('No user ID');
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (partial.folderId !== undefined) payload.folder_id = partial.folderId;
      if (partial.title !== undefined) payload.title = partial.title;
      if (partial.content !== undefined) payload.content = partial.content;
      if (partial.tags !== undefined) payload.tags = partial.tags;
      if (partial.pinned !== undefined) payload.pinned = partial.pinned;
      const { error } = await supabase
        .from('journal_notebook_entries')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidateEntries,
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('No user ID');
      const { error } = await supabase
        .from('journal_notebook_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidateEntries,
  });

  const togglePinMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('No user ID');
      const entry = entries.find(e => e.id === id);
      const { error } = await supabase
        .from('journal_notebook_entries')
        .update({ pinned: !entry?.pinned, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidateEntries,
  });

  // ── Public API ─────────────────────────────────────────────

  return {
    folders,
    entries,
    isLoading: foldersQuery.isLoading || entriesQuery.isLoading,

    createFolder: (name: string, color?: string) =>
      createFolderMutation.mutate({ name, color }),
    renameFolder: (id: string, name: string) =>
      renameFolderMutation.mutate({ id, name }),
    deleteFolder: (id: string) => deleteFolderMutation.mutate(id),

    createEntry: (
      partial: Partial<Pick<NotebookEntry, 'folderId' | 'title' | 'content' | 'tags' | 'pinned'>>,
    ) => createEntryMutation.mutate(partial),
    updateEntry: (
      id: string,
      partial: Partial<Pick<NotebookEntry, 'folderId' | 'title' | 'content' | 'tags' | 'pinned'>>,
    ) => updateEntryMutation.mutate({ id, partial }),
    deleteEntry: (id: string) => deleteEntryMutation.mutate(id),
    togglePin: (id: string) => togglePinMutation.mutate(id),
  };
}
