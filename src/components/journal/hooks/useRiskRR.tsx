import { useEffect, useMemo, useState } from 'react';
import { classifyAsset, futuresMetaFor, AssetType } from '../assetMeta';

type RR = {
  direction: 'LONG'|'SHORT'|'';
  rr: number;
  riskDollar: number;
  rewardDollar: number;
  riskPoints: number;
  rewardPoints: number;
  unitLabel: string;
  assetType: AssetType;
};

function toNum(v: any): number { const n = parseFloat(String(v ?? '')); return Number.isFinite(n) ? n : 0; }

export function useRiskRR(fields: {
  symbol: string;
  quantity?: number;
  contracts?: number;
  lotSize?: number;
  entry?: number;
  stop?: number;
  takeProfit?: number;
  optionPremium?: number;
  cryptoPricePerCoin?: number;
}): RR {
  const [fxUsd] = useState(1);

  const assetType = useMemo(() => classifyAsset(fields.symbol), [fields.symbol]);

  const res = useMemo<RR>(() => {
    const entry = toNum(fields.entry);
    const stop = toNum(fields.stop);
    const tp = toNum(fields.takeProfit);

    let direction: RR['direction'] = '';
    if (tp && entry) direction = tp > entry ? 'LONG' : 'SHORT';
    else if (entry && stop) direction = entry > stop ? 'LONG' : 'SHORT';

    let unitLabel = 'points';
    let riskPoints = Math.abs(entry - stop);
    let rewardPoints = Math.abs((tp || entry) - entry);

    let riskDollar = 0;
    let rewardDollar = 0;

    switch (assetType) {
      case 'stock': {
        const qty = toNum(fields.quantity);
        riskDollar = riskPoints * qty;
        rewardDollar = rewardPoints * qty;
        unitLabel = 'points';
        break;
      }
      case 'crypto': {
        const qty = toNum(fields.quantity);
        const pricePerCoin = toNum(fields.cryptoPricePerCoin) || 1;
        riskDollar = riskPoints * qty * pricePerCoin;
        rewardDollar = rewardPoints * qty * pricePerCoin;
        unitLabel = 'points';
        break;
      }
      case 'futures': {
        const meta = futuresMetaFor(fields.symbol);
        const contracts = toNum(fields.contracts) || 1;
        const tickSize = meta?.tickSize ?? 1;
        const tickValue = meta?.tickValue ?? 1;
        const ticksRisk = Math.round(Math.abs(entry - stop) / tickSize);
        const ticksReward = Math.round(Math.abs((tp || entry) - entry) / tickSize);
        riskDollar = ticksRisk * tickValue * contracts;
        rewardDollar = ticksReward * tickValue * contracts;
        riskPoints = ticksRisk;
        rewardPoints = ticksReward;
        unitLabel = 'ticks';
        break;
      }
      case 'forex': {
        const lots = toNum(fields.lotSize) || 1;
        const s = (fields.symbol || '').toUpperCase().replace('/', '');
        const pipSize = /JPY$/.test(s) ? 0.01 : 0.0001;
        const pipsRisk = Math.round(Math.abs(entry - stop) / pipSize);
        const pipsReward = Math.round(Math.abs((tp || entry) - entry) / pipSize);
        const pipValue = 10 * 1 * fxUsd;
        riskDollar = pipsRisk * pipValue * lots;
        rewardDollar = pipsReward * pipValue * lots;
        riskPoints = pipsRisk;
        rewardPoints = pipsReward;
        unitLabel = 'pips';
        break;
      }
      case 'options': {
        const contracts = toNum(fields.contracts) || 1;
        const premium = toNum(fields.optionPremium);
        riskDollar = premium * 100 * contracts;
        rewardDollar = Math.max(rewardPoints, 0) * 100 * contracts;
        unitLabel = 'points';
        break;
      }
      default: {
        const qty = toNum(fields.quantity);
        riskDollar = riskPoints * qty;
        rewardDollar = rewardPoints * qty;
      }
    }

    const rr = riskDollar > 0 ? (rewardDollar / riskDollar) : 0;

    return { direction, rr, riskDollar, rewardDollar, riskPoints, rewardPoints, unitLabel, assetType };
  }, [assetType, fields.symbol, fields.quantity, fields.contracts, fields.lotSize, fields.entry, fields.stop, fields.takeProfit, fields.optionPremium, fields.cryptoPricePerCoin, fxUsd]);

  return res;
}
