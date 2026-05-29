import { Pencil, Trash2 } from 'lucide-react';
import type { ProgressRule } from '@/hooks/useProgressTracker';

type Props = {
  rules: ProgressRule[];
  todayEntries: Map<string, boolean>;
  onToggle: (id: string) => void;
  onEdit: (rule: ProgressRule) => void;
  onDelete: (id: string) => void;
};

export default function RulesList({ rules, todayEntries, onToggle, onEdit, onDelete }: Props) {
  if (rules.length === 0) {
    return (
      <p className="text-center text-zinc-400 py-4">
        No rules yet. Add your first one below — a small daily habit that compounds.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {rules.map(rule => {
        const completed = todayEntries.get(rule.id) ?? false;
        return (
          <li
            key={rule.id}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-yellow-200/5 transition"
          >
            <input
              type="checkbox"
              className="accent-yellow-500 h-4 w-4 shrink-0 cursor-pointer"
              checked={completed}
              onChange={() => onToggle(rule.id)}
            />
            <span
              className={`flex-1 text-zinc-200 text-sm ${completed ? 'line-through text-zinc-500' : ''}`}
            >
              {rule.text}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => onEdit(rule)}
                className="p-1.5 rounded-lg hover:bg-yellow-200/10 text-zinc-400 hover:text-yellow-200 transition"
                aria-label="Edit rule"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Delete this rule? Past history is preserved.')) {
                    onDelete(rule.id);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition"
                aria-label="Delete rule"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
