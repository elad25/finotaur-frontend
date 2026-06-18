import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function LegacyFundamentalsRedirect() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  useEffect(() => {
    const symbol = (sp.get('symbol') || '').trim().toUpperCase();
    if (symbol) {
      navigate(`/app/stocks/overview?symbol=${symbol}`, { replace: true });
    } else {
      navigate('/app/stocks/overview', { replace: true });
    }
  }, [navigate, sp]);
  return null;
}
