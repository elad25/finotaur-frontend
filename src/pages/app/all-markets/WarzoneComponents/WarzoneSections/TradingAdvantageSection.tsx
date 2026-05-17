/**
 * "More Than A Briefing. A Trading Advantage." — Discord + Trading Room cards.
 */

import { Crown } from "lucide-react";
import { DiscordIcon } from "../VisualComponents";
import { SectionEyebrow, SectionTitle } from "./_shared";

interface CommunityCard {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tag: string;
  body: string;
  avatars: number;
  extra: string;
}

const CARDS: CommunityCard[] = [
  {
    icon: DiscordIcon,
    title: "Private Discord Community",
    tag: "Exclusive",
    body: "Not beginners. Real traders who share ideas, not noise.",
    avatars: 6,
    extra: "+842",
  },
  {
    icon: Crown,
    title: "Finotaur Trading Room",
    tag: "Exclusive",
    body: "Live analysis, real-time alerts, and the context behind every move.",
    avatars: 6,
    extra: "+618",
  },
];

function AvatarStack({ count, extra }: { count: number; extra: string }) {
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className="w-7 h-7 rounded-full border-[1.5px] border-surface-base bg-gradient-gold"
            style={{
              filter: `hue-rotate(${i * 18}deg) brightness(${0.8 + (i % 3) * 0.1})`,
            }}
          />
        ))}
      </div>
      <span className="ml-3 px-2 py-0.5 rounded-full bg-gradient-gold text-ink-on-gold text-[11px] font-semibold">
        {extra}
      </span>
    </div>
  );
}

export default function TradingAdvantageSection() {
  return (
    <section className="relative w-full">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-4">
            <SectionEyebrow showDot>More than a briefing</SectionEyebrow>
            <SectionTitle className="mt-3">
              <span className="block text-ink-primary">More Than A Briefing.</span>
              <span
                className="block"
                style={{
                  background:
                    "linear-gradient(135deg, #E8C766 0%, #F4D97B 50%, #C9A646 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                A Trading Advantage.
              </span>
            </SectionTitle>
            <p className="mt-5 text-ink-secondary text-sm leading-relaxed max-w-[320px]">
              Join a community of serious traders and get exclusive access to
              everything we use to stay ahead.
            </p>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-5 hover:border-gold-border transition-colors duration-base"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-[10px] border-[0.5px] border-gold-border bg-surface-2 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gold-primary" />
                    </div>
                    <span className="font-sans text-[10px] uppercase tracking-[1.5px] text-gold-primary border-[0.5px] border-gold-border rounded-full px-2 py-0.5">
                      {card.tag}
                    </span>
                  </div>
                  <div className="font-sans text-[10px] uppercase tracking-[2px] text-ink-tertiary mb-2">
                    {card.title}
                  </div>
                  <p className="text-sm text-ink-primary leading-relaxed mb-5">
                    {card.body}
                  </p>
                  <AvatarStack count={card.avatars} extra={card.extra} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
