# Interactive Brokers — IBRIT Service Layer

This directory contains the client-side IBRIT integration for Interactive Brokers reporting.

## Files

- **`ibrit.service.ts`** — Core IBRIT protocol implementation. Implements `fetchActivity`, `fetchPositions`, `fetchTradesForDateRange`, `validateCredentials`. Endpoint: `https://ndcdyn.interactivebrokers.com/Reporting/IBRITService`. Returns CSV, parses to typed records.
- **`ibTradeSync.service.ts`** — Legacy service, depends on old `brokerConnection.service.ts` (broker_id FK schema). Do NOT import — left dormant per Forward-Only Principle.

## Edge function refactor required (post-pivot 2026-05-24)

The `interactive-brokers-sync` edge function (v1) was built for IB Web API + OAuth2. After the IBRIT pivot, it needs replacement. The new v2 must:

1. Auth: same as v1 (dualAuth — cron Bearer OR user JWT)
2. Read `broker_connections` row for `(userId, 'interactive_brokers')`
3. Read `connection_data.{token, query_id, service_code}` directly (no Vault yet — IBRIT credentials are not Vault-encrypted in v1 of pivot; plan to migrate to Vault in a follow-up)
4. Call IBRIT for Activity report (today): `GET https://ndcdyn.interactivebrokers.com/Reporting/IBRITService?t=<token>&q=<query_id>&rd=<YYYY-MM-DD>&s=<service_code>`
5. Parse CSV → upsert trades into `trades` table with `broker='interactive_brokers'`, `external_id='ib_'+TransactionID`
6. Call IBRIT for Position report (same endpoint, different Query — for now reuse same query_id and let IB decide based on Flex Query type)
7. Write positions array to `connection_data.last_positions`
8. Update `last_sync_at`, `last_successful_sync_at`, reset `error_count`, `status='connected'`
9. Return `{ ok: true, tradesInserted, positionsCount }`

If the same Token+QueryID pair can return BOTH Activity and Position, one call is enough. Otherwise we need two queries. Per Keith's email, "Activity file would still be generated but would be blank if no activity" — implies the Flex Query type is fixed per (Token, QueryID) pair. Elad may need a SECOND Flex Query from IB for Positions.

Caveat: Per Keith, "test in the live environment" — there is no IBRIT sandbox. First call will hit real IB.
