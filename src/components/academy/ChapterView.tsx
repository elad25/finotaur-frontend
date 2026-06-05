// src/components/academy/ChapterView.tsx
// Renders one chapter in the required 6-part structure:
//   1. Title  2. In plain words  3. Quick demo  4. Image
//   5. Full explanation  6. Connect to Finotaur
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Chapter, Module } from "@/content/academy/curriculum";
import { AcademyImage } from "./AcademyImage";
import { FinotaurConnectionCard } from "./FinotaurConnectionCard";
import { AcademyLockCard } from "./AcademyLockCard";

interface ParsedChapter {
  plainWords: string;
  quickDemo: string;
  fullExplanation: string;
}

/** Split a chapter .md into its named sections. Tolerant of missing ones. */
export function parseChapterMarkdown(md: string | null): ParsedChapter {
  const empty = { plainWords: "", quickDemo: "", fullExplanation: "" };
  if (!md) return empty;

  const sections: Record<string, string> = {};
  // Split on level-2 headings; first chunk is any preamble (ignored).
  const parts = md.split(/^##\s+/m);
  for (const part of parts) {
    const newline = part.indexOf("\n");
    if (newline === -1) continue;
    const heading = part.slice(0, newline).trim().toLowerCase();
    const body = part.slice(newline + 1).trim();
    if (heading.includes("plain")) sections.plainWords = body;
    else if (heading.includes("demo") || heading.includes("example")) sections.quickDemo = body;
    else if (heading.includes("full") || heading.includes("explanation") || heading.includes("detail"))
      sections.fullExplanation = body;
  }
  return {
    plainWords: sections.plainWords ?? "",
    quickDemo: sections.quickDemo ?? "",
    fullExplanation: sections.fullExplanation ?? "",
  };
}

interface ChapterViewProps {
  module: Module;
  chapter: Chapter;
  markdown: string | null;
  /** When true, deep content is hidden behind the members lock. */
  locked?: boolean;
  /** When true, access is still resolving — show a neutral placeholder. */
  checking?: boolean;
}

export function ChapterView({ module, chapter, markdown, locked = false, checking = false }: ChapterViewProps) {
  const parsed = parseChapterMarkdown(markdown);
  const hasBody = parsed.plainWords || parsed.fullExplanation;

  return (
    <article className="academy-page academy-page--ruled mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      {/* 1. Title */}
      <header className="mb-6">
        <span className="academy-eyebrow">
          Module {String(module.number).padStart(2, "0")} · {module.title}
        </span>
        <h1 className="mt-2 text-[2.4rem] leading-[1.1] sm:text-[3rem]">{chapter.title}</h1>
      </header>

      {/* 2. In plain words */}
      <section className="academy-prose mb-6">
        {parsed.plainWords ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.plainWords}</ReactMarkdown>
        ) : (
          <p className="text-[1.25rem]">{chapter.plainSummary}</p>
        )}
      </section>

      {/* 3. Quick demo */}
      {!locked && !checking && parsed.quickDemo && (
        <section className="academy-demo academy-prose mb-7">
          <span className="academy-hand mb-1 block text-[1.3rem] leading-none">Quick demo</span>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.quickDemo}</ReactMarkdown>
        </section>
      )}

      {/* 4. Image */}
      <figure className="mb-8">
        <AcademyImage
          src={chapter.image}
          alt={chapter.title}
          label={`✎ ${chapter.title}`}
          className="academy-img-fallback aspect-[16/9] w-full rounded-[3px] border border-[rgba(120,90,40,0.22)] object-cover shadow-[0_10px_28px_-18px_var(--paper-shadow)]"
        />
      </figure>

      {checking ? (
        /* Access still resolving — neutral placeholder, no content, no lock. */
        <p className="academy-prose my-8 text-center italic text-[var(--ink-faint)]">
          Checking your access…
        </p>
      ) : locked ? (
        /* Gated: teaser above, members lock here. */
        <AcademyLockCard />
      ) : (
        <>
          {/* 5. Full explanation */}
          {parsed.fullExplanation && (
            <section className="academy-prose mb-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.fullExplanation}</ReactMarkdown>
            </section>
          )}

          {!hasBody && (
            <p className="academy-prose mb-4 italic text-[var(--ink-faint)]">
              The full lesson for this chapter is being written. Check back soon.
            </p>
          )}

          {/* 6. Connect to Finotaur */}
          <FinotaurConnectionCard link={chapter.finotaur} />
        </>
      )}
    </article>
  );
}
