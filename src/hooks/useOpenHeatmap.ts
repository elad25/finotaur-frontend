import { useNavigate } from 'react-router-dom';
import type { MarketKey } from '../types/heatmap';

export function useOpenHeatmap() {
  const navigate = useNavigate();
  return (m: MarketKey) => navigate(`/app/all-markets/heatmap?m=${m}`);
}
