/**
 * AutoSummary — renders multi-paragraph prose text.
 *
 * Splits the summary string on double newlines and wraps each segment
 * in a <p> tag with consistent prose styling.
 */

interface AutoSummaryProps {
  summary: string;
}

export function AutoSummary({ summary }: AutoSummaryProps) {
  const paragraphs = summary.split('\n\n').filter((p) => p.trim().length > 0);

  return (
    <div className="space-y-4">
      {paragraphs.map((para, idx) => (
        <p
          key={idx}
          className="text-base leading-relaxed text-white/70"
        >
          {para.trim()}
        </p>
      ))}
    </div>
  );
}
