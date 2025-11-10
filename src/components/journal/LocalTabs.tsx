import React, { useState } from "react";

export interface LocalTabItem {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface Props {
  items: LocalTabItem[];
  pillClass?: string;
  pillClassActive?: string;
}

export default function LocalTabs({ items = [], pillClass = "", pillClassActive = "" }: Props) {
  const [active, setActive] = useState(items[0]?.key ?? "");
  const cls = (k: string) =>
    `px-3 py-1.5 rounded-full text-sm transition ${active === k ? (pillClassActive || "bg-yellow-600/25 text-yellow-100 border border-yellow-500/40") : (pillClass || "text-zinc-300 hover:bg-zinc-800")}`;

  const activeContent = items.find(i => i.key === active)?.content ?? null;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {items.map(it => (
          <button type="button" key={it.key} className={cls(it.key)} onClick={() => setActive(it.key)}>
            {it.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {activeContent}
      </div>
    </div>
  );
}
