// src/pages/app/journal/finotaur-ai/components/UpsellGate.tsx
// Free-tier gate — zero API calls. Pure static UI.
// One gold CTA max (upgrade). No green. Sentence case CTAs.

import * as React from 'react';
import {
  Crown,
  ArrowRight,
  Gauge,
  BarChart3,
  Brain,
  Pencil,
  FileText,
  Users,
  Shield,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FeatureRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureRow({ icon, title, description }: FeatureRowProps) {
  return (
    <div className="flex items-start gap-ds-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-border bg-surface-1">
        {icon}
      </div>
      <div>
        <p className="text-body font-semibold text-ink-primary">{title}</p>
        <p className="text-small leading-snug text-ink-secondary">{description}</p>
      </div>
    </div>
  );
}

interface TrustItemProps {
  children: React.ReactNode;
  className?: string;
}

function TrustItem({ children, className = '' }: TrustItemProps) {
  return (
    <div className={`flex items-center gap-ds-3 sm:px-ds-4 ${className}`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function UpsellGate() {
  return (
    <div className="flex flex-col gap-ds-6">
      {/* (A) TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 gap-ds-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">

        {/* LEFT: Hero copy + CTA */}
        <Card variant="featured" padding="spacious">
          {/* Title */}
          <h2 className="text-[40px] font-semibold leading-tight text-ink-primary">
            Your <span className="text-gold-primary">AI</span> Trading Coach
          </h2>
          <div className="mt-ds-2 h-[3px] w-12 rounded-full bg-gold-primary" />

          {/* Body copy */}
          <p className="mt-ds-4 text-body leading-relaxed text-ink-secondary">
            Premium members get a personalized{' '}
            <span className="font-medium text-gold-primary">FINOTAUR Score</span>
            {' '}— a single number that distills your win rate, risk management,
            consistency, and recovery into one performance benchmark that improves
            every session.
          </p>

          <p className="mt-ds-3 text-body leading-relaxed text-ink-secondary">
            Your AI Coach reviews every trade, spots recurring patterns, and delivers
            daily briefings with{' '}
            <span className="font-semibold text-ink-primary">ranked insights</span>
            {' '}— telling you what to work on first, not just what happened. It can
            propose trade edits, add missing context, and update your journal with
            your confirmation.
          </p>

          {/* Tagline */}
          <div className="mt-ds-4">
            <p className="text-body font-semibold text-gold-primary">
              No guesswork. No noise.
            </p>
            <p className="text-body text-ink-secondary">
              A coach that learns your edge and holds you to it.
            </p>
          </div>

          {/* CTA row */}
          <div className="mt-ds-6 flex flex-wrap items-center gap-ds-5">
            {/* Gold CTA — asChild suppresses Button's built-in arrow; Crown + ArrowRight added manually */}
            <Button variant="gold" size="default" asChild>
              <Link to="/app/upgrade" className="inline-flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Upgrade to Premium
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            {/* Guarantee */}
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gold-primary" />
              <div>
                <p className="text-small font-semibold uppercase tracking-wide text-gold-primary">
                  14-Day Money Back Guarantee
                </p>
                <p className="text-small text-ink-tertiary">
                  Cancel anytime. No questions asked.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* RIGHT: Bull image + feature list */}
        <div className="flex flex-col gap-ds-5">
          {/* Bull image — rendered as-is (the asset is already on black); no blend
              so it shows exactly like the source PNG (warm glow preserved). */}
          <img
            src="/bull-ai-coach-v2.png"
            alt="FINOTAUR AI bull"
            className="mx-auto w-full max-w-[420px] object-contain lg:ml-auto lg:mr-0 lg:translate-x-[-28px] lg:translate-y-4"
          />

          {/* Feature list — pulled up to tighten the gap under the bull */}
          <div className="flex flex-col gap-ds-4 lg:-translate-y-4">
            <FeatureRow
              icon={<Gauge className="h-5 w-5 text-gold-primary" />}
              title="Personalized FINOTAUR Score"
              description="Track your edge with one clear number that improves as you do."
            />
            <FeatureRow
              icon={<BarChart3 className="h-5 w-5 text-gold-primary" />}
              title="Daily AI Briefings"
              description="Ranked insights on what to fix first — delivered every day based on your recent trades."
            />
            <FeatureRow
              icon={<Brain className="h-5 w-5 text-gold-primary" />}
              title="Pattern Recognition"
              description="AI spots your recurring strengths and leaks across all markets and timeframes."
            />
            <FeatureRow
              icon={<Pencil className="h-5 w-5 text-gold-primary" />}
              title="Smart Trade Suggestions"
              description="Proposed edits and missing context to elevate your decision-making."
            />
            <FeatureRow
              icon={<FileText className="h-5 w-5 text-gold-primary" />}
              title="AI-Powered Journal"
              description="Your journal, automatically enriched and kept up to date by your AI Coach."
            />
          </div>
        </div>
      </div>

      {/* (B) TRUST BAR */}
      <Card variant="default" padding="default">
        <div className="grid grid-cols-1 gap-ds-5 sm:grid-cols-3 sm:divide-x sm:divide-white/10">
          <TrustItem>
            <Users className="h-6 w-6 shrink-0 text-gold-primary" />
            <div>
              <p className="text-body font-semibold text-gold-primary">
                Trusted by serious traders
              </p>
              <p className="text-small text-ink-secondary">
                Join thousands of premium members improving their edge every day.
              </p>
            </div>
          </TrustItem>

          <TrustItem className="justify-center text-center">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <span className="text-h2 font-semibold text-ink-primary">4.9</span>
                <div className="flex items-center gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-gold-primary text-gold-primary" />
                  ))}
                </div>
              </div>
              <p className="text-small text-ink-secondary">
                Average rating by premium members
              </p>
            </div>
          </TrustItem>

          <TrustItem>
            <Shield className="h-6 w-6 shrink-0 text-gold-primary" />
            <div>
              <p className="text-body font-semibold text-gold-primary">
                Your data is secure
              </p>
              <p className="text-small text-ink-secondary">
                End-to-end encryption. We never share your data.
              </p>
            </div>
          </TrustItem>
        </div>
      </Card>
    </div>
  );
}
