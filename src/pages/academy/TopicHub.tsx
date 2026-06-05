// src/pages/academy/TopicHub.tsx
// An encyclopedia "topic" hub — aggregates chapters across modules into a
// single subject (Options, Stocks, Crypto, Futures, Macro, Prop Firms, ...).
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { AcademyLayout } from "@/components/academy/AcademyLayout";
import { ModuleTile } from "@/components/academy/ModuleTile";
import { getTopic } from "@/content/academy/curriculum";
import { useAcademyAccess } from "@/hooks/useAcademyAccess";

export default function TopicHub() {
  const { topicSlug = "" } = useParams();
  const topic = getTopic(topicSlug);
  const access = useAcademyAccess();

  useEffect(() => {
    document.title = topic ? `${topic.title} — Finotaur Academy` : "Academy — Finotaur";
  }, [topic]);

  if (!topic) {
    return (
      <AcademyLayout>
        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <h1 className="text-[2.4rem]">Topic not found</h1>
          <Link to="/academy" className="academy-hand mt-4 inline-block text-[1.5rem]">
            ← Back to the Academy
          </Link>
        </div>
      </AcademyLayout>
    );
  }

  return (
    <AcademyLayout>
      <header className="mx-auto max-w-5xl px-5 pb-2 pt-12 sm:pt-16">
        <Link to="/academy" className="academy-hand text-[1.3rem]">← All topics</Link>
        <span className="academy-eyebrow mt-3 block">Topic · {topic.chapters.length} entries</span>
        <h1 className="mt-1 text-[2.6rem] leading-[1.05] sm:text-[3.4rem]">{topic.title}</h1>
        <p className="mt-3 max-w-2xl text-[1.2rem] leading-snug text-[var(--ink-soft)]">
          {topic.subtitle}
        </p>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {topic.chapters.map(({ module, chapter }) => (
            <ModuleTile
              key={`${module.slug}/${chapter.slug}`}
              to={`/academy/${module.slug}/${chapter.slug}`}
              image={chapter.image}
              imageLabel={`✎ ${chapter.title}`}
              eyebrow={module.title}
              title={chapter.title}
              subtitle={chapter.plainSummary}
              locked={chapter.access === "basic" && !access.canRead("basic")}
            />
          ))}
        </div>
      </div>
    </AcademyLayout>
  );
}
