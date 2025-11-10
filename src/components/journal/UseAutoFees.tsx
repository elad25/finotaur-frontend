import { useEffect } from "react";
import { useJournalStore } from "@/state/journalStore";
import { estimateFees } from "@/utils/fees";

export default function UseAutoFees(){
  const st = useJournalStore();
  useEffect(()=>{
    const fee = estimateFees(Number(st.entryPrice||0), Number(st.quantity||0));
    if (st.setFees) st.setFees(fee);
  }, [st.entryPrice, st.quantity]);
  return null;
}
