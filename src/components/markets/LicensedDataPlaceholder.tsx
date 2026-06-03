// src/components/markets/LicensedDataPlaceholder.tsx
// Shown in place of raw Polygon price/chart/quote widgets when
// MARKET_DATA_LICENSED = false.  Flip that flag when the redistribution
// license ($2k/mo) is in place and this component is no longer rendered.

import React from "react";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ds/Card";

interface Props {
  /** Optional height so the placeholder fills the same space as the gated widget. */
  minHeight?: number | string;
}

const LicensedDataPlaceholder: React.FC<Props> = ({ minHeight = 120 }) => (
  <Card
    variant="default"
    padding="default"
    className="flex flex-col items-center justify-center gap-3 text-center w-full"
    style={{ minHeight }}
  >
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gold-primary/10 text-gold-primary">
      <BarChart3 className="w-5 h-5" />
    </div>
    <div>
      <p className="text-sm font-semibold text-ink-primary">
        Live market data &amp; charts coming soon
      </p>
      <p className="text-xs text-ink-muted mt-1 max-w-xs">
        Real-time price feeds and interactive charts are being enabled.
        Check back shortly.
      </p>
    </div>
  </Card>
);

export default LicensedDataPlaceholder;
export { LicensedDataPlaceholder };
