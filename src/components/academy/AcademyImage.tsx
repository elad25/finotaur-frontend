// src/components/academy/AcademyImage.tsx
// Image with a graceful paper-sketch fallback so a missing asset never
// 404-breaks the page or shows a broken-image icon.
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AcademyImageProps {
  src?: string;
  alt: string;
  className?: string;
  /** Text shown in the fallback placeholder. */
  label?: string;
}

export function AcademyImage({ src, alt, className, label }: AcademyImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className={cn("academy-img-fallback", className)} aria-label={alt} role="img">
        <span className="px-4 text-center leading-tight">{label ?? "✎ illustration coming soon"}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
