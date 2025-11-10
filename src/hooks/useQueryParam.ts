import { useEffect, useState } from "react";
export default function useQueryParam(key: string, fallback?: string) {
  const [val, setVal] = useState<string | undefined>(new URLSearchParams(window.location.search).get(key) ?? fallback);
  useEffect(() => {
    const onPop = () => setVal(new URLSearchParams(window.location.search).get(key) ?? fallback);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [key, fallback]);
  return [val, (v: string) => {
    const u = new URL(window.location.href);
    u.searchParams.set(key, v);
    history.replaceState({}, '', u.toString());
    setVal(v);
  }] as const;
}
