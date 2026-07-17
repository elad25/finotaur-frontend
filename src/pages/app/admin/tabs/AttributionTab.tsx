// src/pages/app/admin/tabs/AttributionTab.tsx
// ============================================
// Admin "Ad Attribution" tab.
// Calls the admin-gated Postgres RPC `admin_ad_attribution(p_days)`
// and renders which ads/platforms/campaigns bring signups.
// ============================================

import { useEffect, useState } from 'react';
import {
  Megaphone,
  AlertTriangle,
  Users,
  Target,
  Compass,
  Info,
  CreditCard,
  DollarSign,
  Wallet,
  Gauge,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { SkeletonStatRow, SkeletonTable } from '@/components/ds/Skeleton';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AttributionTotals {
  signups: number;
  attributed: number;
  organic: number;
}

interface PlatformCount {
  platform: string;
  signups: number;
}

interface CampaignCount {
  utm_campaign: string;
  utm_source: string;
  signups: number;
}

interface AdCount {
  utm_content: string;
  utm_campaign: string;
  utm_source: string;
  signups: number;
}

interface SignupRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  ts: string;
  platform: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_page: string | null;
  method: string | null;
}

interface AdAttributionData {
  window_days: number;
  totals: AttributionTotals;
  by_platform: PlatformCount[];
  by_campaign: CampaignCount[];
  by_ad: AdCount[];
  signups: SignupRow[];
}

// ---- Paid conversions (admin_ad_purchases) — cost-per-subscriber side ----

interface PurchaseTotals {
  subs: number;
  first_payment_subs: number;
  renewals: number;
  attributed: number;
  organic: number;
  revenue: number;
  first_payment_revenue: number;
}

interface AdPurchaseCount {
  utm_content: string;
  utm_campaign: string;
  utm_source: string;
  subs: number;
  first_payment_subs: number;
  revenue: number;
}

interface AdPurchaseData {
  window_days: number;
  totals: PurchaseTotals;
  by_platform: { platform: string; subs: number; first_payment_subs: number; revenue: number }[];
  by_campaign: { utm_campaign: string; utm_source: string; subs: number; first_payment_subs: number; revenue: number }[];
  by_ad: AdPurchaseCount[];
  purchases: unknown[];
}

// ---- Ad spend (admin_ad_spend) — Meta/X platform spend for CAC/ROAS ----

interface AdSpendTotals {
  spend: number;
  currency: string;
  impressions: number;
  clicks: number;
}

interface CampaignSpendRow {
  platform: string;
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
}

interface AdSpendRow {
  platform: string;
  campaign_id: string;
  campaign_name: string;
  ad_id: string;
  ad_name: string;
  spend: number;
  impressions: number;
  clicks: number;
}

interface AdSpendData {
  window_days: number;
  totals: AdSpendTotals;
  by_campaign: CampaignSpendRow[];
  by_ad: AdSpendRow[];
}

type WindowDays = 7 | 30 | 90;

const WINDOW_OPTIONS: WindowDays[] = [7, 30, 90];
const MAX_RECENT_SIGNUPS = 100;
const GOLD = '#C9A646';
// Approximation constant for converting USD revenue into ILS (ad spend is
// reported in ILS by admin_ad_spend). Not a live FX rate — good enough for
// a directional ROAS card. Update if the ILS/USD rate shifts materially.
const ILS_PER_USD = 3.7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a decimal ratio as a percentage string, guarding divide-by-zero. */
function pct(num: number, denom: number): string {
  if (!denom || !Number.isFinite(denom)) return '0%';
  return `${Math.round((num / denom) * 100)}%`;
}

