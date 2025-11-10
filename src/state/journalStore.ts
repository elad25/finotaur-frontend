import { create } from "zustand";
import { computeRR as smartComputeRR, detectAssetClass, inferDirection } from "@/utils/smartCalc";
import { getStrategyById } from "@/utils/storage";
import type { AssetClass } from "@/utils/smartCalc";

export type Side = "LONG" | "SHORT";

const ASSET_MULTIPLIERS: Record<string, number> = {
  'ES': 50, 'MES': 5, 'NQ': 20, 'MNQ': 2, 'YM': 5,
  'RTY': 50, 'CL': 1000, 'GC': 100, 'SI': 5000,
  'ZB': 1000, 'ZN': 1000,
};

function getAssetMultiplier(symbol: string): number {
  const symbolUpper = symbol.toUpperCase().trim();
  return ASSET_MULTIPLIERS[symbolUpper] || 1;
}

type State = {
  openAt?: string;
  symbol: string;
  assetClass?: AssetClass;
  side: Side;
  quantity: number;
  entryPrice: number;
  stopPrice: number;
  takeProfitPrice?: number;
  exitPrice?: number;
  fees: number;
  feesMode: "auto" | "manual";
  session?: string;
  strategyId?: string;
  strategy?: string;
  setup?: string;
  notes?: string;
  mistake?: string;
  nextTime?: string;
  tags: string[];
  file?: File | null;
  multiplier: number;
  rr: number;
  riskUSD: number;
  rewardUSD: number;
  riskPts: number;
  rewardPts: number;
  user_risk_r?: number;
  user_reward_r?: number;
};

type Actions = {
  setOpenAt: (v?: string) => void;
  setSymbol: (v: string) => void;
  setAssetClass: (v?: AssetClass) => void;
  setSide: (v: Side) => void;
  setQuantity: (v: number) => void;
  setEntryPrice: (v: number) => void;
  setStopPrice: (v: number) => void;
  setTakeProfitPrice: (v?: number) => void;
  setExitPrice: (v?: number) => void;
  setFees: (v: number) => void;
  setFeesMode: (v: "auto" | "manual") => void;
  setSession: (v?: string) => void;
  setStrategy: (v?: string) => void;
  setSetup: (v?: string) => void;
  setNotes: (v?: string) => void;
  setMistake: (v?: string) => void;
  setNextTime: (v?: string) => void;
  toggleTag: (t: string) => void;
  setFile: (f?: File | null) => void;
  setMultiplier: (v: number) => void;
  recompute: () => void;
  payload: () => any;
  loadDraft: () => void;
  saveDraft: () => void;
  clearDraft: () => void;
};

const DRAFT_KEY = "finotaur_journal_draft_v2";

