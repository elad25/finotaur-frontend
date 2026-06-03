// ================================================
// FIXED JOURNAL STORE - FULL DB SYNC
// File: src/state/journalStore.ts
// ✅ All fields match database schema
// ✅ Session normalization
// ✅ actual_user_r calculation
// ✅ close_at handling
// ✅ broker & import_source defaults
// ✅ No metrics wrapper (flattened)
// 🔥 FIX: assetClass fallback in recompute()
// 🔥 FIX: Normalize "stock" → "stocks" for consistency
// ================================================

import { create } from "zustand";
import { computeRR as smartComputeRR, detectAssetClass, inferDirection } from "@/utils/smartCalc";
import { getStrategyById } from "@/utils/storage";
import type { AssetClass } from "@/utils/smartCalc";
import { getAssetMultiplier, computeLiquidationPrice, getPipSize, parseForexPair, computeQuoteRate } from "@/utils/tradeCalculations";

export type Side = "LONG" | "SHORT";

// 🔥 FIX: Normalize assetClass to ensure consistency
function normalizeAssetClass(assetClass: string | undefined): AssetClass | undefined {
  if (!assetClass) return undefined;
  
  const normalized = assetClass.toLowerCase().trim();
  
  // Handle singular/plural variations
  if (normalized === 'stock') return 'stocks';
  if (normalized === 'future') return 'futures';
  if (normalized === 'option') return 'options';
  
  // Return as-is if already valid
  if (['stocks', 'futures', 'forex', 'crypto', 'options'].includes(normalized)) {
    return normalized as AssetClass;
  }
  
  return undefined;
}

type State = {
  // Core trade fields (match DB)
  openAt?: string;
  closeAt?: string;
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

  // Calculated fields (match DB columns)
  multiplier: number;
  rr: number;
  riskUSD: number;
  rewardUSD: number;
  riskPts: number;
  rewardPts: number;

  // R-multiple fields (all 4 - match DB!)
  actualR?: number;
  userRiskR?: number;
  userRewardR?: number;
  actualUserR?: number;

  // Media
  file?: File | null;
  screenshotFiles?: File[];
  screenshotUrls?: string[];

  // Meta (for frontend tracking)
  broker: string;
  importSource: string;

  // Asset-class-specific fields (DB columns)
  optionType?: 'CALL' | 'PUT';
  strikePrice?: number;
  expirationDate?: string;
  leverage?: number;
  positionType?: 'Spot' | 'Perpetual';
  fundingPaid?: number;
  lotSize?: number;
  accountCurrency?: string;
  quoteRate?: number;
};

type Actions = {
  setOpenAt: (v?: string) => void;
  setCloseAt: (v?: string) => void;
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
  setScreenshotFiles: (files: File[]) => void;
  setScreenshotUrls: (urls: string[]) => void;
  setMultiplier: (v: number) => void;
  // Asset-class-specific setters
  setOptionType: (v?: 'CALL' | 'PUT') => void;
  setStrikePrice: (v?: number) => void;
  setExpirationDate: (v?: string) => void;
  setLeverage: (v?: number) => void;
  setPositionType: (v?: 'Spot' | 'Perpetual') => void;
  setFundingPaid: (v?: number) => void;
  setLotSize: (v?: number) => void;
  setAccountCurrency: (v?: string) => void;
  setQuoteRate: (v?: number) => void;
  recompute: () => void;
  payload: () => TradePayload;
  loadDraft: () => void;
  saveDraft: () => void;
  clearDraft: () => void;
};

// 🔥 TYPED PAYLOAD - matches DB schema exactly!
export interface TradePayload {
  symbol: string;
  side: Side;
  quantity: number;
  entry_price: number;
  stop_price: number;
  open_at: string | null;
  close_at: string | null;
  asset_class: AssetClass | null;
  take_profit_price: number | null;
  exit_price: number | null;
  fees: number;
  fees_mode: string;
  session: string | null;
  strategy_id: string | null;
  setup: string | null;
  notes: string | null;
  mistake: string | null;
  next_time: string | null;
  tags: string[];
  multiplier: number;
  rr: number | null;
  risk_usd: number | null;
  reward_usd: number | null;
  risk_pts: number | null;
  reward_pts: number | null;
  actual_r: number | null;
  user_risk_r: number | null;
  user_reward_r: number | null;
  actual_user_r: number | null;
  screenshots: string[];
  broker: string;
  import_source: string;
  outcome?: 'WIN' | 'LOSS' | 'BE' | 'OPEN';
  pnl?: number | null;
  // Asset-class-specific fields
  option_type?: 'CALL' | 'PUT' | null;
  strike_price?: number | null;
  expiration_date?: string | null;
  leverage?: number | null;
  position_type?: 'Spot' | 'Perpetual' | null;
  funding_paid?: number | null;
  lot_size?: number | null;
  account_currency?: string | null;
  quote_rate?: number | null;
  liquidation_price?: number | null;
  pip_size?: number | null;
  base_currency?: string | null;
  quote_currency?: string | null;
}

const DRAFT_KEY = "finotaur_journal_draft_v5"; // 🔥 Bumped version for fix

