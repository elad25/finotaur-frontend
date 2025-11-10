import { useState, useEffect } from 'react';

export type PlanType = 'free' | 'pro' | 'elite';

interface UsePlanReturn {
  plan: PlanType;
  addons: string[];
  hasAccess: (requiredPlan?: PlanType, requiredAddon?: string) => boolean;
  updatePlan: (plan: PlanType) => void;
  toggleAddon: (addon: string) => void;
}

const PLAN_HIERARCHY: Record<PlanType, number> = {
  free: 0,
  pro: 1,
  elite: 2,
};

export const usePlan = (): UsePlanReturn => {
  // Mock data - stored in localStorage for persistence
  const [plan, setPlan] = useState<PlanType>(() => {
    const stored = localStorage.getItem('finotaur_plan');
    return (stored as PlanType) || 'free';
  });

  const [addons, setAddons] = useState<string[]>(() => {
    const stored = localStorage.getItem('finotaur_addons');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('finotaur_plan', plan);
  }, [plan]);

  useEffect(() => {
    localStorage.setItem('finotaur_addons', JSON.stringify(addons));
  }, [addons]);

  const hasAccess = (requiredPlan?: PlanType, requiredAddon?: string): boolean => {
    // Check plan requirement
    if (requiredPlan) {
      const currentLevel = PLAN_HIERARCHY[plan];
      const requiredLevel = PLAN_HIERARCHY[requiredPlan];
      if (currentLevel < requiredLevel) return false;
    }

    // Check addon requirement
    if (requiredAddon && !addons.includes(requiredAddon)) {
      return false;
    }

    return true;
  };

  const updatePlan = (newPlan: PlanType) => {
    setPlan(newPlan);
  };

  const toggleAddon = (addon: string) => {
    setAddons((prev) =>
      prev.includes(addon) ? prev.filter((a) => a !== addon) : [...prev, addon]
    );
  };

  return {
    plan,
    addons,
    hasAccess,
    updatePlan,
    toggleAddon,
  };
};
