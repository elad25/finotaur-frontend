import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

export default function LegacyFundamentalsRedirectToSummary() {
  const navigate = useNavigate();
  const { symbol: symbolFromPath } = useParams();
  const [sp] = useSearchParams();

  useEffect(() => {
    const symbol = (symbolFromPath || sp.get('symbol') || '').trim().toUpperCase();
    if (symbol) {
      navigate(`/stocks/${symbol}?tab=fundamentals`, { replace: true });
    } else {
      navigate('/stocks', { replace: true });
    }
  }, [navigate, symbolFromPath, sp]);
  return null;
}
