import { useSearchParams, useParams } from 'react-router-dom';

export function useSymbol() {
  const [sp] = useSearchParams();
  const { symbol: symbolFromPath } = useParams();
  const symbol = (symbolFromPath || sp.get('symbol') || '').trim().toUpperCase();
  return symbol;
}
