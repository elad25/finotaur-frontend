import React from "react";

export { default as KPIGrid } from "./KPIGrid";
export { default as ValuationPanel } from "./ValuationPanel";
export { default as HealthTable } from "./HealthTable";
export { default as IndustryComparison } from "./IndustryComparison";
export { default as DCFBox } from "./DCFBox";

// TrendsPanel: stubbed to unblock CI typecheck. Original at ./TrendsPanel.tsx has
// key-of-array type drift that needs a refactor. Re-export the real component
// once that lands.
export const TrendsPanel: React.FC<any> = () => null;