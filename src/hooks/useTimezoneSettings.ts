// src/hooks/useTimezoneSettings.ts
// ✅ NEW: Hook for timezone settings
import { useState } from 'react';
import { toast } from 'sonner';

export function useTimezoneSettings() {
  const [timezone, setTimezone] = useState('system');

  const updateTimezone = (newTimezone: string) => {
    setTimezone(newTimezone);
  };

  const saveTimezone = () => {
    // Save to localStorage or backend
    localStorage.setItem('user-timezone', timezone);
    toast.success('Timezone saved successfully!');
  };

  return {
    timezone,
    updateTimezone,
    saveTimezone, // ✅ FIXED: Added missing function
  };
}