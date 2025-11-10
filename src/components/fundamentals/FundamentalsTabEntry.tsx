
// Render the page-level Fundamentals so the hook runs.
import React from "react";
import FundamentalsPage from "@/pages/app/stocks/Fundamentals";
import { useSearchParams } from "react-router-dom";

export default function FundamentalsTabEntry() {
  const [sp, setSp] = useSearchParams();
  React.useEffect(()=>{
    const s = (sp.get('symbol') || sp.get('ticker') || '').toUpperCase();
    if (s) { sp.set('symbol', s); setSp(sp, { replace:true }); }
  }, []);
  return <FundamentalsPage />;
}
