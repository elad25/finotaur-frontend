import { useEffect } from "react";
import { useJournalStore } from "@/state/journalStore";

/** Non-invasive bridge: syncs form fields into Zustand. */
export default function TradeFormBridge({ children }: { children: any }){
  const st = useJournalStore();

  useEffect(() => {
    const root = document.getElementById("root") || document.body;

    function hook(name: string, fn: (v: string)=>void){
      const el = root.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;
      if (!el) return;
      const handler = (e: Event) => fn((e.target as any).value ?? "");
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
      // initial
      if ((el as any).value) fn((el as any).value);
      return () => { el.removeEventListener("input", handler); el.removeEventListener("change", handler); };
    }

    const cleanups: Array<()=>void> = [];
    const add = (c?:()=>void) => { if (c) cleanups.push(c); };

    add(hook("symbol", (v)=> st.setSymbol(v.toUpperCase())));
    add(hook("side", (v)=> st.setSide((v||"").toLowerCase() === "short" ? "Short" : "Long")));
    add(hook("entryPrice", (v)=> st.setEntry(parseFloat(v)||0)));
    add(hook("stopPrice", (v)=> st.setStop(parseFloat(v)||0)));
    add(hook("exitPrice", (v)=> st.setExit(parseFloat(v)||0)));
    add(hook("quantity", (v)=> st.setSize(parseFloat(v)||0)));
    add(hook("fees", (v)=> st.setFees(parseFloat(v)||0)));
    add(hook("session", (v)=> st.setSession(v)));
    add(hook("strategy", (v)=> st.setStrategy(v)));
    add(hook("setup", (v)=> st.setSetup(v)));

    return () => { cleanups.forEach(fn => fn()); };
  }, [st]);

  return children;
}
