// supabase/functions/_shared/exchanges/registry.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Lookup table of exchange adapters by exchange name.
//
// Sync edge functions call getExchangeAdapter(name) to get the
// correct implementation without importing all adapters.
//
// Config is read from Deno.env on every call — no module-level
// singleton, so secrets rotate correctly without a cold-start
// dependency (mirrors broker-auth/registry.ts pattern).
// ═══════════════════════════════════════════════════════════════

import type { ExchangeAdapter, ExchangeName } from './interface.ts';
import { createBinanceAdapter } from './binance-adapter.ts';

/**
 * Returns the exchange adapter for the given exchange name.
 * Throws if the exchange is not yet supported.
 */
export function getExchangeAdapter(name: ExchangeName): ExchangeAdapter {
  switch (name) {
    case 'binance':
      return createBinanceAdapter();
    case 'bybit':
      throw new Error('Bybit exchange adapter not yet implemented');
    case 'coinbase':
      throw new Error('Coinbase exchange adapter not yet implemented');
    case 'okx':
      throw new Error('OKX exchange adapter not yet implemented');
    case 'kraken':
      throw new Error('Kraken exchange adapter not yet implemented');
    default: {
      // Exhaustiveness check — TypeScript will error here if ExchangeName
      // grows without a matching case being added above.
      const _exhaustive: never = name;
      throw new Error(`Unknown exchange: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Type guard: returns true only for exchange names that have a working
 * adapter. Use this before calling getExchangeAdapter to surface a clean
 * 400 error instead of a 500 for unsupported exchanges.
 */
export function isExchangeSupported(name: string): name is ExchangeName {
  return name === 'binance';
}
