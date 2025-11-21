import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { 
  getCurrentTradingSession, 
  formatSessionDisplay, 
  getSessionColor 
} from '@/constants/tradingSessions';

export default function TradingSessionIndicator() {
  const [currentSession, setCurrentSession] = useState(getCurrentTradingSession());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSession(getCurrentTradingSession());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${getSessionColor(currentSession)}`}>
      <Clock className="w-3.5 h-3.5" />
      <span>Current: {formatSessionDisplay(currentSession)}</span>
    </div>
  );
}