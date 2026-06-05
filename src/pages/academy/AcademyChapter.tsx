// src/pages/academy/AcademyChapter.tsx
// A single chapter page: the notebook page + prev/next navigation.
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
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

  // Jump to the top of the page whenever the chapter changes.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [moduleSlug, chapterSlug]);

  if (!found) {
    return (
      <AcademyLayout>
        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <h1 className="text-[2.4rem]">Chapter not found</h1>
          <Link to="/academy" className="academy-hand mt-4 inline-block text-[1.5rem]">
            ← Back to the Academy
          </Link>
        </div>
      </AcademyLayout>
    );
  }

  const { module, chapter } = found;
  const markdown = getChapterMarkdown(moduleSlug, chapterSlug);
  const { prev, next } = getAdjacentChapters(moduleSlug, chapterSlug);
  // Gated only while subscription state is known (avoid a flash of lock
  // before the tier resolves for a logged-in member).
  const locked = chapter.access === "basic" && !access.isLoading && !access.canRead("basic");

  return (
    <AcademyLayout>
      <div className="px-4 py-8 sm:py-10">
        <div className="mx-auto mb-4 max-w-3xl">
          <Link to={`/academy/${module.slug}`} className="academy-hand text-[1.3rem]">
            ← {module.title}
          </Link>
        </div>

        <ChapterView module={module} chapter={chapter} markdown={markdown} locked={locked} />

        {/* Prev / next */}
        <nav className="mx-auto mt-8 flex max-w-3xl items-stretch justify-between gap-4">
          {prev ? (
            <Link
              to={`/academy/${prev.module.slug}/${prev.chapter.slug}`}
              className="academy-tile flex-1 p-4"
            >
              <span className="academy-hand block text-[1.2rem]">← Previous</span>
              <span className="block text-[1.1rem] leading-snug text-[var(--ink)]">
                {prev.chapter.title}
              </span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <Link
              to={`/academy/${next.module.slug}/${next.chapter.slug}`}
              className="academy-tile flex-1 p-4 text-right"
            >
              <span className="academy-hand block text-[1.2rem]">Next →</span>
              <span className="block text-[1.1rem] leading-snug text-[var(--ink)]">
                {next.chapter.title}
              </span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
        </nav>
      </div>
    </AcademyLayout>
  );
}