export const useJournalStore = create<State & Actions>((set, get) => ({
  openAt: new Date().toISOString(),
  symbol: "",
  assetClass: undefined,
  side: "LONG",
  quantity: 0,
  entryPrice: 0,
  stopPrice: 0,
  takeProfitPrice: undefined,
  exitPrice: undefined,
  fees: 0,
  feesMode: "auto",
  session: undefined,
  strategyId: undefined,
  strategy: undefined,
  setup: undefined,
  notes: "",
  mistake: "",
  nextTime: "",
  tags: [],
  file: null,
  multiplier: 1,
  rr: 0,
  riskUSD: 0,
  rewardUSD: 0,
  riskPts: 0,
  rewardPts: 0,
  user_risk_r: undefined,
  user_reward_r: undefined,

  setOpenAt: (v) => {
    set({ openAt: v });
    get().recompute();
    get().saveDraft();
  },
  
  setSymbol: (v) => {
    const symbol = v.toUpperCase();
    const assetClass = detectAssetClass(symbol);
    const multiplier = getAssetMultiplier(symbol);
    set({ symbol, assetClass, multiplier });
    get().recompute();
    get().saveDraft();
  },
  
  setAssetClass: (v) => {
    set({ assetClass: v });
    get().recompute();
    get().saveDraft();
  },
  
  setSide: (v) => {
    set({ side: v });
    get().recompute();
    get().saveDraft();
  },
  
  setQuantity: (v) => {
    set({ quantity: v });
    get().recompute();
    get().saveDraft();
  },
  
  setEntryPrice: (v) => {
    set({ entryPrice: v });
    get().recompute();
    get().saveDraft();
  },
  
  setStopPrice: (v) => {
    set({ stopPrice: v });
    get().recompute();
    get().saveDraft();
  },
  
  setTakeProfitPrice: (v) => {
    set({ takeProfitPrice: v });
    get().recompute();
    get().saveDraft();
  },
  
  setExitPrice: (v) => {
    set({ exitPrice: v });
    get().recompute();
    get().saveDraft();
  },
  
  setFees: (v) => {
    set({ fees: v, feesMode: "manual" });
    get().recompute();
    get().saveDraft();
  },
  
  setFeesMode: (v) => {
    set({ feesMode: v });
    get().saveDraft();
  },
  
  setSession: (v) => {
    set({ session: v });
    get().saveDraft();
  },
  
  setStrategy: (v) => {
    if (!v || v === 'none' || v === 'create_new') {
      set({ strategy: undefined, strategyId: undefined });
      get().saveDraft();
      return;
    }
    
    const isUUID = /^[a-f0-9-]{36}$/i.test(v);
    
    if (isUUID) {
      set({ strategyId: v, strategy: v });
    } else {
      set({ strategy: v, strategyId: undefined });
    }
    
    get().saveDraft();
  },
  
  setSetup: (v) => {
    set({ setup: v });
    get().saveDraft();
  },
  
  setNotes: (v) => {
    set({ notes: v });
    get().saveDraft();
  },
  
  setMistake: (v) => {
    set({ mistake: v });
    get().saveDraft();
  },
  
  setNextTime: (v) => {
    set({ nextTime: v });
    get().saveDraft();
  },
  
  toggleTag: (t) => {
    const tags = new Set(get().tags);
    if (tags.has(t)) tags.delete(t);
    else tags.add(t);
    set({ tags: Array.from(tags) });
    get().saveDraft();
  },
  
  setFile: (f) => {
    set({ file: f ?? null });
    get().saveDraft();
  },
  
  setMultiplier: (v) => {
    set({ multiplier: v });
    get().recompute();
    get().saveDraft();
  },

  recompute: () => {
    const s = get();
    const entry = s.entryPrice;
    const stop = s.stopPrice;
    const tp = s.takeProfitPrice || s.exitPrice || 0;
    const qty = s.quantity;
    const mult = s.symbol ? getAssetMultiplier(s.symbol) : s.multiplier;
    
    // Get user's 1R from localStorage
    let oneRValue = 0;
    try {
      const riskSettings = localStorage.getItem('finotaur_risk_settings');
      if (riskSettings) {
        const settings = JSON.parse(riskSettings);
        if (settings.riskMode === 'fixed') {
          oneRValue = settings.riskPerTrade || 0;
        } else {
          oneRValue = (settings.portfolioSize || 0) * ((settings.riskPerTrade || 1) / 100);
        }
      }
    } catch (e) {
      console.warn('Failed to load risk settings:', e);
    }
    
    const detectedSide = inferDirection(entry, stop, tp);
    const side = detectedSide !== "UNKNOWN" ? detectedSide : s.side;
    
    const result = smartComputeRR({
      entry,
      sl: stop,
      tp,
      qty,
      multiplier: mult,
      side,
      assetClass: s.assetClass,
      fees: s.fees,
      oneRValue,
    });
    
    console.log('🔄 Recompute:', {
      symbol: s.symbol,
      multiplier: mult,
      oneR: oneRValue,
      user_risk_r: result.user_risk_r,
      user_reward_r: result.user_reward_r,
    });
    
    set({
      side,
      multiplier: mult,
      rr: result.rr || 0,
      riskUSD: result.riskUSD || 0,
      rewardUSD: result.rewardUSD || 0,
      riskPts: result.riskPts || 0,
      rewardPts: result.rewardPts || 0,
      user_risk_r: result.user_risk_r,
      user_reward_r: result.user_reward_r,
    });
  },

  // 🔥🔥🔥 CRITICAL FIX: Include multiplier in payload!
  payload: () => {
    const s = get();
    
    console.log('📦 Creating payload with multiplier:', s.multiplier);
    
    return {
      open_at: s.openAt,
      symbol: s.symbol,
      asset_class: s.assetClass,
      side: s.side,
      quantity: s.quantity,
      entry_price: s.entryPrice,
      stop_price: s.stopPrice,
      take_profit_price: s.takeProfitPrice,
      exit_price: s.exitPrice,
      fees: s.fees,
      fees_mode: s.feesMode,
      session: s.session,
      strategy_id: s.strategyId,
      setup: s.setup,
      notes: s.notes,
      mistake: s.mistake,
      next_time: s.nextTime,
      tags: s.tags,
      multiplier: s.multiplier, // 🔥 CRITICAL: Include multiplier!
      metrics: {
        rr: s.rr,
        riskUSD: s.riskUSD,
        rewardUSD: s.rewardUSD,
        riskPts: s.riskPts,
        rewardPts: s.rewardPts,
        user_risk_r: s.user_risk_r,
        user_reward_r: s.user_reward_r,
      },
    };
  },

  saveDraft: () => {
    try {
      const s = get();
      const draft = JSON.stringify({
        openAt: s.openAt,
        symbol: s.symbol,
        assetClass: s.assetClass,
        side: s.side,
        quantity: s.quantity,
        entryPrice: s.entryPrice,
        stopPrice: s.stopPrice,
        takeProfitPrice: s.takeProfitPrice,
        exitPrice: s.exitPrice,
        fees: s.fees,
        feesMode: s.feesMode,
        session: s.session,
        strategyId: s.strategyId,
        strategy: s.strategy,
        setup: s.setup,
        notes: s.notes,
        mistake: s.mistake,
        nextTime: s.nextTime,
        tags: s.tags,
        multiplier: s.multiplier,
      });
      
      if (draft.length > 100000) {
        console.warn("Draft too large, skipping save");
        return;
      }
      
      localStorage.setItem(DRAFT_KEY, draft);
    } catch (e) {
      if ((e as any).name === 'QuotaExceededError') {
        localStorage.removeItem(DRAFT_KEY);
      }
      console.warn("Failed to save draft", e);
    }
  },

  loadDraft: () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      
      if (data.strategyId && !data.strategy) {
        const strategyObj = getStrategyById(data.strategyId);
        if (strategyObj) {
          data.strategy = strategyObj.name;
        }
      }
      
      set({ ...data });
      get().recompute();
    } catch (e) {
      console.warn("Failed to load draft", e);
    }
  },

  clearDraft: () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      console.warn("Failed to clear draft", e);
    }
  },
}));