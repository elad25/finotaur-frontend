// src/features/automation/lib/agentVersion.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared FINOTAUR Agent release metadata. MUST be bumped together with the
// shipped /downloads/finotaur-agent.zip on every agent release (built by
// automation-agent/package-agent.py — see the standing rule in that script).
// Single source of truth — imported by both the Trade Copier install tab
// (InstallAgentTab.tsx) and the Trading Arena market-data connect flow
// (ConnectMarketDataPage.tsx / MarketDataGuideModal.tsx).
// ─────────────────────────────────────────────────────────────────────────────

export const AGENT_VERSION = '1.11.0';
export const AGENT_UPDATED = 'Jul 12, 2026';
