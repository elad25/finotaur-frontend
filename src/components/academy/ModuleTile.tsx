// src/components/academy/ModuleTile.tsx
// A clickable notebook tile — used for the module grid on the index and
// for chapter cards inside a module's table of contents.
import { Link } from "react-router-dom";
import { AcademyImage } from "./AcademyImage";

interface ModuleTileProps {
  to: string;
  image?: string;
  title: string;
  subtitle?: string;
  /** Small handwritten label, e.g. "Module 01" or "Chapter 3". */
  eyebrow?: string;
  /** Fallback placeholder text for the image. */
  imageLabel?: string;
  /** Show a "Members" lock chip (for gated chapters). */
  locked?: boolean;
}

export function ModuleTile({ to, image, title, subtitle, eyebrow, imageLabel, locked }: ModuleTileProps) {
  return (
    <Link to={to} className="academy-tile group block overflow-hidden">
      <div className="relative aspect-[16/10] overflow-hidden">
        <AcademyImage
          src={image}
          alt={title}
          label={imageLabel}
          className="academy-img-fallback h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {locked && (
          <span className="absolute right-2 top-2 rounded-full border border-[rgba(176,131,22,0.5)] bg-[#fff7d6]/90 px-2 py-0.5 text-[0.72rem] font-semibold text-[var(--gold-deep)] shadow-sm">
            🔒 Members
          </span>
        )}
      </div>
      <div className="p-4 sm:p-5">
        {eyebrow && <span className="academy-eyebrow mb-1 block">{eyebrow}</span>}
        <h3 className="text-[1.35rem] leading-tight">{title}</h3>
        {subtitle && (
          <p className="mt-1.5 text-[0.98rem] leading-snug text-[var(--ink-soft)]">{subtitle}</p>
        )}
      </div>
    </Link>
  );
}
