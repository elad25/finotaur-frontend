import { useEffect } from "react";
import { useJournalStore } from "@/state/journalStore";
import { detectSessionByLocal } from "@/utils/session";

export default function UseAutoSession(){
  const st = useJournalStore();
  useEffect(()=>{
    const sess = detectSessionByLocal(st.date || Date.now());
    if (st.setSession) st.setSession(sess);
  }, [st.date]);
  return null;
}
