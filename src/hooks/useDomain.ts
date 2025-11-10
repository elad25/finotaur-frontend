import { useLocation } from 'react-router-dom';
import { domains } from '@/constants/nav';

export const useDomain = () => {
  const location = useLocation();
  
  // Extract domain from path (e.g., /app/stocks/overview -> stocks)
  const pathParts = location.pathname.split('/').filter(Boolean);
  const domainId = pathParts[1]; // Second part after /app
  
  const activeDomain = domainId && domains[domainId] ? domains[domainId] : domains['all-markets'];
  
  return {
    activeDomain,
    domainId: activeDomain.id,
    isActive: (path: string) => location.pathname === path,
  };
};