/** Format a USD amount as a whole-dollar string (e.g. $1,234). */
function money(n: number): string {
  return `$${(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Format an ILS amount as a whole-shekel string (e.g. ₪1,234). */
function shekel(n: number): string {
  return `₪${(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Safe division guarding zero/negative/non-finite denominators — returns
 * null (render as em-dash) instead of NaN/Infinity. */
function ratio(numerator: number, denom: number): number | null {
  if (!denom || !Number.isFinite(denom) || denom <= 0) return null;
  const r = numerator / denom;
  return Number.isFinite(r) ? r : null;
}

/** Format a ratio value or em-dash placeholder (used for ₪ metrics). */
function shekelOrDash(n: number | null): string {
  return n === null ? '—' : shekel(n);
}

/** Format a ROAS multiple to 2 significant figures (e.g. 3.2x), or em-dash. */
function roasOrDash(n: number | null): string {
  if (n === null) return '—';
  return `${n.toPrecision(2)}x`;
}

/** Shorten a long URL for a table cell; full value available via title tooltip. */
function shortenUrl(url: string, maxLen = 40): string {
  if (url.length <= maxLen) return url;
  return `${url.slice(0, maxLen - 1)}…`;
}

/** Best-effort human label for a signup row when email is missing. */
function signupLabel(row: SignupRow): string {
  if (row.email) return row.email;
  if (row.display_name) return row.display_name;
  return `${row.user_id.slice(0, 8)}…`;
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AttributionTab() {
  const [days, setDays] = useState<WindowDays>(90);
  const [data, setData] = useState<AdAttributionData | null>(null);
  const [purchaseData, setPurchaseData] = useState<AdPurchaseData | null>(null);
  const [spendData, setSpendData] = useState<AdSpendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Signups (primary) + paid conversions + ad spend (both additive) in parallel.
        const [attribution, purchases, spend] = await Promise.all([
          supabase.rpc('admin_ad_attribution', { p_days: days }),
          supabase.rpc('admin_ad_purchases', { p_days: days }),
          supabase.rpc('admin_ad_spend', { p_days: days }),
        ]);
        if (attribution.error) throw attribution.error;
        if (cancelled) return;
        setData(attribution.data as AdAttributionData);
        // Purchases are additive — a failure here (e.g. RPC not yet deployed)
        // must never blank the whole tab; just hide the revenue columns.
        if (purchases.error) {
          console.error('[AttributionTab] purchases load failed:', purchases.error);
          setPurchaseData(null);
        } else {
          setPurchaseData(purchases.data as AdPurchaseData);
        }
        // Spend is additive too — the sync cron may not have run yet, or the
        // RPC may not be deployed; either way the rest of the tab still works.
        if (spend.error) {
          console.error('[AttributionTab] spend load failed:', spend.error);
          setSpendData(null);
        } else {
          setSpendData(spend.data as AdSpendData);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[AttributionTab] load failed:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load ad attribution data'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const windowToggle = (
    <div className="flex items-center gap-1 bg-[#111111] border border-gray-800 rounded-lg p-1 shrink-0">
      {WINDOW_OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setDays(opt)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            days === opt
              ? 'bg-[#C9A646] text-black font-semibold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {opt}d
        </button>
      ))}
    </div>
  );

  // ---- Header (shown in every state so the toggle stays interactive) ----
  const header = (
    <header className="flex items-start gap-4 flex-wrap justify-between">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-[#C9A646]/10 flex items-center justify-center shrink-0">
          <Megaphone className="w-6 h-6 text-[#C9A646]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">Ad Attribution</h1>
          <p className="text-sm text-gray-400 mt-1">
            Which ads bring signups, paid subscribers, and revenue
          </p>
        </div>
      </div>
      {windowToggle}
    </header>
  );

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="p-8 space-y-6">
        {header}
        <SkeletonStatRow count={3} />
        <SkeletonTable rows={6} cols={3} />
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="p-8 space-y-6">
        {header}
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Ad Attribution failed to load</p>
            <p className="text-sm opacity-80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Empty state ----
  if (!data) {
    return (
      <div className="p-8 space-y-6">
        {header}
        <div className="text-center text-gray-500 text-sm py-8">
          No attribution data available yet.
        </div>
      </div>
    );
  }

  const { totals, by_platform, by_campaign, by_ad, signups } = data;
  const maxPlatform = by_platform.length > 0 ? Math.max(...by_platform.map((p) => p.signups)) : 1;

  // Paid-conversion overlay (additive). When purchaseData is null the revenue
  // columns/cards are hidden — the signup view still renders unchanged.
  const purchaseTotals = purchaseData?.totals ?? null;
  const showRevenue = purchaseData !== null;
  const adPurchaseByKey = new Map<string, { subs: number; revenue: number }>();
  for (const p of purchaseData?.by_ad ?? []) {
    adPurchaseByKey.set(`${p.utm_content}|${p.utm_campaign}|${p.utm_source}`, {
      subs: p.subs,
      revenue: p.revenue,
    });
  }

  // Ad-spend overlay (additive, per-window). Same discipline as above: a
  // failed/undeployed/not-yet-synced admin_ad_spend RPC hides spend/CAC/ROAS
  // columns without touching the rest of the tab.
  const showSpend = spendData !== null;
  const spendTotals = spendData?.totals ?? null;

  // Our discipline names every Meta ad exactly as its utm_content slug, so
  // ad_name === utm_content is the join key. utmContentToCampaign is built
  // from the ATTRIBUTION side's by_ad (signup data) — it tells us which
  // utm_campaign each utm_content belongs to.
  const utmContentToCampaign = new Map<string, string>();
  for (const a of by_ad) {
    if (a.utm_content) utmContentToCampaign.set(a.utm_content, a.utm_campaign ?? '');
  }

  // Per-ad spend: sum Meta spend rows whose ad_name matches this utm_content
  // (an ad can appear more than once, e.g. split across ad sets/platforms).
  const spendByAdName = new Map<string, number>();
  for (const s of spendData?.by_ad ?? []) {
    spendByAdName.set(s.ad_name, (spendByAdName.get(s.ad_name) ?? 0) + (s.spend || 0));
  }

  // Per-campaign spend: for each utm_content we know about, if a Meta ad
  // with that exact name spent money, attribute that spend to the
  // ATTRIBUTION campaign the utm_content belongs to (not the Meta campaign
  // it happened to run under — the two can diverge, e.g. an ad reused
  // across ad sets).
  const spendByCampaignName = new Map<string, number>();
  for (const [utmContent, utmCampaign] of utmContentToCampaign) {
    const matchedSpend = spendByAdName.get(utmContent);
    if (matchedSpend) {
      spendByCampaignName.set(utmCampaign, (spendByCampaignName.get(utmCampaign) ?? 0) + matchedSpend);
    }
  }

  // Money must never silently disappear: any Meta campaign whose ads never
  // matched a known utm_content (e.g. an engagement boost of an organic
  // post, run outside our tagging discipline) is surfaced as its own row.
  const allKnownUtmContent = new Set(utmContentToCampaign.keys());
  const unattributedCampaigns: { campaign_name: string; spend: number }[] = [];
  for (const c of spendData?.by_campaign ?? []) {
    const ownAds = (spendData?.by_ad ?? []).filter((a) => a.campaign_id === c.campaign_id);
    const hasKnownAd = ownAds.some((a) => allKnownUtmContent.has(a.ad_name));
    if (!hasKnownAd && c.spend > 0) {
      unattributedCampaigns.push({ campaign_name: c.campaign_name || c.campaign_id, spend: c.spend });
    }
  }

  // Per-campaign paid-conversion lookup (for CAC/ROAS by campaign).
  const campaignPurchaseByKey = new Map<string, { first_payment_subs: number; revenue: number }>();
  for (const p of purchaseData?.by_campaign ?? []) {
    campaignPurchaseByKey.set(`${p.utm_campaign}|${p.utm_source}`, {
      first_payment_subs: p.first_payment_subs,
      revenue: p.revenue,
    });
  }

  // KPI-level metrics.
  const spendTotal = spendTotals?.spend ?? 0;
  const costPerSignup = spendTotals ? ratio(spendTotal, totals.attributed) : null;
  const cac = spendTotals ? ratio(spendTotal, purchaseTotals?.first_payment_subs ?? 0) : null;
  const roasValue = spendTotals
    ? ratio((purchaseTotals?.revenue ?? 0) * ILS_PER_USD, spendTotal)
    : null;
  const hasCampaignRows = by_campaign.length > 0 || unattributedCampaigns.length > 0;

  const recentSignups = [...signups]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, MAX_RECENT_SIGNUPS);

  return (
    <div className="p-8 space-y-6">
      {header}

      {/* ---- KPI cards ---- */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total Signups"
          value={totals.signups.toLocaleString('en-US')}
          subtitle={`last ${data.window_days}d`}
          icon={Users}
        />
        <StatsCard
          title="Attributed"
          value={totals.attributed.toLocaleString('en-US')}
          subtitle={`${pct(totals.attributed, totals.signups)} of total — from ads or tagged links`}
          icon={Target}
        />
        <StatsCard
          title="Organic / Direct"
          value={totals.organic.toLocaleString('en-US')}
          subtitle={`${pct(totals.organic, totals.signups)} of total`}
          icon={Compass}
        />
      </section>

      {/* ---- Revenue KPI cards (paid conversions) ---- */}
      {purchaseTotals && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            title="Paid Subscribers"
            value={purchaseTotals.subs.toLocaleString('en-US')}
            subtitle={`${purchaseTotals.first_payment_subs.toLocaleString('en-US')} new · ${purchaseTotals.renewals.toLocaleString('en-US')} renewals`}
            icon={CreditCard}
          />
          <StatsCard
            title="Revenue"
            value={money(purchaseTotals.revenue)}
            subtitle={`${money(purchaseTotals.first_payment_revenue)} from new subs · last ${data.window_days}d`}
            icon={DollarSign}
          />
          <StatsCard
            title="Signup → Paid"
            value={pct(purchaseTotals.subs, totals.signups)}
            subtitle={`${purchaseTotals.subs.toLocaleString('en-US')} paid of ${totals.signups.toLocaleString('en-US')} signups`}
            icon={Target}
          />
        </section>
      )}

      {/* ---- Ad spend / CAC / ROAS KPI cards ---- */}
      {spendTotals && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Ad Spend"
            value={shekel(spendTotal)}
            subtitle={`${spendTotals.impressions.toLocaleString('en-US')} impr · ${spendTotals.clicks.toLocaleString('en-US')} clicks · last ${data.window_days}d`}
            icon={Wallet}
          />
          <StatsCard
            title="Cost / Signup"
            value={shekelOrDash(costPerSignup)}
            subtitle={`spend ÷ ${totals.attributed.toLocaleString('en-US')} attributed signups`}
            icon={Target}
          />
          <StatsCard
            title="CAC"
            value={shekelOrDash(cac)}
            subtitle={`spend ÷ ${(purchaseTotals?.first_payment_subs ?? 0).toLocaleString('en-US')} new paid subs`}
            icon={DollarSign}
          />
          <StatsCard
            title="ROAS (approx)"
            value={roasOrDash(roasValue)}
            subtitle={`revenue × ${ILS_PER_USD} (USD→ILS) ÷ spend`}
            icon={Gauge}
          />
        </section>
      )}

      {/* ---- Signups by platform ---- */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-[#C9A646]" />
          <h3 className="text-white font-semibold">Signups by Platform</h3>
        </header>
        {by_platform.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No platform data yet.</p>
        ) : (
          <ul className="px-5 py-4 space-y-3">
            {by_platform.map((p) => {
              const barPct = maxPlatform > 0 ? Math.round((p.signups / maxPlatform) * 100) : 0;
              return (
                <li key={p.platform}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm text-gray-200 truncate flex-1 pr-3">
                      {p.platform}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0 pr-3">
                      {pct(p.signups, totals.signups)}
                    </span>
                    <span className="text-xs text-[#C9A646] font-semibold shrink-0">
                      {p.signups.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${barPct}%`, backgroundColor: GOLD, opacity: 0.7 }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---- By campaign ---- */}
      {!hasCampaignRows ? (
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#C9A646]" />
            <h3 className="text-white font-semibold">By Campaign</h3>
          </header>
          <p className="text-sm text-gray-500 text-center py-8">
            No campaign-tagged signups in this window yet.
          </p>
        </section>
      ) : (
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#C9A646]" />
            <h3 className="text-white font-semibold">By Campaign</h3>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-800">
                  <th className="px-5 py-2 font-medium">Campaign</th>
                  <th className="px-5 py-2 font-medium">Source</th>
                  <th className="px-5 py-2 font-medium text-right">Signups</th>
                  {showSpend && <th className="px-5 py-2 font-medium text-right">Spend</th>}
                  {showSpend && <th className="px-5 py-2 font-medium text-right">Cost/Signup</th>}
                  {showSpend && <th className="px-5 py-2 font-medium text-right">CAC</th>}
                  {showSpend && <th className="px-5 py-2 font-medium text-right">ROAS</th>}
                </tr>
              </thead>
              <tbody>
                {by_campaign.map((c, idx) => {
                  const cSpend = spendByCampaignName.get(c.utm_campaign) ?? 0;
                  const cPurchase = campaignPurchaseByKey.get(`${c.utm_campaign}|${c.utm_source}`);
                  const cCostPerSignup = ratio(cSpend, c.signups);
                  const cCac = ratio(cSpend, cPurchase?.first_payment_subs ?? 0);
                  const cRoas = ratio((cPurchase?.revenue ?? 0) * ILS_PER_USD, cSpend);
                  return (
                    <tr
                      key={`${c.utm_campaign}-${c.utm_source}-${idx}`}
                      className="border-b border-gray-900 last:border-0"
                    >
                      <td className="px-5 py-2.5 text-gray-200">{c.utm_campaign || '—'}</td>
                      <td className="px-5 py-2.5 text-gray-400">{c.utm_source || '—'}</td>
                      <td className="px-5 py-2.5 text-right text-[#C9A646] font-semibold">
                        {c.signups.toLocaleString('en-US')}
                      </td>
                      {showSpend && (
                        <td className="px-5 py-2.5 text-right text-gray-200">{shekel(cSpend)}</td>
                      )}
                      {showSpend && (
                        <td className="px-5 py-2.5 text-right text-gray-400">
                          {shekelOrDash(cCostPerSignup)}
                        </td>
                      )}
                      {showSpend && (
                        <td className="px-5 py-2.5 text-right text-gray-400">{shekelOrDash(cCac)}</td>
                      )}
                      {showSpend && (
                        <td className="px-5 py-2.5 text-right text-gray-400">{roasOrDash(cRoas)}</td>
                      )}
                    </tr>
                  );
                })}
                {showSpend &&
                  unattributedCampaigns.map((u, idx) => (
                    <tr
                      key={`unattributed-${u.campaign_name}-${idx}`}
                      className="border-b border-gray-900 last:border-0"
                    >
                      <td className="px-5 py-2.5 text-gray-500 italic">
                        {u.campaign_name || '—'}
                        <span className="ml-2 text-xs text-gray-600">(unattributed spend)</span>
                      </td>
                      <td className="px-5 py-2.5 text-gray-600">—</td>
                      <td className="px-5 py-2.5 text-right text-gray-600">—</td>
                      <td className="px-5 py-2.5 text-right text-gray-400">{shekel(u.spend)}</td>
                      <td className="px-5 py-2.5 text-right text-gray-600">—</td>
                      <td className="px-5 py-2.5 text-right text-gray-600">—</td>
                      <td className="px-5 py-2.5 text-right text-gray-600">—</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---- By ad ---- */}
      {by_ad.length === 0 ? (
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#C9A646]" />
            <h3 className="text-white font-semibold">By Ad</h3>
          </header>
          <p className="text-sm text-gray-500 text-center py-8">
            No ad-level attribution yet — make sure each ad URL carries utm_content.
          </p>
        </section>
      ) : (
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#C9A646]" />
            <h3 className="text-white font-semibold">By Ad</h3>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-800">
                  <th className="px-5 py-2 font-medium">Ad</th>
                  <th className="px-5 py-2 font-medium">Campaign</th>
                  <th className="px-5 py-2 font-medium">Source</th>
                  <th className="px-5 py-2 font-medium text-right">Signups</th>
                  {showSpend && <th className="px-5 py-2 font-medium text-right">Spend</th>}
                  {showSpend && <th className="px-5 py-2 font-medium text-right">Cost/Signup</th>}
                  {showRevenue && <th className="px-5 py-2 font-medium text-right">Paid Subs</th>}
                  {showRevenue && <th className="px-5 py-2 font-medium text-right">Revenue</th>}
                  {showRevenue && <th className="px-5 py-2 font-medium text-right">ARPU</th>}
                </tr>
              </thead>
              <tbody>
                {by_ad.map((a, idx) => {
                  const pu = adPurchaseByKey.get(`${a.utm_content}|${a.utm_campaign}|${a.utm_source}`);
                  const subs = pu?.subs ?? 0;
                  const rev = pu?.revenue ?? 0;
                  const aSpend = spendByAdName.get(a.utm_content) ?? 0;
                  const aCostPerSignup = ratio(aSpend, a.signups);
                  return (
                    <tr
                      key={`${a.utm_content}-${a.utm_campaign}-${idx}`}
                      className="border-b border-gray-900 last:border-0"
                    >
                      <td className="px-5 py-2.5 text-gray-200">{a.utm_content || '—'}</td>
                      <td className="px-5 py-2.5 text-gray-400">{a.utm_campaign || '—'}</td>
                      <td className="px-5 py-2.5 text-gray-400">{a.utm_source || '—'}</td>
                      <td className="px-5 py-2.5 text-right text-[#C9A646] font-semibold">
                        {a.signups.toLocaleString('en-US')}
                      </td>
                      {showSpend && (
                        <td className="px-5 py-2.5 text-right text-gray-200">{shekel(aSpend)}</td>
                      )}
                      {showSpend && (
                        <td className="px-5 py-2.5 text-right text-gray-400">
                          {shekelOrDash(aCostPerSignup)}
                        </td>
                      )}
                      {showRevenue && (
                        <>
                          <td className="px-5 py-2.5 text-right text-gray-200">
                            {subs.toLocaleString('en-US')}
                          </td>
                          <td className="px-5 py-2.5 text-right text-gray-200">{money(rev)}</td>
                          <td className="px-5 py-2.5 text-right text-gray-400">
                            {subs > 0 ? money(rev / subs) : '—'}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---- Recent signups ---- */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
          <Info className="w-4 h-4 text-[#C9A646]" />
          <h3 className="text-white font-semibold">Recent Signups</h3>
          {signups.length > MAX_RECENT_SIGNUPS && (
            <span className="text-xs text-gray-500 ml-auto">
              showing latest {MAX_RECENT_SIGNUPS} of {signups.length.toLocaleString('en-US')}
            </span>
          )}
        </header>
        {recentSignups.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No signups in this window yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-800">
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">User</th>
                  <th className="px-5 py-2 font-medium">Platform</th>
                  <th className="px-5 py-2 font-medium">Source</th>
                  <th className="px-5 py-2 font-medium">Campaign</th>
                  <th className="px-5 py-2 font-medium">Ad</th>
                  <th className="px-5 py-2 font-medium">Referrer</th>
                  <th className="px-5 py-2 font-medium">Landing Page</th>
                </tr>
              </thead>
              <tbody>
                {recentSignups.map((row) => (
                  <tr key={row.user_id} className="border-b border-gray-900 last:border-0">
                    <td className="px-5 py-2.5 text-gray-400 whitespace-nowrap">
                      {formatTs(row.ts)}
                    </td>
                    <td className="px-5 py-2.5 text-gray-200">{signupLabel(row)}</td>
                    <td className="px-5 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-[#C9A646]/10 text-[#C9A646] border border-[#C9A646]/20">
                        {row.platform}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-gray-400">{row.utm_source || '—'}</td>
                    <td className="px-5 py-2.5 text-gray-400">{row.utm_campaign || '—'}</td>
                    <td className="px-5 py-2.5 text-gray-400">{row.utm_content || '—'}</td>
                    <td
                      className="px-5 py-2.5 text-gray-500 font-mono text-xs max-w-[200px] truncate"
                      title={row.referrer || undefined}
                    >
                      {row.referrer ? shortenUrl(row.referrer) : '—'}
                    </td>
                    <td
                      className="px-5 py-2.5 text-gray-500 font-mono text-xs max-w-[200px] truncate"
                      title={row.landing_page || undefined}
                    >
                      {row.landing_page ? shortenUrl(row.landing_page) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AttributionTab;
