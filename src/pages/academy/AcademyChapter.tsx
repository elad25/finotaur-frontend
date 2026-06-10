// src/pages/academy/AcademyChapter.tsx
// A single chapter — clean two-column article: the page on the left, a
// sticky chapter-nav rail on the right (premium docs feel).
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { AcademyLayout } from "@/components/academy/AcademyLayout";
import { ChapterView } from "@/components/academy/ChapterView";
import { useAcademyAccess } from "@/hooks/useAcademyAccess";
import {
  getChapter,
  getChapterMarkdown,
  getAdjacentChapters,
} from "@/content/academy/curriculum";

export default function AcademyChapter() {
  const { moduleSlug = "", chapterSlug = "" } = useParams();
  const found = getChapter(moduleSlug, chapterSlug);
  const access = useAcademyAccess();

  useEffect(() => {
    document.title = found
      ? `${found.chapter.title} — Finotaur Academy`
      : "Academy — Finotaur";
  }, [found]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [moduleSlug, chapterSlug]);

  if (!found) {
    return (
      <AcademyLayout>
        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <h1 className="text-[2.2rem] font-bold">Chapter not found</h1>
          <Link to="/academy" className="academy-hand mt-4 inline-block">
            ← Back to the Academy
          </Link>
        </div>
      </AcademyLayout>
    );
  }

  const { module, chapter } = found;
  const markdown = getChapterMarkdown(moduleSlug, chapterSlug);
  const { prev, next } = getAdjacentChapters(moduleSlug, chapterSlug);

  // Three states: checking / locked / open (so non-members never glimpse
  // gated content and paying members never see a flash of paywall).
  const isGated = chapter.access === "basic";
  const checking = isGated && access.isLoading;
  const locked = isGated && !access.isLoading && !access.canRead("basic");

  return (
    <AcademyLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="mb-5">
          <Link to={`/academy/${module.slug}`} className="academy-hand text-[0.95rem]">
            ← {module.title}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* Main column */}
          <div className="min-w-0">
            <ChapterView module={module} chapter={chapter} markdown={markdown} locked={locked} checking={checking} />

            {/* Prev / next */}
            <nav className="mt-8 flex items-stretch justify-between gap-4">
              {prev ? (
                <Link to={`/academy/${prev.module.slug}/${prev.chapter.slug}`} className="academy-tile flex-1 p-4">
                  <span className="academy-hand block text-[0.85rem]">← Previous</span>
                  <span className="mt-0.5 block text-[0.98rem] font-medium leading-snug text-[var(--ink)]">
                    {prev.chapter.title}
                  </span>
                </Link>
              ) : (
                <span className="flex-1" />
              )}
              {next ? (
                <Link to={`/academy/${next.module.slug}/${next.chapter.slug}`} className="academy-tile flex-1 p-4 text-right">
                  <span className="academy-hand block text-[0.85rem]">Next →</span>
                  <span className="mt-0.5 block text-[0.98rem] font-medium leading-snug text-[var(--ink)]">
                    {next.chapter.title}
                  </span>
                </Link>
              ) : (
                <span className="flex-1" />
              )}
            </nav>
          </div>

          {/* Sticky chapter rail */}
          <aside className="hidden lg:block">
            <nav className="academy-toc" aria-label="Chapters in this module">
              <p className="academy-eyebrow mb-3 px-1.5">In this module</p>
              {module.chapters.map((c, i) => {
                const isCurrent = c.slug === chapter.slug;
                const chLocked = c.access === "basic" && !access.canRead("basic");
                return (
                  <Link
                    key={c.slug}
                    to={`/academy/${module.slug}/${c.slug}`}
                    data-active={isCurrent}
                    className="academy-toc-link flex items-start gap-2"
                  >
                    <span className="mt-[2px] w-5 flex-shrink-0 text-right text-[0.8rem] tabular-nums text-[var(--ink-faint)]">
                      {i + 1}
                    </span>
                    <span className="flex-1">{c.title}</span>
                    {chLocked && <Lock className="mt-[3px] h-3 w-3 flex-shrink-0 text-[var(--ink-faint)]" aria-hidden />}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      </div>
    </AcademyLayout>
  );
}
