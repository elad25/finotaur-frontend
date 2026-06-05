// src/components/academy/FinotaurConnectionCard.tsx
// The "Connect to Finotaur" sticky-note that closes every chapter — the
// bridge from concept to product (the conversion mechanism).
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ds/Button";
import type { FinotaurLink } from "@/content/academy/curriculum";

export function FinotaurConnectionCard({ link }: { link: FinotaurLink }) {
  const navigate = useNavigate();

  return (
    <aside className="academy-fino my-8">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-2xl" aria-hidden>🐂</span>
        <span className="academy-hand text-[1.5rem] leading-none">Connect to Finotaur</span>
      </div>
      <p className="mb-1 font-semibold text-[var(--gold-deep)]" style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "1.25rem" }}>
        {link.feature}
      </p>
      <p className="mb-4 text-[1.05rem] leading-snug text-[var(--ink)]">{link.blurb}</p>
      <Button variant="gold" size="compact" onClick={() => navigate(link.ctaHref)}>
        {link.ctaLabel} →
      </Button>
    </aside>
  );
}
