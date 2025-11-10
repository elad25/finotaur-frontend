// src/components/fundamentals/FundamentalsTab.tsx
import React from "react";
import { useFundamentals } from "../../hooks/useFundamentals";
import { SnapshotKPIs } from "./SnapshotKPIs";
import { FinancialTrends } from "./FinancialTrends";
import { KeyRatiosTable } from "./KeyRatiosTable";
import { ValuationSection } from "./ValuationSection";
import { IndustryComparison } from "./IndustryComparison";
import { CompanyContextFooter } from "./CompanyContextFooter";

export const FundamentalsTab: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { data, loading, error } = useFundamentals(symbol);

  return (
    <div className="space-y-6">
      {error && <div className="text-red-400 text-sm">Error: {error}</div>}

      {/* Insight Row */}
      <ValuationSection data={data} loading={loading} />

      {/* KPIs */}
      <SnapshotKPIs data={data} loading={loading} />

      {/* Trends */}
      <FinancialTrends data={data} loading={loading} />

      {/* Ratios Table */}
      <KeyRatiosTable data={data} loading={loading} />

      {/* Industry comps */}
      <IndustryComparison data={data} loading={loading} />

      {/* Context */}
      <CompanyContextFooter data={data} />
    </div>
  );
};

export default FundamentalsTab;