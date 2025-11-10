import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function LegacyFundamentalsRedirect() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  useEffect(() => {
    const symbol = (sp.get('symbol') || '').trim().toUpperCase();
    if (symbol) {
      navigate(`/stocks/${symbol}/fundamentals`, { replace: true });
    } else {
      navigate('/stocks', { replace: true });
    }
  }, [navigate, sp]);
  return null;
}
