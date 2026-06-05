// src/components/academy/ChapterView.tsx
// One chapter, rendered as a clean modern article:
//   eyebrow + title · lead ("in plain words") · hero image · quick demo ·
//   full explanation · Connect to Finotaur.
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
    <article className="academy-page mx-auto max-w-[720px] px-5 py-8 sm:px-10 sm:py-12">
      {/* Title */}
      <header className="mb-6">
        <span className="academy-eyebrow">
          Module {String(module.number).padStart(2, "0")} · {module.title}
        </span>
        <h1 className="mt-3 text-[2.1rem] font-bold leading-[1.12] tracking-tight sm:text-[2.6rem]">
          {chapter.title}
        </h1>
      </header>

      {/* Lead — "in plain words" */}
      <div className="academy-lead mb-8">
        {parsed.plainWords ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.plainWords}</ReactMarkdown>
        ) : (
          <p>{chapter.plainSummary}</p>
        )}
      </div>

      {/* Hero image */}
      <figure className="mb-9">
        <AcademyImage
          src={chapter.image}
          alt={chapter.title}
          label={chapter.title}
          className="academy-img-fallback aspect-[16/9] w-full rounded-xl border border-[var(--line)] object-cover"
        />
      </figure>

      {checking ? (
        <p className="academy-prose my-8 text-center italic text-[var(--ink-faint)]">
          Checking your access…
        </p>
      ) : locked ? (
        <AcademyLockCard />
      ) : (
        <>
          {/* Quick demo */}
          {parsed.quickDemo && (
            <div className="academy-demo mb-9">
              <span className="academy-eyebrow mb-2 block">Quick demo</span>
              <div className="academy-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.quickDemo}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Full explanation */}
          {parsed.fullExplanation && (
            <div className="academy-prose mb-6">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.fullExplanation}</ReactMarkdown>
            </div>
          )}

          {!hasBody && (
            <p className="academy-prose mb-6 italic text-[var(--ink-faint)]">
              The full lesson for this chapter is being written. Check back soon.
            </p>
          )}

          <FinotaurConnectionCard link={chapter.finotaur} />
        </>
      )}
    </article>
  );
}
