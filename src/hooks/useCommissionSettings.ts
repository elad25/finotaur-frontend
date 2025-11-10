// src/hooks/useCommissionSettings.ts
// ✅ Uses the unified useRiskSettings hook

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useCommissions, CommissionSettings } from '@/hooks/useRiskSettings';

type CommissionType = 'percentage' | 'flat';

export interface Commission {
  value: string;
  type: CommissionType;
}

// ============================================
// Hook לניהול Commission Settings
// ============================================
export function useCommissionSettings() {
  // ✅ Use the unified hook instead of localStorage functions
  const { commissions: initialCommissions, updateCommissions, isUpdating } = useCommissions();
  
  // Local state for form editing
  const [commissions, setCommissions] = useState<CommissionSettings>(initialCommissions);

  // Sync with server state when it changes
  useState(() => {
    setCommissions(initialCommissions);
  });

  // עדכון ערך של נכס ספציפי
  const updateCommission = useCallback((asset: keyof CommissionSettings, value: string) => {
    setCommissions(prev => ({
      ...prev,
      [asset]: { ...prev[asset], value },
    }));
  }, []);

  // עדכון סוג (percentage/flat) של נכס ספציפי
  const updateCommissionType = useCallback((asset: keyof CommissionSettings, type: CommissionType) => {
    setCommissions(prev => ({
      ...prev,
      [asset]: { ...prev[asset], type },
    }));
  }, []);

  // שמירה ל-Supabase
  const saveSettings = useCallback(() => {
    try {
      updateCommissions(commissions);
      return true;
    } catch (error) {
      toast.error('Failed to save settings');
      console.error(error);
      return false;
    }
  }, [commissions, updateCommissions]);

  // איפוס להגדרות ברירת מחדל
  const resetToDefaults = useCallback(() => {
    const defaults: CommissionSettings = {
      stocks: { value: '0.1', type: 'percentage' },
      crypto: { value: '0.2', type: 'percentage' },
      futures: { value: '2.0', type: 'flat' },
      forex: { value: '0.0', type: 'percentage' },
      commodities: { value: '0.3', type: 'percentage' },
      options: { value: '0.65', type: 'flat' },
    };
    setCommissions(defaults);
  }, []);

  return {
    commissions,
    updateCommission,
    updateCommissionType,
    saveSettings: saveSettings,
    resetToDefaults,
    isUpdating,
  };
}