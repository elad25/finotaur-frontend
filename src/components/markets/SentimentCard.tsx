// src/components/markets/SentimentCard.tsx
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

export const SentimentCard: React.FC = () => {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/sentiment/fear-greed")
      .then((r) => r.json())
      .then((d) => setValue(d?.value ?? null))
      .catch(() => setValue(null));
  }, []);
  return (
    <Card className="rounded-2xl border-border bg-base-800 p-6 shadow-premium">
      <div className="text-sm text-muted-foreground">Global Sentiment (Crypto F&G)</div>
      <div className="mt-2 text-3xl font-bold">{value ?? "—"}</div>
    </Card>
  );
};
