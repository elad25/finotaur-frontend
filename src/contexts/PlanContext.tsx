import { createContext, useContext, useState, ReactNode } from "react";

export type PlanType = "basic" | "pro" | "elite";

interface PlanContextType {
  currentPlan: PlanType;
  setPlan: (plan: PlanType) => void;
  canAccess: (feature: string) => boolean;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const planFeatures = {
  basic: {
    watchlists: 1,
    symbolsPerWatchlist: 15,
    alertsPerSymbol: 2,
    multiChart: false,
    advancedScreener: false,
    options: false,
    aiAnalysis: false,
    earningsSummaries: false,
    trackInvestors: false,
    roadmapVoting: false,
  },
  pro: {
    watchlists: 5,
    symbolsPerWatchlist: 50,
    alertsPerSymbol: 10,
    multiChart: true,
    advancedScreener: true,
    options: false,
    aiAnalysis: true,
    earningsSummaries: true,
    trackInvestors: false,
    roadmapVoting: false,
  },
  elite: {
    watchlists: 999,
    symbolsPerWatchlist: 999,
    alertsPerSymbol: 999,
    multiChart: true,
    advancedScreener: true,
    options: true,
    aiAnalysis: true,
    earningsSummaries: true,
    trackInvestors: true,
    roadmapVoting: true,
  },
};

export const PlanProvider = ({ children }: { children: ReactNode }) => {
  const [currentPlan, setCurrentPlan] = useState<PlanType>(() => {
    const saved = localStorage.getItem("traderhub_plan") as PlanType;
    return saved || "basic";
  });

  const setPlan = (plan: PlanType) => {
    setCurrentPlan(plan);
    localStorage.setItem("traderhub_plan", plan);
  };

  const canAccess = (feature: string): boolean => {
    const features = planFeatures[currentPlan];
    const value = features[feature as keyof typeof features];
    return value === true || (typeof value === "number" && value > 0);
  };

  return (
    <PlanContext.Provider value={{ currentPlan, setPlan, canAccess }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return context;
};
