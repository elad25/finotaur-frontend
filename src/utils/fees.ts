// src/utils/fees.ts
// ✅ Updated to work without direct settingsStorage import
// Uses commission calculation logic directly

/**
 * Calculate commission for a trade
 * Note: This is a utility function that requires commission settings to be passed in
 * For React components, use useCommissions().calculateCommission() instead
 */
export function calculateCommissionFromSettings(
  commissionSettings: any,
  assetClass: string,
  entryPrice: number,
  quantity: number,
  multiplier: number = 1
): number {
  const key = assetClass.toLowerCase();
  const setting = commissionSettings[key];

  if (!setting) return 0;

  const value = parseFloat(setting.value) || 0;

  if (setting.type === 'percentage') {
    const tradeValue = entryPrice * quantity * multiplier;
    return (tradeValue * value) / 100;
  } else {
    return value * quantity;
  }
}

/**
 * Estimate fees for a trade based on commission settings
 * @param commissionSettings - Commission settings object from useCommissions()
 * @param entryPrice - Entry price of the trade
 * @param quantity - Number of shares/contracts
 * @param assetClass - Asset class (stocks, crypto, futures, etc.)
 * @param multiplier - Multiplier for futures/options (default 1)
 * @returns Estimated fees in USD
 */
export function estimateFees(
  commissionSettings: any,
  entryPrice: number,
  quantity: number,
  assetClass: string = 'stocks',
  multiplier: number = 1
): number {
  if (!entryPrice || !quantity || entryPrice <= 0 || quantity <= 0) {
    return 0;
  }

  return calculateCommissionFromSettings(
    commissionSettings,
    assetClass,
    entryPrice,
    quantity,
    multiplier
  );
}

/**
 * Calculate total fees including entry and exit
 * Assumes exit fees are the same as entry fees (most common case)
 */
export function estimateTotalFees(
  commissionSettings: any,
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  assetClass: string = 'stocks',
  multiplier: number = 1
): number {
  const entryFees = estimateFees(commissionSettings, entryPrice, quantity, assetClass, multiplier);
  const exitFees = estimateFees(commissionSettings, exitPrice, quantity, assetClass, multiplier);
  return entryFees + exitFees;
}

// ============================================
// HOW TO USE IN COMPONENTS:
// ============================================
// import { useCommissions } from '@/hooks/useRiskSettings';
// import { estimateFees } from '@/utils/fees';
//
// function MyComponent() {
//   const { commissions } = useCommissions();
//   
//   const fees = estimateFees(commissions, 100, 10, 'stocks');
//   // or use the hook's built-in method:
//   // const { calculateCommission } = useCommissions();
//   // const fees = calculateCommission('stocks', 100, 10);
// }