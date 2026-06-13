// src/lib/fino/screenshotTrade.ts
// Helpers for the FINO "screenshot → trade" flow:
//   1. compressImageFile  — client-side canvas resize/compress before sending to AI
//   2. buildCompletedTradePayload — convert extracted+confirmed fields into a
//      createTrade()-compatible payload, replicating journalStore's recompute() logic.

import { computeRR } from '@/utils/smartCalc';
import { getAssetMultiplier } from '@/utils/tradeCalculations';
import type { AssetClass } from '@/utils/smartCalc';
import { normalizeAssetClass } from '@/utils/assetClass';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw asset-class labels the server extraction can return. */
export type ExtractedAssetClass =
  | 'stock'
  | 'etf'
  | 'futures'
  | 'options'
  | 'crypto'
  | 'forex';

/** Form fields the user may edit in FinoTradeConfirmCard. */
export interface TradeConfirmFields {
  symbol: string;
  side: 'LONG' | 'SHORT';
  asset_class: ExtractedAssetClass | string;
  entry_price: number | null;
  exit_price: number | null;
  stop_price: number | null;
  take_profit_price: number | null;
  quantity: number | null;
  fees?: number | null;
}

// ---------------------------------------------------------------------------
// normalizeAssetClass — mirrors journalStore.normalizeAssetClass exactly,
// mapping singular/canonical labels to the plural form smartCalc expects.
// ---------------------------------------------------------------------------

function normalizeToCalcClass(raw: string | undefined | null): AssetClass {
  if (!raw) return 'stocks';
  const n = raw.toLowerCase().trim();
  if (n === 'stock' || n === 'stocks' || n === 'equity' || n === 'equities' || n === 'shares' || n === 'stk') return 'stocks';
  if (n === 'future' || n === 'futures' || n === 'fut') return 'futures';
  if (n === 'option' || n === 'options' || n === 'opt') return 'options';
  if (n === 'forex' || n === 'fx' || n === 'cash') return 'forex';
  if (n === 'crypto' || n === 'perp' || n === 'perpetual' || n === 'coin') return 'crypto';
  // etf → treated as stocks for multiplier/computation purposes
  if (n === 'etf' || n === 'etfs') return 'stocks';
  return 'stocks';
}

// ---------------------------------------------------------------------------
// compressImageFile
// ---------------------------------------------------------------------------

/**
 * Compress a File (PNG/JPEG/WebP) client-side so the longest edge ≤ 1568px,
 * then export as JPEG at quality 0.85.
 * Returns the raw base64 string (no data-URL prefix) + mediaType.
 */
export async function compressImageFile(
  file: File,
): Promise<{ imageBase64: string; mediaType: 'image/jpeg' }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to load image'));

      img.onload = () => {
        const MAX_EDGE = 1568;
        let { width, height } = img;

        if (width > height) {
          if (width > MAX_EDGE) {
            height = Math.round((height * MAX_EDGE) / width);
            width = MAX_EDGE;
          }
        } else {
          if (height > MAX_EDGE) {
            width = Math.round((width * MAX_EDGE) / height);
            height = MAX_EDGE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas 2D context'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        // Strip "data:image/jpeg;base64," prefix
        const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');

        // Release canvas memory
        canvas.width = 0;
        canvas.height = 0;

        resolve({ imageBase64: base64, mediaType: 'image/jpeg' });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// buildCompletedTradePayload
// ---------------------------------------------------------------------------

/**
 * Convert user-confirmed extraction fields into a payload object suitable for
 * `createTrade()`. Replicates journalStore's `recompute()` logic without
 * touching global store state.
 */
export function buildCompletedTradePayload(
  fields: TradeConfirmFields,
  screenshotUrl: string | null,
): Record<string, unknown> {
  const symbol = (fields.symbol || '').toUpperCase().trim();
  const side = fields.side === 'SHORT' ? 'SHORT' : 'LONG';
  const assetClass = normalizeToCalcClass(fields.asset_class);
  const entry = Number(fields.entry_price ?? 0);
  const exit = Number(fields.exit_price ?? 0);
  const stop = Number(fields.stop_price ?? 0);
  const tp = Number(fields.take_profit_price ?? 0);
  const qty = Number(fields.quantity ?? 0);
  const fees = Number(fields.fees ?? 0);

  const multiplier = getAssetMultiplier(symbol, assetClass);

  // Load oneRValue from localStorage, same logic as journalStore recompute()
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
  } catch {
    // silently ignore — oneRValue stays 0
  }

  // Compute risk / reward from planned levels
  const rrResult = computeRR({
    entry,
    sl: stop,
    tp: tp || exit, // fall back to exit if no explicit TP
    qty,
    multiplier,
    side,
    assetClass,
    fees,
    oneRValue,
  });

  // Actual completed-trade P&L
  const priceChange = side === 'LONG' ? exit - entry : entry - exit;
  const grossPnl = priceChange * qty * multiplier;
  const pnl = grossPnl - fees;

  const outcome: 'WIN' | 'LOSS' | 'BE' =
    pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE';

  const actual_r =
    rrResult.riskUSD > 0 ? pnl / rrResult.riskUSD : null;

  const actual_user_r =
    oneRValue > 0 ? pnl / oneRValue : null;

  const now = new Date().toISOString();

  return {
    symbol,
    side,
    quantity: qty,
    entry_price: entry,
    exit_price: exit || null,
    stop_price: stop,
    take_profit_price: tp || null,
    fees,
    asset_class: normalizeAssetClass(fields.asset_class) ?? fields.asset_class ?? null,
    multiplier,
    risk_usd: rrResult.riskUSD || null,
    reward_usd: rrResult.rewardUSD || null,
    user_risk_r: rrResult.user_risk_r ?? null,
    user_reward_r: rrResult.user_reward_r ?? null,
    rr: rrResult.rr || null,
    pnl,
    outcome,
    actual_r,
    actual_user_r,
    open_at: now,
    close_at: now,
    screenshots: screenshotUrl ? [screenshotUrl] : [],
    broker: 'manual',
    import_source: 'api',
    input_mode: 'summary',
    // Nullable optional fields
    session: null,
    strategy_id: null,
    setup: null,
    notes: null,
    mistake: null,
    next_time: null,
    tags: [],
    fees_mode: 'manual',
  };
}
