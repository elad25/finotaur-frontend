
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFundamentals, TF } from '../../hooks/useFundamentals';

export default function DebugFundamentalsProbe(){
  const [params] = useSearchParams();
  const symbol = (params.get('symbol') || params.get('ticker') || 'MSFT').toUpperCase();
  const tf = ((params.get('tf') as TF) || 'TTM');
  const periods = (Number(params.get('periods')) === 5 ? 5 : 10) as 5|10;

  const { data, isLoading, isError, error } = useFundamentals(symbol, tf, periods);
  if (typeof window !== 'undefined') (window as any).__finotaur_fund__ = data;

  return (
    <div className="rounded-xl border border-amber-600 bg-amber-950/40 text-amber-200 text-xs p-2">
      <div><b>Fundamentals Debug</b> — symbol={symbol} tf={tf} periods={periods}</div>
      {isLoading && <div>Loading...</div>}
      {isError && <div>Error: {String((error as Error)?.message || '')}</div>}
      {data && (
        <div className="flex flex-wrap gap-2">
          <span>kpis: {Object.keys(data.kpis || {}).length}</span>
          <span>trends: {Object.keys(data.trends || {}).length}</span>
          <span>valuation.multiples: {data.valuation?.multiples?.length ?? 0}</span>
          <span>peers: {data.peers?.tickers?.length ?? 0}</span>
          <span>health: {data.health ? 'yes' : 'no'}</span>
          <span>context: {data.context ? 'yes' : 'no'}</span>
        </div>
      )}
    </div>
  );
}
