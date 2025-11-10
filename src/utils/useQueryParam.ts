import { useMemo } from "react";

export function useQueryParam(name: string, fallback: string | null = null) {
  const value = useMemo(() => {
    if (typeof window === "undefined") return fallback;
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(name);
    return (raw ?? fallback);
  }, [name, fallback]);
  return value;
}
