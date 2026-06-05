// src/pages/academy/AcademyIndex.tsx
// The Academy cover page: notebook front + topic hubs + the learning path,
// grouped into two tiers (Basics — free, Deep Dives — members).
import { useEffect } from "react";
import { AcademyLayout } from "@/components/academy/AcademyLayout";
import { ModuleTile } from "@/components/academy/ModuleTile";
import {
  TOPICS,
  BASICS_MODULES,
  DEEP_MODULES,
  TOTAL_CHAPTERS,
  TOTAL_MODULES,
  type Module,
} from "@/content/academy/curriculum";

function ModuleGrid({ modules }: { modules: Module[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((module) => (
        <ModuleTile
          key={module.slug}
          to={`/academy/${module.slug}`}
          image={module.image}
          imageLabel={`✎ ${module.title}`}
          eyebrow={`${module.chapters.length} chapters`}
          title={module.title}
          subtitle={module.subtitle}
        />
      ))}
    </div>
  );
}

export default function AcademyIndex() {
  useEffect(() => {
    document.title = "Academy — Finotaur";
  }, []);

  return (
    <AcademyLayout>
      {/* Cover */}
      <header className="mx-auto max-w-5xl px-5 pb-4 pt-12 text-center sm:pt-16">
        <span className="academy-eyebrow text-[1.6rem]">your trading notebook</span>
        <h1 className="mt-3 text-[2.8rem] leading-[1.05] sm:text-[4rem]">Finotaur Academy</h1>
        <p className="mx-auto mt-4 max-w-2xl text-[1.2rem] leading-snug text-[var(--ink-soft)]">
          Everything we know about markets, written in plain words — from your first dollar to
          institutional order flow. {TOTAL_MODULES} modules, {TOTAL_CHAPTERS} chapters.
        </p>
        <p className="academy-hand mt-3 text-[1.4rem]">Browse by topic, or follow the path ↓</p>
      </header>

      {/* Browse by topic — the encyclopedia axis */}
      <section className="mx-auto max-w-6xl px-5 pt-6">
        <div className="mb-5 flex items-baseline gap-3">
          <h2 className="text-[2rem]">Browse by topic</h2>
          <span className="academy-hand text-[1.3rem]">the trader's encyclopedia</span>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TOPICS.map((topic) => (
            <ModuleTile
              key={topic.slug}
              to={`/academy/topics/${topic.slug}`}
              image={topic.image}
              imageLabel={`✎ ${topic.title}`}
              eyebrow={`${topic.chapters.length} entries`}
              title={topic.title}
              subtitle={topic.subtitle}
            />
          ))}
        </div>
      </section>

      {/* Tier 1 — Basics & Essentials (free) */}
      <section className="mx-auto max-w-6xl px-5 pt-12">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <h2 className="text-[2rem]">Basics &amp; Essentials</h2>
          <span className="rounded-full border border-[rgba(120,90,40,0.3)] bg-[#fffdf5] px-3 py-0.5 text-[0.8rem] font-semibold text-[var(--gold-deep)]">
            Free for everyone
          </span>
        </div>
        <p className="mb-5 max-w-2xl text-[1.1rem] leading-snug text-[var(--ink-soft)]">
          Start here. The foundations every investor and trader needs — money, markets, analysis,
          risk, and the practical essentials.
        </p>
        <ModuleGrid modules={BASICS_MODULES} />
      </section>

      {/* Tier 2 — Deep Dives (members) */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <h2 className="text-[2rem]">Deep Dives</h2>
          <span className="rounded-full border border-[rgba(176,131,22,0.4)] bg-[#fff7d6] px-3 py-0.5 text-[0.8rem] font-semibold text-[var(--gold-deep)]">
            🔒 Members — first chapter free
          </span>
        </div>
        <p className="mb-5 max-w-2xl text-[1.1rem] leading-snug text-[var(--ink-soft)]">
          The serious depth — options, order flow, smart money, the asset deep-dives, and building a
          real trading system. The first chapter of each is free; the rest unlock with any Finotaur
          plan from Basic up.
        </p>
        <ModuleGrid modules={DEEP_MODULES} />
      </section>
    </AcademyLayout>
  );
}
