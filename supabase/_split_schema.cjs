'use strict';
/**
 * _split_schema.cjs
 * Splits CURRENT_SCHEMA.sql (raw Supabase pg_dump, no -- Name: markers) into
 * 7 themed files under supabase/migrations_v2/.
 *
 * Run from finotaur-frontend/:
 *   node supabase/_split_schema.cjs
 */

const fs   = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────
const BASE        = path.resolve(__dirname);
const SOURCE      = path.join(BASE, 'CURRENT_SCHEMA.sql');
const OUT_DIR     = path.join(BASE, 'migrations_v2');
const UNMAPPED_LOG = path.join(OUT_DIR, '_unmapped.log');

const FILE_NAMES = {
  0: '00_prelude.sql',
  1: '01_auth_admin_support.sql',
  2: '02_billing_brokers.sql',
  3: '03_trading_journal.sql',
  4: '04_reports.sql',
  5: '05_ai_data.sql',
  6: '06_affiliate.sql',
};

const DOMAIN_NAMES = {
  0: 'Prelude (global types, helpers, schema config)',
  1: 'Auth / Admin / Support',
  2: 'Billing / Brokers / Newsletters',
  3: 'Trading Journal',
  4: 'Reports',
  5: 'AI / Data / Macro',
  6: 'Affiliate / Coupons',
};

const GEN_DATE = '2026-05-02';

