/**
 * "Choose Your Access" — dual-card pricing layout.
 *
 * Card 1: WAR ZONE standalone ($69.99/mo with 7-day free trial)
 * Card 2: FINOTAUR PLATFORM bundle ($89/mo, BEST VALUE)
 *
 * Both cards use existing checkout handlers — no business logic changes here.
 */

import { Crown, Target, Check, Shield, Clock, X as XIcon } from "lucide-react";
import { Button } from "@/components/ds/Button";
import {
  BillingToggle,
  CONFIG,
  YEARLY_SAVINGS,
  type BillingInterval,
} from "../WarzonelandingComponents";
import { SectionEyebrow, SectionTitle, GoldRule } from "./_shared";

interface Props {
  onSubscribe: () => void;
  billingInterval: BillingInterval;
  setBillingInterval: (v: BillingInterval) => void;
  onBundleSubscribe?: () => void;
  onBundleSubscribeYearly?: () => void;
}

// FINOTAUR Platform Bundle prices (source: TopSecretLanding.tsx FINOTAUR_PRICES)
const FINOTAUR_MONTHLY = 89;
const FINOTAUR_YEARLY = 890;
const FINOTAUR_YEARLY_PER_MONTH = Math.round(FINOTAUR_YEARLY / 12); // = 74

const WAR_ZONE_FEATURES = [
  "Daily briefing before the market opens",
  "Macro, sector flow, risk tone and key levels",
  "Actionable market context in one clear morning read",
  "Private community and trading room access",
];

const PLATFORM_FEATURES = [
  "Everything in Top Secret",
  "Top Secret research and premium reports",
  "Journal Premium and trading workflow tools",
  "AI tools, platform intelligence and broader trader suite",
];

const TRUST_ITEMS = [
  { icon: Shield, label: "Secure payment" },
  { icon: Clock, label: "Free trial available" },
  { icon: XIcon, label: "Cancel anytime" },
];

function PriceTag({
  amount,
  cents,
  suffix,
}: {
  amount: string;
  cents?: string;
  suffix: string;
}) {
  return (
    <div className="flex items-end gap-1">
      <span
        className="text-6xl md:text-7xl leading-none text-ink-primary tabular-nums"
        style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, letterSpacing: '-0.02em' }}
      >
        ${amount}
      </span>
      {cents && (
        <span
          className="text-2xl md:text-3xl leading-none text-ink-secondary -translate-y-1 tabular-nums"
          style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, letterSpacing: '-0.01em' }}
        >
          .{cents}
        </span>
      )}
      <span className="font-sans text-sm text-ink-tertiary mb-2 ml-1">
        /{suffix}
      </span>
    </div>
  );
}

