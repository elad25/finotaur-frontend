import { createContext, useContext, ReactNode } from 'react';
import { useTimezoneSettings } from '@/hooks/useTimezoneSettings';

const TimezoneContext = createContext<string>('system');

export const TimezoneProvider = ({ children }: { children: ReactNode }) => {
  const { timezone } = useTimezoneSettings();
  
  return (
    <TimezoneContext.Provider value={timezone}>
      {children}
    </TimezoneContext.Provider>
  );
};

export const useTimezone = () => useContext(TimezoneContext);