const VALID_SESSIONS = ['asia', 'london', 'newyork'];

function normalizeSession(session: string | undefined | null): string | null {
  if (!session || session.trim() === '') {
    return null;
  }
  
  const normalized = session.trim().toLowerCase();
  
  if (VALID_SESSIONS.includes(normalized)) {
    return normalized;
  }
  
  console.warn('⚠️ Invalid session value:', session, '→ using null');
  return null;
}

function toNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

export const useJournalStore = create<State & Actions>((set, get) => ({
  // Initial state
  openAt: new Date().toISOString(),
  closeAt: undefined,
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
  screenshotFiles: [],
  screenshotUrls: [],
  multiplier: 1,
  rr: 0,
  riskUSD: 0,
  rewardUSD: 0,
  riskPts: 0,
  rewardPts: 0,
  actualR: undefined,
  userRiskR: undefined,
  userRewardR: undefined,
  actualUserR: undefined,
  broker: 'manual',
  importSource: 'manual',

  // Asset-class-specific initial values
  optionType: undefined,
  strikePrice: undefined,
  expirationDate: undefined,
  leverage: undefined,
  positionType: undefined,
  fundingPaid: undefined,
  lotSize: undefined,
  accountCurrency: undefined,
  quoteRate: undefined,

  // Setters
  setOpenAt: (v) => {
    set({ openAt: v });
    get().recompute();
    get().saveDraft();
  },
  
  setCloseAt: (v) => {
    set({ closeAt: v });
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
  
  // 🔥 FIX: Normalize assetClass when setting
  setAssetClass: (v) => {
    const normalized = v ? normalizeAssetClass(v as string) : undefined;
    set({ assetClass: normalized });
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
    if (v && v > 0) {
      set({ closeAt: new Date().toISOString() });
    } else {
      set({ closeAt: undefined });
    }
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
  
  setScreenshotFiles: (files) => {
    set({ screenshotFiles: files });
    get().saveDraft();
  },
  
  setScreenshotUrls: (urls) => {
    set({ screenshotUrls: urls });
    get().saveDraft();
  },
  
  setMultiplier: (v) => {
    set({ multiplier: v });
    get().recompute();
    get().saveDraft();
  },

  setOptionType: (v) => { set({ optionType: v }); get().saveDraft(); },
  setStrikePrice: (v) => { set({ strikePrice: v }); get().saveDraft(); },
  setExpirationDate: (v) => { set({ expirationDate: v }); get().saveDraft(); },
  setLeverage: (v) => { set({ leverage: v }); get().saveDraft(); },
  setPositionType: (v) => { set({ positionType: v }); get().saveDraft(); },
  setFundingPaid: (v) => { set({ fundingPaid: v }); get().saveDraft(); },
  setLotSize: (v) => { set({ lotSize: v }); get().saveDraft(); },
  setAccountCurrency: (v) => { set({ accountCurrency: v }); get().saveDraft(); },
  setQuoteRate: (v) => { set({ quoteRate: v }); get().saveDraft(); },

  // 🔥🔥🔥 RECOMPUTE - FIXED VERSION 🔥🔥🔥
  recompute: () => {
    const s = get();
    const entry = s.entryPrice;
    const stop = s.stopPrice;
    const tp = s.takeProfitPrice || s.exitPrice || 0;
    const qty = s.quantity;
    const mult = s.symbol ? getAssetMultiplier(s.symbol) : s.multiplier;
    
    // 🔥 FIX: Normalize and ensure assetClass is ALWAYS set
    const rawAssetClass = s.assetClass || detectAssetClass(s.symbol);
    const assetClass = normalizeAssetClass(rawAssetClass as string) || "stocks";
    
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
    
    // 🔥 FIX: Use current side if direction can't be inferred (no TP yet)
    const detectedSide = inferDirection(entry, stop, tp);
    const side = detectedSide !== "UNKNOWN" ? detectedSide : s.side;
    
    // 🔥 FIX: Pass the guaranteed normalized assetClass
    const result = smartComputeRR({
      entry,
      sl: stop,
      tp,
      qty,
      multiplier: mult,
      side,
      assetClass,  // 🔥 Now ALWAYS normalized ("stocks" not "stock")!
      fees: s.fees,
      oneRValue,
    });
    
    // 🔥 Calculate actual_user_r when trade has exit price
    let actualUserR: number | undefined = undefined;
    if (s.exitPrice && s.exitPrice > 0 && oneRValue > 0) {
      const priceChange = side === "LONG" 
        ? s.exitPrice - entry
        : entry - s.exitPrice;
      const grossPnL = priceChange * qty * mult;
      const netPnL = grossPnL - s.fees;
      actualUserR = netPnL / oneRValue;
    }
    
    // 🔥 FIX: Update state with normalized assetClass
    set({
      side,
      multiplier: mult,
      assetClass,  // 🔥 Always normalized!
      rr: result.rr || 0,
      riskUSD: result.riskUSD || 0,
      rewardUSD: result.rewardUSD || 0,
      riskPts: result.riskPts || 0,
      rewardPts: result.rewardPts || 0,
      userRiskR: result.user_risk_r,
      userRewardR: result.user_reward_r,
      actualUserR: actualUserR,
    });
  },

  // PAYLOAD - FULLY SYNCED WITH DB SCHEMA
  payload: (): TradePayload => {
    const s = get();
    const normalizedSession = normalizeSession(s.session);
    
    // 🔥 FIX: Ensure assetClass in payload is normalized
    const rawAssetClass = s.assetClass || detectAssetClass(s.symbol);
    const assetClass = normalizeAssetClass(rawAssetClass as string) || "stocks";
    
    return {
      symbol: s.symbol,
      side: s.side,
      quantity: s.quantity,
      entry_price: s.entryPrice,
      stop_price: s.stopPrice,
      open_at: s.openAt || new Date().toISOString(),
      close_at: s.exitPrice && s.exitPrice > 0 ? (s.closeAt || new Date().toISOString()) : null,
      asset_class: assetClass,  // 🔥 Always normalized!
      take_profit_price: toNull(s.takeProfitPrice) || null,
      exit_price: s.exitPrice && s.exitPrice > 0 ? s.exitPrice : null,
      fees: s.fees || 0,
      fees_mode: s.feesMode,
      session: normalizedSession,
      strategy_id: toNull(s.strategyId),
      setup: toNull(s.setup) || null,
      notes: s.notes || null,
      mistake: s.mistake || null,
      next_time: s.nextTime || null,
      tags: s.tags || [],
      multiplier: s.multiplier || 1,
      rr: s.rr || null,
      risk_usd: s.riskUSD || null,
      reward_usd: s.rewardUSD || null,
      risk_pts: s.riskPts || null,
      reward_pts: s.rewardPts || null,
      actual_r: null,
      user_risk_r: toNull(s.userRiskR),
      user_reward_r: toNull(s.userRewardR),
      actual_user_r: toNull(s.actualUserR),
      screenshots: s.screenshotUrls || [],
      broker: s.broker || 'manual',
      import_source: s.importSource || 'manual',
      // Asset-class-specific fields — only set when relevant
      option_type: assetClass === 'options' ? (s.optionType ?? null) : null,
      strike_price: assetClass === 'options' ? (s.strikePrice ?? null) : null,
      expiration_date: assetClass === 'options' ? (s.expirationDate ?? null) : null,
      leverage: assetClass === 'crypto' ? (s.leverage ?? null) : null,
      position_type: assetClass === 'crypto' ? (s.positionType ?? null) : null,
      funding_paid: (assetClass === 'crypto' && s.positionType === 'Perpetual') ? (s.fundingPaid ?? null) : null,
      lot_size: assetClass === 'forex' ? (s.lotSize ?? null) : null,
      account_currency: assetClass === 'forex' ? (s.accountCurrency ?? 'USD') : null,
      quote_rate: assetClass === 'forex'
        ? computeQuoteRate({ symbol: s.symbol, accountCurrency: s.accountCurrency, current: s.quoteRate })
        : null,
      liquidation_price: assetClass === 'crypto'
        ? computeLiquidationPrice({ entryPrice: s.entryPrice, leverage: s.leverage, side: s.side })
        : null,
      pip_size: assetClass === 'forex' ? getPipSize(s.symbol) : null,
      base_currency: assetClass === 'forex' ? parseForexPair(s.symbol).base : null,
      quote_currency: assetClass === 'forex' ? parseForexPair(s.symbol).quote : null,
    };
  },

  saveDraft: () => {
    try {
      const s = get();
      const draft = JSON.stringify({
        openAt: s.openAt,
        closeAt: s.closeAt,
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
        screenshotUrls: s.screenshotUrls,
        broker: s.broker,
        importSource: s.importSource,
        optionType: s.optionType,
        strikePrice: s.strikePrice,
        expirationDate: s.expirationDate,
        leverage: s.leverage,
        positionType: s.positionType,
        fundingPaid: s.fundingPaid,
        lotSize: s.lotSize,
        accountCurrency: s.accountCurrency,
        quoteRate: s.quoteRate,
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

  // 🔥 FIX: Normalize assetClass when loading draft
  loadDraft: () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      
      // 🔥 Normalize assetClass from old drafts
      if (data.assetClass) {
        data.assetClass = normalizeAssetClass(data.assetClass);
      }
      
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
      
      set({
        openAt: new Date().toISOString(),
        closeAt: undefined,
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
        screenshotFiles: [],
        screenshotUrls: [],
        multiplier: 1,
        rr: 0,
        riskUSD: 0,
        rewardUSD: 0,
        riskPts: 0,
        rewardPts: 0,
        actualR: undefined,
        userRiskR: undefined,
        userRewardR: undefined,
        actualUserR: undefined,
        broker: 'manual',
        importSource: 'manual',
        optionType: undefined,
        strikePrice: undefined,
        expirationDate: undefined,
        leverage: undefined,
        positionType: undefined,
        fundingPaid: undefined,
        lotSize: undefined,
        accountCurrency: undefined,
        quoteRate: undefined,
      });
    } catch (e) {
      console.warn("Failed to clear draft", e);
    }
  },
}));