export default function PricingSection({
  onSubscribe,
  billingInterval,
  setBillingInterval,
  onBundleSubscribe,
  onBundleSubscribeYearly,
}: Props) {
  const isYearly = billingInterval === "yearly";

  const warZoneAmount = isYearly
    ? Math.round(CONFIG.YEARLY_PRICE / 12).toString()
    : Math.floor(CONFIG.MONTHLY_PRICE).toString();
  const warZoneCents = isYearly ? undefined : "99";

  const platformAmount = isYearly
    ? FINOTAUR_YEARLY_PER_MONTH.toString()
    : FINOTAUR_MONTHLY.toString();

  // Pick the right bundle handler based on billing interval — falls back to
  // monthly handler if yearly handler not provided.
  const platformCta = isYearly
    ? (onBundleSubscribeYearly ?? onBundleSubscribe ?? onSubscribe)
    : (onBundleSubscribe ?? onSubscribe);

  return (
    <section
      id="pricing"
      className="relative w-full"
    >
      <GoldRule />
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-[0.5px] border-gold-border bg-surface-1">
            <Crown
              className="w-3.5 h-3.5 text-gold-primary"
              strokeWidth={1.5}
            />
            <SectionEyebrow className="text-[11px]">
              Choose your access
            </SectionEyebrow>
          </div>

          <SectionTitle size="large" className="mt-5">
            <span className="block">Top Secret Alone.</span>
            <span className="block">
              Or the{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #E8C766 0%, #F4D97B 50%, #C9A646 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Full Platform.
              </span>
            </span>
          </SectionTitle>

          <p className="mt-5 text-ink-secondary text-base leading-relaxed">
            Pick the intelligence layer you need now.
            <br />
            Upgrade when you want the complete Finotaur ecosystem around it.
          </p>

          <div className="mt-8">
            <BillingToggle
              selected={billingInterval}
              onChange={setBillingInterval}
            />
            {isYearly && (
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-gold-primary">
                <span>Save ${YEARLY_SAVINGS} per year</span>
              </div>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* WAR ZONE CARD */}
          <div className="relative rounded-[16px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-8 hover:border-gold-border transition-colors duration-base">
            <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center">
              <Target
                className="w-5 h-5 text-ink-on-gold"
                strokeWidth={1.8}
              />
            </div>

            <div className="mt-5 font-sans text-[11px] uppercase tracking-[2px] text-gold-primary">
              Top Secret
            </div>
            <div
              className="mt-2 text-2xl md:text-3xl text-ink-primary leading-tight uppercase"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, letterSpacing: '-0.01em' }}
            >
              Daily Market Briefing
            </div>
            <p className="mt-3 text-ink-secondary text-sm leading-relaxed">
              Institutional-grade market intelligence
              <br />
              before the opening bell.
            </p>

            <div className="my-6 border-t-[0.5px] border-border-ds-subtle" />

            <PriceTag
              amount={warZoneAmount}
              cents={warZoneCents}
              suffix={isYearly ? "month, billed yearly" : "month"}
            />
            <div className="mt-2 text-gold-primary text-sm">
              7-day free trial. Cancel anytime.
            </div>

            <div className="mt-6">
              <Button
                variant="gold"
                size="full"
                onClick={onSubscribe}
                showArrow={false}
              >
                <span className="inline-flex items-center justify-center gap-2 w-full">
                  Start Top Secret
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </Button>
            </div>

            <ul className="mt-6 flex flex-col gap-3">
              {WAR_ZONE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full border-[0.5px] border-gold-border bg-surface-2 flex items-center justify-center shrink-0 mt-0.5">
                    <Check
                      className="w-3 h-3 text-gold-primary"
                      strokeWidth={2}
                    />
                  </span>
                  <span className="text-ink-secondary">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* FINOTAUR PLATFORM CARD */}
          <div className="relative rounded-[16px] border-[0.5px] border-gold-primary bg-surface-1 p-8 shadow-[0_24px_60px_-24px_rgba(201,166,70,0.4)]">
            <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-gradient-gold text-ink-on-gold font-sans text-[10px] uppercase tracking-[1.5px] font-semibold shadow-btn-gold">
              Best Value
            </div>

            <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center">
              <Crown
                className="w-5 h-5 text-ink-on-gold"
                strokeWidth={1.8}
              />
            </div>

            <div className="mt-5 font-sans text-[11px] uppercase tracking-[2px] text-gold-primary">
              Finotaur Platform
            </div>
            <div
              className="mt-2 text-2xl md:text-3xl text-ink-primary leading-tight uppercase"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, letterSpacing: '-0.01em' }}
            >
              Complete Trading Ecosystem
            </div>
            <p className="mt-3 text-ink-secondary text-sm leading-relaxed">
              The wider Finotaur platform for traders
              <br />
              who want the full operating layer.
            </p>

            <div className="my-6 border-t-[0.5px] border-gold-border" />

            <PriceTag
              amount={platformAmount}
              suffix={isYearly ? "month, billed yearly" : "month"}
            />
            <div className="mt-2 text-gold-primary text-sm">
              {isYearly
                ? `$${FINOTAUR_YEARLY}/year · Save $${FINOTAUR_MONTHLY * 12 - FINOTAUR_YEARLY}`
                : "Includes the broader platform suite."}
            </div>

            <div className="mt-6">
              <Button
                variant="gold"
                size="full"
                onClick={platformCta}
                showArrow={false}
              >
                <span className="inline-flex items-center justify-center gap-2 w-full">
                  Start Finotaur
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </Button>
            </div>

            <ul className="mt-6 flex flex-col gap-3">
              {PLATFORM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full border-[0.5px] border-gold-border bg-surface-2 flex items-center justify-center shrink-0 mt-0.5">
                    <Check
                      className="w-3 h-3 text-gold-primary"
                      strokeWidth={2}
                    />
                  </span>
                  <span className="text-ink-primary">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-14">
          <GoldRule />
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-3 py-6">
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-ink-secondary"
                >
                  <Icon
                    className="w-4 h-4 text-gold-primary"
                    strokeWidth={1.5}
                  />
                  <span className="font-sans text-sm">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
