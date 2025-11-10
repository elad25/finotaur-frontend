// src/components/markets/NewsList.tsx
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type Item = { title: string; link: string; source: string; pubDate?: string };

export const NewsList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((arr) => setItems(Array.isArray(arr) ? arr.slice(0, 10) : []))
      .catch(() => setItems([]));
  }, []);

  return (
    <Card className="rounded-2xl border-border bg-base-800 p-6 shadow-premium">
      <div className="text-sm text-muted-foreground mb-3">Latest Headlines</div>
      <ul className="space-y-2">
        {items.map((n, i) => (
          <li key={i} className="text-sm">
            <a className="hover:underline" href={n.link} target="_blank" rel="noreferrer">
              {n.title} <span className="opacity-60">· {n.source}</span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
};
