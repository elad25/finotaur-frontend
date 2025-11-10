import { useEffect, useRef, useState } from "react";

type Status = "idle" | "saving" | "saved" | "error";
const DRAFT_KEY = "finotaur_journal_draft";

export default function useAutosave(fp: ()=>string, onSave: ()=>Promise<any>): Status {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number | undefined>(undefined);
  const lastSaved = useRef<string>("");

  useEffect(() => {
    function queue() {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        try {
          const fingerprint = fp?.() ?? "";
          if (!fingerprint || fingerprint === lastSaved.current) return;
          setStatus("saving");
          // best-effort local draft if page exposes getter
          try { 
            const g = (window as any).__journal_getter;
            if (typeof g === "function") localStorage.setItem(DRAFT_KEY, JSON.stringify(g()));
          } catch {}
          await onSave();
          lastSaved.current = fingerprint;
          setStatus("saved");
          window.setTimeout(()=>setStatus("idle"), 1200);
        } catch (e) {
          console.error(e);
          setStatus("error");
        }
      }, 2000) as any;
    }
    const handler = () => queue();
    window.addEventListener("journal:changed", handler);
    return () => window.removeEventListener("journal:changed", handler);
  }, [fp, onSave]);

  return status;
}
