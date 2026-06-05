// src/components/academy/AcademyLockCard.tsx
// Shown in place of a gated chapter's deep content. Members (Basic+) see
// the full lesson; everyone else sees the teaser + this unlock prompt.
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ds/Button";
import { useAcademyAccess } from "@/hooks/useAcademyAccess";

export function AcademyLockCard() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAcademyAccess();

  return (
    <aside className="academy-fino my-8 text-center">
      <div className="mb-2 flex items-center justify-center gap-2">
        <span className="text-2xl" aria-hidden>🔒</span>
        <span className="academy-hand text-[1.6rem] leading-none">Members chapter</span>
      </div>
      <p className="mx-auto mb-4 max-w-md text-[1.05rem] leading-snug text-[var(--ink)]">
        The full lesson is part of Finotaur membership. Unlock it — and every
        gated chapter — with any plan from <strong>Basic</strong> upward.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="gold" size="compact" onClick={() => navigate("/journal")}>
          See plans →
        </Button>
        {!isLoggedIn && (
          <Button variant="ghost" size="compact" onClick={() => navigate("/auth/login")}>
            Log in
          </Button>
        )}
      </div>
    </aside>
  );
}
