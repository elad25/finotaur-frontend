/**
 * Final CTA band — gold-rule bookended strip with "START NOW" gold button.
 */

import { Button } from "@/components/ds/Button";
import { CompassIcon } from "../VisualComponents";
import { GoldRule } from "./_shared";

interface Props {
  onSubscribe: () => void;
}

export default function FinalCTABand({ onSubscribe }: Props) {
  return (
    <section
      className="relative w-full"
      style={{
        background:
          'radial-gradient(ellipse 900px 200px at 50% 50%, rgba(201,166,70,0.15) 0%, transparent 70%)',
      }}
    >
      <GoldRule />
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <div className="flex flex-col md:flex-row items-center md:justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-full border-[0.5px] border-gold-border bg-surface-1 flex items-center justify-center">
              <CompassIcon className="w-6 h-6 text-gold-primary" />
            </div>
            <div>
              <div
                className="text-2xl md:text-3xl text-ink-primary leading-tight uppercase"
                style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, letterSpacing: '-0.01em' }}
              >
                Start Your 7 Day Free Trial
              </div>
              <div className="font-sans text-sm text-ink-secondary mt-1">
                Join 847+ traders who start their day with an edge.
              </div>
            </div>
          </div>

          <Button
            variant="gold"
            size="xl"
            onClick={onSubscribe}
            showArrow={false}
          >
            <span className="inline-flex items-center gap-2">
              Start now
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
      </div>
      <GoldRule />
    </section>
  );
}
