import { useCallback } from "react";
import { Plus, X } from "lucide-react";
import { uuid } from "@/utils/uuid";

export interface ChecklistItem {
  id: string;
  label: string;
}

interface ChecklistEditorProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

/**
 * Inline editor for strategy entry-checklist items.
 * Each item has a stable UUID id and an editable text label.
 * Matches the Strategies modal input styling (dark bg, gold border accent).
 */
export default function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  const handleAdd = useCallback(() => {
    const newItem: ChecklistItem = { id: uuid(), label: "" };
    onChange([...items, newItem]);
  }, [items, onChange]);

  const handleLabelChange = useCallback(
    (id: string, label: string) => {
      onChange(items.map((item) => (item.id === id ? { ...item, label } : item)));
    },
    [items, onChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      onChange(items.filter((item) => item.id !== id));
    },
    [items, onChange]
  );

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          {/* Ordinal badge */}
          <span
            className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
            style={{
              background: "rgba(201,166,70,0.12)",
              border: "1px solid rgba(201,166,70,0.25)",
              color: "#C9A646",
            }}
          >
            {index + 1}
          </span>

          <input
            type="text"
            value={item.label}
            onChange={(e) => handleLabelChange(item.id, e.target.value)}
            placeholder="Checklist item…"
            className="flex-1 px-3 py-2 rounded-lg bg-black/30 border-2 text-sm transition-all focus:outline-none focus:border-[#C9A646]"
            style={{ borderColor: "rgba(201,166,70,0.2)", color: "#EAEAEA" }}
          />

          <button
            type="button"
            onClick={() => handleRemove(item.id)}
            className="flex-shrink-0 p-1.5 rounded-lg transition-all hover:bg-white/5"
            style={{ color: "#6A6A6A" }}
            aria-label="Remove item"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
        style={{
          background: "rgba(201,166,70,0.08)",
          border: "1px solid rgba(201,166,70,0.2)",
          color: "#C9A646",
        }}
      >
        <Plus className="w-4 h-4" />
        Add item
      </button>
    </div>
  );
}
