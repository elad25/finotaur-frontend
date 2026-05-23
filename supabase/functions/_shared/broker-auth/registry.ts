// supabase/functions/_shared/broker-auth/registry.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Lookup table of OAuth adapters by broker name.
//
// Edge functions (oauth-start, oauth-callback, oauth-refresh) call
// getBrokerAuthAdapter(broker) to get the correct implementation.
//
// NinjaTrader routes through Tradovate API (per user confirmation) —
// both names resolve to the same adapter.
// ═══════════════════════════════════════════════════════════════

import type { BrokerAuthAdapter, BrokerName } from './interface.ts';
import {
  buildTradovateConfigFromEnv,
  createTradovateAdapter,
} from './tradovate-adapter.ts';

/**
 * Returns the OAuth adapter for the given broker.
 * Throws if the broker is not yet supported.
 *
 * Config is read from Deno.env on every call — no module-level singleton,
 * so secrets rotate correctly without a cold-start dependency.
 */
export function getBrokerAuthAdapter(broker: BrokerName): BrokerAuthAdapter {
  switch (broker) {
    case 'tradovate':
    case 'ninja_trader': {
      // NinjaTrader Group routes through Tradovate API (per user confirmation).
      const config = buildTradovateConfigFromEnv();
      return createTradovateAdapter(config);
    }
    case 'topstepx':
      throw new Error('TopstepX OAuth not yet implemented (planned for later session)');
    case 'interactive_brokers':
      throw new Error('IB OAuth adapter pending refactor (planned for S4)');
    default: {
      // Exhaustiveness check — TypeScript will error here if BrokerName grows
      // without a matching case being added above.
      const _exhaustive: never = broker;
      throw new Error(`Unknown broker: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Type guard: returns true only for broker names that have a working OAuth
 * adapter. Use this before calling getBrokerAuthAdapter to surface a clean
 * 400 error instead of a 500 for unsupported brokers.
 */
export function isOAuthSupported(broker: string): broker is BrokerName {
  return broker === 'tradovate' || broker === 'ninja_trader';
}