// ─────────────────────────────────────────────────────────────────
// TABLE → FILE mapping
// ─────────────────────────────────────────────────────────────────
const TABLE_TO_FILE = {
  // 01 auth/admin/support
  profiles: 1, profiles_archive: 1,
  admin_actions: 1, admin_actions_log: 1, admin_audit_log: 1,
  admin_impersonation_sessions: 1, admin_notifications: 1,
  support_tickets: 1, support_chats: 1, support_messages: 1,
  announcement_logs: 1, system_updates: 1, user_update_reads: 1, update_center_notifications: 1,
  churned_users: 1, subscription_cancellation_feedback: 1,
  user_settings: 1, user_activity_log: 1, user_notifications: 1, user_subscriptions: 1,
  api_rate_limits: 1, monthly_usage_tracking: 1, usage_tracking: 1,

  // 02 billing/brokers
  payment_history: 2, subscription_periods: 2, subscription_changes: 2, subscription_events: 2,
  pending_checkouts: 2, credit_purchases: 2, credit_transactions: 2,
  pricing_config: 2, admin_global_pricing: 2,
  broker_definitions: 2, broker_connections: 2, broker_accounts: 2, broker_sync_logs: 2, broker_raw_data: 2,
  instrument_definitions: 2,
  snaptrade_users: 2, snaptrade_activity: 2, snaptrade_sync_log: 2, snaptrade_connections_cache: 2, snaptrade_credentials: 2,
  tradovate_credentials: 2, tradovate_position_state: 2, tradovate_sync_state: 2,
  whop_plan_mapping: 2, whop_webhook_log: 2,
  platform_plan_mapping: 2, platform_bundle_benefits: 2, platform_subscription_events: 2, platform_webhook_log: 2,
  newsletter_send_logs: 2, newsletter_config: 2, newsletter_reports: 2, newsletter_cron_logs: 2,
  newsletter_subscribers: 2, newsletter_unsubscribe_log: 2, newsletter_prompt_config: 2, newsletters: 2,

  // 03 trading journal
  trades: 3, portfolios: 3, portfolio_copy_rules: 3, copy_trade_log: 3,
  strategies: 3, trading_sessions: 3, us_market_holidays: 3,
  ticker_symbols: 3, symbol_mapping_rules: 3, company_ticker_mapping: 3,

  // 04 reports
  ism_agent_logs: 4, ism_auto_company_reports: 4, ism_economic_environment: 4, ism_economic_snapshots: 4,
  ism_quotes: 4, ism_report_progress: 4, ism_report_tracking: 4, ism_reports: 4, ism_scheduler_logs: 4,
  ism_sector_analysis: 4, ism_sector_outlook: 4, ism_sector_rankings: 4, ism_source_cache: 4,
  ism_stock_tailwinds: 4, ism_ticker_selections: 4, ism_trade_ideas: 4,
  company_agent_logs: 4, company_report_queue: 4, company_reports: 4, company_scheduler_logs: 4,
  crypto_agent_logs: 4, crypto_report_progress: 4, crypto_reports: 4,
  daily_reports: 4, weekly_reports: 4, weekly_report_progress: 4,
  published_reports: 4, deleted_published_reports: 4,
  report_likes: 4, report_bookmarks: 4,
  scheduler_runs: 4, daily_scheduler_logs: 4, weekly_scheduler_logs: 4,
  earnings_auto_company_reports: 4, top_secret_config: 4,

  // 05 ai/data
  ai_actions_config: 5, ai_credits: 5, ai_daily_usage: 5, credit_pack_config: 5,
  ai_conversations: 5, ai_messages: 5, ai_usage: 5,
  report_embeddings: 5, embedding_jobs: 5,
  macro_data: 5, macro_snapshots: 5, macro_analyses: 5, macro_cache: 5,
  macro_guidance_history: 5, macro_sector_guidance: 5,
  rates_cache: 5, rate_decisions: 5, yield_snapshots: 5,
  earnings_analysis: 5, earnings_reports: 5,
  options_ai_cache: 5, stock_analysis_cache: 5, stock_analyzer_cache: 5,
  top5_scans: 5, top5_picks: 5, catalyst_scans: 5, catalyst_picks: 5, catalyst_reports: 5,
  flow_scanner_cache: 5, flow_scanner_stats_cache: 5, flow_scanner_refresh_log: 5,
  sector_snapshots: 5, sector_holdings_live: 5, sector_refresh_log: 5,
  top_down_macro_snapshot: 5, dashboard_cache: 5,
  pick_tracking: 5, pick_price_history: 5, performance_insights: 5, optimization_history: 5,
  scanner_config: 5,
  sec_filings: 5, company_fundamentals: 5, company_intel_cache: 5,
  insider_transactions: 5, institutional_holders: 5, fund_positions: 5, stock_institutional_ownership: 5,

  // 06 affiliate
  affiliates: 6, affiliate_activity_log: 6, affiliate_applications: 6, affiliate_bonuses: 6,
  affiliate_clicks: 6, affiliate_commissions: 6, affiliate_config: 6, affiliate_notifications: 6,
  affiliate_payouts: 6, affiliate_referrals: 6,
  admin_coupons: 6, admin_coupon_plan_prices: 6, coupon_usage_log: 6, referral_codes: 6,
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/** Strip surrounding double-quotes from a SQL identifier token */
function unquote(s) {
  if (!s) return '';
  return s.replace(/^"(.*)"$/, '$1');
}

/**
 * Extract the bare table name from strings like:
 *   "public"."profiles"  OR  public.profiles  OR  "profiles"  OR  profiles
 */
function extractTableName(s) {
  if (!s) return null;
  // pattern: optional schema. then table
  const m = s.match(/(?:"public"\.|public\.)?("?[\w$]+"?)/i);
  if (m) return unquote(m[1].trim()).toLowerCase();
  return null;
}

/** Look up a bare table name in TABLE_TO_FILE, return file number or null */
function tableFile(name) {
  if (!name) return null;
  return TABLE_TO_FILE[name.toLowerCase()] !== undefined
    ? TABLE_TO_FILE[name.toLowerCase()]
    : null;
}

/**
 * Scan a multi-line function/view body for table references.
 * Returns the file number with the most hits, or null.
 */
function fileByBodyRefs(body) {
  const counts = {};
  // Match FROM/UPDATE/INSERT INTO/JOIN public.X  or  FROM "public"."X"
  const re = /(?:FROM|UPDATE|INSERT\s+INTO|JOIN)\s+(?:"public"\.|public\.)?("?[\w$]+"?)/gi;
  let m;
  while ((m = re.exec(body)) !== null) {
    const tbl = unquote(m[1]).toLowerCase();
    const f = TABLE_TO_FILE[tbl];
    if (f !== undefined) counts[f] = (counts[f] || 0) + 1;
  }
  let best = null, bestCount = 0;
  for (const [f, c] of Object.entries(counts)) {
    if (c > bestCount) { bestCount = c; best = Number(f); }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────
// BLOCK DETECTION
// ─────────────────────────────────────────────────────────────────

/**
 * A "block" is a logical SQL object. In this dump there are no -- Name: markers,
 * so we identify statement boundaries by top-level statement starters.
 *
 * A block starts on a line where stripped content matches one of:
 *   CREATE ... / ALTER ... / COMMENT ... / GRANT ... / REVOKE ...
 *   SELECT pg_catalog ... (only in prelude)
 *
 * A block ends just before the next such line, OR at a blank-line boundary
 * that naturally separates statements.
 *
 * Complication: function bodies span many lines. We track dollar-quoting depth.
 */
function parseBlocks(lines) {
  /**
   * Returns true if this line starts a new top-level statement.
   * We only fire if we're NOT inside a dollar-quoted string.
   */
  function isStatementStart(line) {
    const t = line.trim();
    return /^(CREATE|ALTER|DROP|COMMENT|GRANT|REVOKE|SELECT\s+pg_catalog)\b/i.test(t);
  }

  const blocks = [];
  let current = null;       // { startLine (1-based), lines: [] }
  let dollarDepth = 0;      // tracks $$...$$  $body$...$body$ etc.
  let dollarTag = null;     // the current dollar-quote tag, e.g. "$$" or "$body$"

  function pushCurrent() {
    if (current && current.linesList.length > 0) {
      blocks.push({ startLine: current.startLine, text: current.linesList.join('\n') });
    }
    current = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track dollar-quoting so we don't split inside function bodies
    if (dollarDepth === 0) {
      // Check if this line opens a dollar-quote
      const dq = line.match(/(\$[^$]*\$)/g);
      if (dq) {
        // If odd number of same tag → opened
        const tagCounts = {};
        for (const tag of dq) { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }
        for (const [tag, cnt] of Object.entries(tagCounts)) {
          if (cnt % 2 === 1) { dollarDepth = 1; dollarTag = tag; break; }
        }
      }
    } else {
      // Inside dollar-quote — check for close tag
      if (line.includes(dollarTag)) {
        const occurrences = (line.split(dollarTag).length - 1);
        if (occurrences % 2 === 1) {
          // close
          dollarDepth = 0;
          dollarTag = null;
        }
      }
    }

    if (dollarDepth === 0 && isStatementStart(line)) {
      // New statement starts here
      pushCurrent();
      current = { startLine: i + 1, linesList: [line] };
    } else if (current) {
      current.linesList.push(line);
    } else {
      // Lines before any statement (blanks at top of file)
      // Start a prelude collector
      current = { startLine: i + 1, linesList: [line] };
    }
  }
  pushCurrent();
  return blocks;
}

// ─────────────────────────────────────────────────────────────────
// VIEW_TO_FILE — hand-verified from body analysis
// Views are also checked dynamically, this is a definitive override map
// ─────────────────────────────────────────────────────────────────
const VIEW_TO_FILE = {
  // 01 auth/admin/support
  active_subscriptions: 1, admin_audit_logs_enriched: 1,
  admin_stats_view: 1, admin_users_list_view: 1,
  archived_users_view: 1, beta_users_view: 1,
  cancellation_analytics_view: 1,

  // 02 billing/brokers
  admin_coupons_summary: 6, admin_pricing_overview: 2,
  payment_analytics: 2, pricing_info: 2, proration_impact_view: 2,
  revenue_analytics_view: 2, subscription_breakdown_view: 2,
  subscription_flow_view: 2, subscription_health_view: 2,

  // 03 trading journal
  session_performance_view: 3, strategy_stats_view: 3, webhook_stats: 3,
  trade_volume_daily: 3, trades_with_metrics: 3,

  // 04 reports
  v_catalyst_type_performance: 4, v_copy_log_summary: 4,
  v_drastic_movers: 4, v_finotaur_calibration: 4,
  v_growth_picks: 4, v_ism_economic_environment_latest: 4,
  v_ism_sector_outlook_latest: 4, v_ism_sector_rankings_latest: 4,
  v_ism_stock_tailwinds_latest: 4, v_ism_trade_ideas_latest: 4,
  v_lite_candidates: 4, v_long_term_holds: 4, v_momentum_picks: 4,
  v_pattern_matrix: 4, v_report_interaction_counts: 4,
  v_score_vs_performance: 4, v_sector_movers: 4,
  v_sector_rankings_latest: 4, v_short_term_trades: 4,
  v_signal_accuracy: 4, v_strategy_changes: 4,
  v_ticker_selections_latest: 4, v_value_picks: 4,

  // 05 ai/data
  flow_scanner_health: 5, sector_refresh_stats: 5,
  stock_cache_stats: 5, v_current_macro_guidance: 5,

  // 06 affiliate
  affiliate_applications_queue: 6, affiliate_cron_history: 6,
  affiliate_dashboard_summary: 6, affiliate_leaderboard: 6,
  affiliate_monthly_performance: 6, affiliate_pending_payments: 6,
  affiliate_pending_verifications: 6,

  // misc
  current_year_holidays: 3, upcoming_holidays: 3,
  user_growth_daily: 1,
};

/** Look up a bare view (or table) name in VIEW_TO_FILE or TABLE_TO_FILE */
function objectFile(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  if (TABLE_TO_FILE[n] !== undefined) return TABLE_TO_FILE[n];
  if (VIEW_TO_FILE[n] !== undefined) return VIEW_TO_FILE[n];
  return null;
}

// ─────────────────────────────────────────────────────────────────
// CLASSIFY BLOCK → file number (0-6)
// ─────────────────────────────────────────────────────────────────

/**
 * Helper: given a type name (e.g. "affiliate_tier"), infer file
 */
function typeNameToFile(typeName) {
  const n = typeName.toLowerCase();
  if (/^affiliate_/.test(n)) return 6;
  if (/^(bonus_|commission_|tier_)/.test(n)) return 6;
  if (/^(coupon_|payout_|referral_|discount_)/.test(n)) return 6;
  return null; // fall through to prelude
}

/**
 * Helper: given a function name, is it a prelude helper?
 */
function isFunctionPrelude(fnName) {
  const n = fnName.toLowerCase();
  return /^(is_admin|update_updated_at|handle_updated_at|update_timestamp|gen_random_|generate_random_|rls_check_)/.test(n);
}

/**
 * Classify a block's text → file number 0-6
 * Returns { fileNum, reason }
 */
function classifyBlock(block, allLines) {
  const text = block.text;
  const firstLine = text.split('\n')[0].trim();

  // ── SET / SELECT pg_catalog / CREATE SCHEMA / ALTER SCHEMA / COMMENT ON SCHEMA ──
  if (/^SET\s/i.test(firstLine) || /^SELECT\s+pg_catalog/i.test(firstLine)) {
    return { fileNum: 0, reason: 'prelude SET/SELECT' };
  }
  if (/^CREATE\s+SCHEMA/i.test(firstLine) || /^ALTER\s+SCHEMA/i.test(firstLine)) {
    return { fileNum: 0, reason: 'schema DDL' };
  }
  if (/^COMMENT\s+ON\s+SCHEMA/i.test(firstLine)) {
    return { fileNum: 0, reason: 'comment on schema' };
  }

  // ── ALTER DEFAULT PRIVILEGES ──
  if (/^ALTER\s+DEFAULT\s+PRIVILEGES/i.test(firstLine)) {
    return { fileNum: 0, reason: 'ALTER DEFAULT PRIVILEGES' };
  }

  // ── GRANT USAGE ON SCHEMA ──
  if (/^GRANT\s+USAGE\s+ON\s+SCHEMA/i.test(firstLine) || /^REVOKE\s+ALL\s+ON\s+SCHEMA/i.test(firstLine)) {
    return { fileNum: 0, reason: 'schema-level GRANT/REVOKE' };
  }

  // ── CREATE TYPE ──
  if (/^CREATE\s+TYPE/i.test(firstLine)) {
    const m = firstLine.match(/CREATE\s+TYPE\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const typeName = m ? unquote(m[1]) : '';
    const f = typeNameToFile(typeName);
    if (f !== null) return { fileNum: f, reason: `type name → file ${f}` };
    return { fileNum: 0, reason: 'type → prelude (shared/unknown)' };
  }

  // ── ALTER TYPE ──
  if (/^ALTER\s+TYPE/i.test(firstLine)) {
    const m = firstLine.match(/ALTER\s+TYPE\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const typeName = m ? unquote(m[1]) : '';
    const f = typeNameToFile(typeName);
    if (f !== null) return { fileNum: f, reason: `alter type name → file ${f}` };
    return { fileNum: 0, reason: 'alter type → prelude' };
  }

  // ── CREATE TABLE ──
  if (/^CREATE\s+TABLE/i.test(firstLine)) {
    // Extract table name: CREATE TABLE "public"."foo" or CREATE TABLE "foo"
    const m = firstLine.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const tbl = m ? unquote(m[1]).toLowerCase() : null;
    const f = tbl ? objectFile(tbl) : null;
    if (f !== null) return { fileNum: f, reason: `table ${tbl} → file ${f}` };
    return { fileNum: null, reason: `CREATE TABLE: unknown table "${tbl}"` };
  }

  // ── ALTER TABLE (constraints, RLS, FK) ──
  if (/^ALTER\s+TABLE/i.test(firstLine)) {
    // Extract table name
    const m = firstLine.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const tbl = m ? unquote(m[1]).toLowerCase() : null;
    const f = tbl ? objectFile(tbl) : null;
    if (f !== null) return { fileNum: f, reason: `ALTER TABLE ${tbl}` };
    return { fileNum: null, reason: `ALTER TABLE: unknown "${tbl}"` };
  }

  // ── CREATE SEQUENCE ──
  if (/^CREATE\s+SEQUENCE/i.test(firstLine)) {
    // Sequences are usually for a specific table; try to infer from the sequence name
    const m = firstLine.match(/CREATE\s+SEQUENCE\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const seqName = m ? unquote(m[1]).toLowerCase() : '';
    // Try extracting table name: e.g. "affiliates_id_seq" → "affiliates"
    const tablePart = seqName.replace(/_id_seq$|_seq$/, '');
    const f = tableFile(tablePart);
    if (f !== null) return { fileNum: f, reason: `sequence ${seqName} → table ${tablePart}` };
    return { fileNum: 0, reason: `sequence ${seqName} → prelude (cannot map)` };
  }

  // ── ALTER SEQUENCE ──
  if (/^ALTER\s+SEQUENCE/i.test(firstLine)) {
    const m = firstLine.match(/ALTER\s+SEQUENCE\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const seqName = m ? unquote(m[1]).toLowerCase() : '';
    const tablePart = seqName.replace(/_id_seq$|_seq$/, '');
    const f = tableFile(tablePart);
    if (f !== null) return { fileNum: f, reason: `alter sequence → ${tablePart}` };
    return { fileNum: 0, reason: `alter sequence → prelude` };
  }

  // ── CREATE INDEX / CREATE UNIQUE INDEX ──
  if (/^CREATE\s+(UNIQUE\s+)?INDEX/i.test(firstLine)) {
    // ON "public"."tablename"
    const m = firstLine.match(/\bON\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const tbl = m ? unquote(m[1]).toLowerCase() : null;
    const f = tbl ? objectFile(tbl) : null;
    if (f !== null) return { fileNum: f, reason: `index on ${tbl}` };
    // Index on a view — still try body refs
    const bodyFile = fileByBodyRefs(text);
    if (bodyFile !== null) return { fileNum: bodyFile, reason: `index on view ${tbl} body` };
    return { fileNum: null, reason: `CREATE INDEX: unknown table/view "${tbl}"` };
  }

  // ── CREATE POLICY ──
  if (/^CREATE\s+POLICY/i.test(firstLine)) {
    // CREATE POLICY "name" ON "public"."tablename"
    const m = firstLine.match(/\bON\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const tbl = m ? unquote(m[1]).toLowerCase() : null;
    const f = tbl ? objectFile(tbl) : null;
    if (f !== null) return { fileNum: f, reason: `policy on ${tbl}` };
    return { fileNum: null, reason: `CREATE POLICY: unknown table "${tbl}"` };
  }

  // ── CREATE TRIGGER / CREATE OR REPLACE TRIGGER / CREATE CONSTRAINT TRIGGER ──
  if (/^CREATE\s+(?:OR\s+REPLACE\s+)?(?:CONSTRAINT\s+)?TRIGGER/i.test(firstLine)) {
    // ON "public"."tablename"
    const m = firstLine.match(/\bON\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const tbl = m ? unquote(m[1]).toLowerCase() : null;
    const f = tbl ? objectFile(tbl) : null;
    if (f !== null) return { fileNum: f, reason: `trigger on ${tbl}` };
    return { fileNum: null, reason: `CREATE TRIGGER: unknown table "${tbl}"` };
  }

  // ── CREATE VIEW / CREATE MATERIALIZED VIEW ──
  if (/^CREATE\s+(OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW/i.test(firstLine)) {
    // Route by majority table references in body
    const bodyFile = fileByBodyRefs(text);
    if (bodyFile !== null) return { fileNum: bodyFile, reason: `view body refs → file ${bodyFile}` };
    return { fileNum: 0, reason: 'view → prelude (no clear body refs)' };
  }

  // ── ALTER VIEW / ALTER MATERIALIZED VIEW ──
  if (/^ALTER\s+(MATERIALIZED\s+)?VIEW/i.test(firstLine)) {
    const m = firstLine.match(/ALTER\s+(?:MATERIALIZED\s+)?VIEW\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const viewName = m ? unquote(m[1]).toLowerCase() : null;
    // Try to find a corresponding CREATE VIEW block's classification — or fall back to body scan
    // For ALTER VIEW just scan the view name for table hints
    if (viewName) {
      const bodyFile = fileByBodyRefs(text);
      if (bodyFile !== null) return { fileNum: bodyFile, reason: `alter view ${viewName} → file ${bodyFile}` };
    }
    return { fileNum: 0, reason: `alter view → prelude` };
  }

  // ── CREATE OR REPLACE FUNCTION ──
  if (/^CREATE\s+OR\s+REPLACE\s+FUNCTION/i.test(firstLine) || /^CREATE\s+FUNCTION/i.test(firstLine)) {
    const m = firstLine.match(/FUNCTION\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const fnName = m ? unquote(m[1]) : '';

    // Prelude helpers
    if (isFunctionPrelude(fnName)) {
      return { fileNum: 0, reason: `function ${fnName} → prelude helper` };
    }

    // Scan body for table references
    const bodyFile = fileByBodyRefs(text);
    if (bodyFile !== null) return { fileNum: bodyFile, reason: `function ${fnName} body refs → file ${bodyFile}` };

    // Fallback: try the function name itself
    // e.g. "affiliate_calculate_..." → 6
    const fnLower = fnName.toLowerCase();
    if (/^affiliate_/.test(fnLower)) return { fileNum: 6, reason: `function name affiliate_*` };
    if (/^(admin_|is_admin)/.test(fnLower)) return { fileNum: 1, reason: `function name admin_*` };
    if (/^(ism_|company_report|daily_report|weekly_report)/.test(fnLower)) return { fileNum: 4, reason: `function name ism/report` };
    if (/^(macro_|rates_|yield_|earnings_|sector_)/.test(fnLower)) return { fileNum: 5, reason: `function name macro/data` };

    // Final fallback → prelude
    return { fileNum: 0, reason: `function ${fnName} → prelude (no refs)` };
  }

  // ── ALTER FUNCTION ──
  if (/^ALTER\s+FUNCTION/i.test(firstLine)) {
    const m = firstLine.match(/FUNCTION\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const fnName = m ? unquote(m[1]) : '';
    if (isFunctionPrelude(fnName)) return { fileNum: 0, reason: `alter function ${fnName} → prelude` };
    // Scan what we have (usually just the ALTER FUNCTION line + OWNER TO)
    const bodyFile = fileByBodyRefs(text);
    if (bodyFile !== null) return { fileNum: bodyFile, reason: `alter function ${fnName} body → file ${bodyFile}` };
    const fnLower = fnName.toLowerCase();
    if (/^affiliate_/.test(fnLower)) return { fileNum: 6, reason: `alter function affiliate_*` };
    if (/^(admin_|is_admin)/.test(fnLower)) return { fileNum: 1, reason: `alter function admin_*` };
    if (/^(ism_|company_report|daily_report|weekly_report)/.test(fnLower)) return { fileNum: 4, reason: `alter function ism/report` };
    if (/^(macro_|rates_|yield_|earnings_|sector_)/.test(fnLower)) return { fileNum: 5, reason: `alter function macro/data` };
    return { fileNum: 0, reason: `alter function ${fnName} → prelude (no refs)` };
  }

  // ── GRANT ALL ON TABLE ──
  if (/^GRANT\s+ALL\s+ON\s+TABLE/i.test(firstLine)) {
    const m = firstLine.match(/ON\s+TABLE\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const tbl = m ? unquote(m[1]).toLowerCase() : null;
    const f = tbl ? objectFile(tbl) : null;
    if (f !== null) return { fileNum: f, reason: `GRANT ON TABLE/VIEW ${tbl}` };
    return { fileNum: null, reason: `GRANT TABLE: unknown "${tbl}"` };
  }

  // ── GRANT ALL ON FUNCTION ──
  if (/^GRANT\s+ALL\s+ON\s+FUNCTION/i.test(firstLine)) {
    const m = firstLine.match(/FUNCTION\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const fnName = m ? unquote(m[1]) : '';
    if (isFunctionPrelude(fnName)) return { fileNum: 0, reason: `grant function ${fnName} → prelude` };
    const fnLower = fnName.toLowerCase();
    if (/^affiliate_/.test(fnLower)) return { fileNum: 6, reason: `grant function affiliate_*` };
    if (/^(admin_|is_admin)/.test(fnLower)) return { fileNum: 1, reason: `grant function admin_*` };
    if (/^(ism_|company_report|daily_report|weekly_report)/.test(fnLower)) return { fileNum: 4, reason: `grant function ism/report` };
    if (/^(macro_|rates_|yield_|earnings_|sector_)/.test(fnLower)) return { fileNum: 5, reason: `grant function macro/data` };
    // Scan text
    const bodyFile = fileByBodyRefs(text);
    if (bodyFile !== null) return { fileNum: bodyFile, reason: `grant function ${fnName} body` };
    return { fileNum: 0, reason: `grant function ${fnName} → prelude` };
  }

  // ── GRANT ALL ON SEQUENCE ──
  if (/^GRANT\s+ALL\s+ON\s+SEQUENCE/i.test(firstLine)) {
    const m = firstLine.match(/SEQUENCE\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const seqName = m ? unquote(m[1]).toLowerCase() : '';
    const tablePart = seqName.replace(/_id_seq$|_seq$/, '');
    const f = tableFile(tablePart);
    if (f !== null) return { fileNum: f, reason: `grant sequence → ${tablePart}` };
    return { fileNum: 0, reason: `grant sequence → prelude` };
  }

  // ── GRANT SELECT / GRANT USAGE ──
  if (/^GRANT\s+(SELECT|USAGE)/i.test(firstLine)) {
    return { fileNum: 0, reason: 'GRANT SELECT/USAGE → prelude' };
  }

  // ── REVOKE ──
  if (/^REVOKE/i.test(firstLine)) {
    return { fileNum: 0, reason: 'REVOKE → prelude' };
  }

  // ── COMMENT ON TABLE / VIEW ──
  if (/^COMMENT\s+ON\s+TABLE/i.test(firstLine)) {
    const m = firstLine.match(/COMMENT\s+ON\s+TABLE\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const tbl = m ? unquote(m[1]).toLowerCase() : null;
    const f = tbl ? objectFile(tbl) : null;
    if (f !== null) return { fileNum: f, reason: `comment on table/view ${tbl}` };
    return { fileNum: null, reason: `COMMENT ON TABLE: unknown "${tbl}"` };
  }

  // ── COMMENT ON COLUMN ──
  if (/^COMMENT\s+ON\s+COLUMN/i.test(firstLine)) {
    const m = firstLine.match(/COMMENT\s+ON\s+COLUMN\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const tbl = m ? unquote(m[1]).toLowerCase() : null;
    const f = tbl ? objectFile(tbl) : null;
    if (f !== null) return { fileNum: f, reason: `comment on column of ${tbl}` };
    return { fileNum: null, reason: `COMMENT ON COLUMN: unknown "${tbl}"` };
  }

  // ── COMMENT ON FUNCTION ──
  if (/^COMMENT\s+ON\s+FUNCTION/i.test(firstLine)) {
    const m = firstLine.match(/FUNCTION\s+(?:"public"\.|public\.)?("?[\w$]+"?)/i);
    const fnName = m ? unquote(m[1]) : '';
    if (isFunctionPrelude(fnName)) return { fileNum: 0, reason: `comment function prelude` };
    const bodyFile = fileByBodyRefs(text);
    if (bodyFile !== null) return { fileNum: bodyFile, reason: `comment function body refs` };
    return { fileNum: 0, reason: `comment function → prelude` };
  }

  // ── COMMENT ON anything else ──
  if (/^COMMENT\s+ON/i.test(firstLine)) {
    return { fileNum: 0, reason: 'COMMENT ON (generic) → prelude' };
  }

  // Fallback
  return { fileNum: null, reason: `unclassified: ${firstLine.substring(0, 60)}` };
}

// ─────────────────────────────────────────────────────────────────
// BANNER
// ─────────────────────────────────────────────────────────────────
function banner(fileNum) {
  return [
    '-- ============================================================',
    `-- FINOTAUR Schema · Domain: ${DOMAIN_NAMES[fileNum]}`,
    `-- Generated from CURRENT_SCHEMA.sql on ${GEN_DATE}`,
    '-- DO NOT edit this file manually — it is the consolidated source of truth.',
    '-- ============================================================',
    '',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
function main() {
  const startTime = Date.now();
  console.log('Reading source file…');
  const rawContent = fs.readFileSync(SOURCE, 'utf8');
  const lines = rawContent.split('\n');
  console.log(`  Lines: ${lines.length}`);

  // Create output directory
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Initialize output buffers (keyed 0-6)
  const buffers = {};
  for (let i = 0; i <= 6; i++) buffers[i] = banner(i);

  const unmappedLines = [];

  console.log('Parsing blocks…');
  const blocks = parseBlocks(lines);
  console.log(`  Blocks found: ${blocks.length}`);

  // Classify each block
  let classified = 0, unclassified = 0;
  for (const block of blocks) {
    // Skip entirely blank/whitespace blocks
    if (block.text.trim().length === 0) continue;

    const { fileNum, reason } = classifyBlock(block, lines);

    if (fileNum === null) {
      unclassified++;
      unmappedLines.push(`Line ${block.startLine}: [UNMAPPED] ${reason}\n  >> ${block.text.split('\n')[0].trim().substring(0,100)}`);
      // Put unmapped in prelude so nothing is silently dropped
      buffers[0] += '\n' + block.text;
    } else {
      classified++;
      buffers[fileNum] += '\n' + block.text;
    }
  }

  // Write output files
  for (let i = 0; i <= 6; i++) {
    const outPath = path.join(OUT_DIR, FILE_NAMES[i]);
    fs.writeFileSync(outPath, buffers[i], 'utf8');
  }

  // Write unmapped log
  const logContent = unmappedLines.length > 0
    ? `# Unmapped blocks (${unmappedLines.length})\n\n` + unmappedLines.join('\n\n')
    : '# No unmapped blocks — all classified successfully.\n';
  fs.writeFileSync(UNMAPPED_LOG, logContent, 'utf8');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ── VERIFICATION STATS ──
  console.log('\n=== PHASE B VERIFICATION ===\n');

  // Line counts
  const sourceLines = lines.length;
  let totalOutLines = 0;
  const tableCountsByFile = {};

  console.log('Output files:');
  console.log('─'.repeat(70));
  console.log(`${'File'.padEnd(35)} ${'Lines'.padStart(8)} ${'Tables'.padStart(8)}`);
  console.log('─'.repeat(70));

  for (let i = 0; i <= 6; i++) {
    const outPath = path.join(OUT_DIR, FILE_NAMES[i]);
    const content = fs.readFileSync(outPath, 'utf8');
    const outLines = content.split('\n').length;
    totalOutLines += outLines;

    // Count CREATE TABLE
    const ctMatches = content.match(/^CREATE TABLE/gim) || [];
    tableCountsByFile[i] = ctMatches.length;

    console.log(`${FILE_NAMES[i].padEnd(35)} ${String(outLines).padStart(8)} ${String(ctMatches.length).padStart(8)}`);
  }

  console.log('─'.repeat(70));
  console.log(`${'TOTAL OUTPUT'.padEnd(35)} ${String(totalOutLines).padStart(8)}`);
  console.log(`${'SOURCE'.padEnd(35)} ${String(sourceLines).padStart(8)}`);

  const ratio = (totalOutLines / sourceLines * 100).toFixed(1);
  const withinRange = ratio >= 95 && ratio <= 105;
  console.log(`\nLine coverage: ${ratio}% of source — ${withinRange ? 'PASS ✓' : 'WARN: outside ±5% range'}`);

  // Expected table counts
  const expected = { 0: 0, 1: 23, 2: 37, 3: 10, 4: 35, 5: 47, 6: 14 };
  console.log('\nTable count check (actual vs expected):');
  for (let i = 0; i <= 6; i++) {
    const act = tableCountsByFile[i];
    const exp = expected[i];
    const ok = Math.abs(act - exp) <= 3;
    console.log(`  f${i}: ${act} (expected ≈${exp}) ${ok ? '✓' : '⚠ MISMATCH'}`);
  }

  // Unmapped
  console.log(`\nUnmapped blocks: ${unmappedLines.length}`);
  if (unmappedLines.length > 0) {
    console.log('  (see _unmapped.log for details)');
    unmappedLines.slice(0, 10).forEach(l => console.log('  ' + l.split('\n')[0]));
  }

  console.log(`\nBlocks classified: ${classified}  |  sent to prelude as unmapped: ${unclassified}`);
  console.log(`\nRuntime: ${elapsed}s`);
  console.log(`Output: ${OUT_DIR}`);
}

main();
