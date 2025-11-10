// src/components/ui/chart.tsx (keys made stable — no NaN)
import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> });
};

type ChartContextProps = {
  config: ChartConfig;
  // other props omitted for brevity
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

export function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used within Chart");
  return ctx;
}

// Re-export recharts with minimal wrappers (omitted) ...

// SAFETY PATCH: wherever we create lists, ensure keys are NOT raw numeric values.
// Example (pseudo):
// {items.map((item, i) => <Something key={`${item.dataKey || item.name || i}`} ... />)}
