// A trade is broker-verified iff it came from a real connected broker
// (broker !== 'manual'). Manual (import_source='manual') and AI-screenshot
// (import_source='api') trades both carry broker='manual' and are NOT verified.
// Used to gate sharing to the GLOBAL feed. (Do not confuse with isManualTrade,
// which governs chart rendering.)
export function isBrokerVerifiedTrade(
  trade: { broker?: string | null } | null | undefined,
): boolean {
  return !!trade?.broker && trade.broker !== 'manual';
}
