// src/pages/academy/AcademyIndex.tsx
// The Academy cover page: a notebook front + grid of 14 module tiles.
import { useEffect } from "react";
import { AcademyLayout } from "@/components/academy/AcademyLayout";
import { ModuleTile } from "@/components/academy/ModuleTile";
import { CURRICULUM, TOPICS, TOTAL_CHAPTERS, TOTAL_MODULES } from "@/content/academy/curriculum";

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
          institutional order flow. {TOTAL_MODULES} modules, {TOTAL_CHAPTERS} chapters, free to read.
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

      {/* The full learning path — modules in order */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-5 flex items-baseline gap-3">
          <h2 className="text-[2rem]">The full learning path</h2>
          <span className="academy-hand text-[1.3rem]">first dollar → order flow</span>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CURRICULUM.map((module) => (
            <ModuleTile
              key={module.slug}
              to={`/academy/${module.slug}`}
              image={module.image}
              imageLabel={`✎ ${module.title}`}
              eyebrow={`Module ${String(module.number).padStart(2, "0")} · ${module.chapters.length} chapters`}
              title={module.title}
              subtitle={module.subtitle}
            />
          ))}
        </div>
      </section>
    </AcademyLayout>
  );
}
