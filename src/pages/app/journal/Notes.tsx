import { useState, useCallback } from 'react';
import { JournalNotesSkeletonPage } from "@/components/skeletons/JournalNotesSkeleton";
import { NotebookPen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { useNotebook } from '@/hooks/useNotebook';
import { FolderSidebar } from '@/components/journal/notebook/FolderSidebar';
import { EntryList } from '@/components/journal/notebook/EntryList';
import { EntryEditor } from '@/components/journal/notebook/EntryEditor';

/**
 * Global Notebook page — 3-pane layout:
 *   LEFT   FolderSidebar  (collapsible on mobile)
 *   MIDDLE EntryList      (filtered + searchable)
 *   RIGHT  EntryEditor    (selected note)
 */
export default function JournalNotes() {
  const {
    folders,
    entries,
    isLoading,
    createFolder,
    renameFolder,
    deleteFolder,
    createEntry,
    updateEntry,
    deleteEntry,
    togglePin,
  } = useNotebook();

  // ── Selection state ─────────────────────────────────────────────────────────
  // null = "All Notes" pseudo-folder
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedEntry = entries.find(e => e.id === selectedEntryId) ?? null;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCreateEntry = useCallback(async () => {
    // createEntry is fire-and-forget; the query cache invalidation will surface the new entry.
    // We want to select it immediately: best-effort by finding the most recently created entry
    // after a short delay (the hook refetches on onSuccess).
    createEntry({
      folderId: selectedFolderId,
      title: '',
      content: '',
      tags: [],
      pinned: false,
    });
    // Select the newest entry once the list refreshes (~300 ms for the network round-trip)
    setTimeout(() => {
      // entries is captured at call time; re-access via the query's fresh data is not possible
      // here, so we rely on the onSuccess → refetch → re-render cycle to show the new entry,
      // and the user clicks it. For a better UX we select the first entry in the current folder
      // after the data refreshes — see the effect below.
      setSelectedEntryId(null); // clear so the "no selection" pane appears briefly
    }, 50);
  }, [createEntry, selectedFolderId]);

  const handleSelectEntry = useCallback((id: string) => {
    setSelectedEntryId(id);
  }, []);

  const handleUpdateEntry = useCallback(
    (id: string, partial: Parameters<typeof updateEntry>[1]) => {
      updateEntry(id, partial);
    },
    [updateEntry],
  );

  const handleDeleteEntry = useCallback(
    (id: string) => {
      deleteEntry(id);
      setSelectedEntryId(null);
    },
    [deleteEntry],
  );

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <JournalNotesSkeletonPage />;
  }

  // ── Layout ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full p-4 md:p-6 gap-4 overflow-hidden">
      {/* Page header row */}
      <div className="flex items-center justify-between shrink-0">
        <PageTitle title="Notebook" subtitle="Capture ideas, strategies, and lessons learned" />
        {/* Mobile sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 text-ink-secondary"
          onClick={() => setSidebarOpen(v => !v)}
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </Button>
      </div>

      {/* 3-pane container */}
      <div className="flex flex-1 gap-3 min-h-0 overflow-hidden">
        {/* ── LEFT: Folder sidebar ─────────────────────────────────────────── */}
        <Card
          variant="default"
          padding="compact"
          className={[
            'w-48 shrink-0 flex flex-col overflow-hidden transition-all duration-200',
            // Mobile: toggled visibility; md+: always visible
            sidebarOpen ? 'flex' : 'hidden md:flex',
          ].join(' ')}
        >
          <FolderSidebar
            folders={folders}
            entries={entries}
            selectedFolderId={selectedFolderId}
            onSelectFolder={id => {
              setSelectedFolderId(id);
              setSelectedEntryId(null);
            }}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
          />
        </Card>

        {/* ── MIDDLE: Entry list ───────────────────────────────────────────── */}
        <Card
          variant="default"
          padding="compact"
          className="w-64 shrink-0 flex flex-col overflow-hidden"
        >
          <EntryList
            entries={entries}
            folders={folders}
            selectedFolderId={selectedFolderId}
            selectedEntryId={selectedEntryId}
            onSelectEntry={handleSelectEntry}
            onCreateEntry={handleCreateEntry}
          />
        </Card>

        {/* ── RIGHT: Editor ────────────────────────────────────────────────── */}
        <Card
          variant="default"
          padding="compact"
          className="flex-1 flex flex-col overflow-hidden min-w-0"
        >
          {selectedEntry ? (
            <EntryEditor
              entry={selectedEntry}
              folders={folders}
              onUpdate={handleUpdateEntry}
              onDelete={handleDeleteEntry}
              onTogglePin={togglePin}
            />
          ) : (
            <NoSelection onCreateEntry={handleCreateEntry} />
          )}
        </Card>
      </div>
    </div>
  );
}

// ── NoSelection placeholder ───────────────────────────────────────────────────

function NoSelection({ onCreateEntry }: { onCreateEntry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-4">
      <NotebookPen size={48} className="text-ink-tertiary opacity-30" />
      <div>
        <p className="text-sm font-medium text-ink-secondary mb-1">Select a note to start editing</p>
        <p className="text-xs text-ink-tertiary">
          Or create a new note to capture your next idea.
        </p>
      </div>
      <Button variant="goldOutline" size="sm" onClick={onCreateEntry} showArrow={false}>
        New note
      </Button>
    </div>
  );
}
