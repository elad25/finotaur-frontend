import React from "react";
import DirectionToggle from "@/components/journal/DirectionToggle";
import { useJournalStore } from "@/state/journalStore";

export default function FastInputs(){
  const st = useJournalStore();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-400">Direction</div>
        <DirectionToggle />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="grid gap-1">
          <label className="text-xs text-zinc-400">Date</label>
          <input name="date" type="date"
            onChange={(e)=>st.setDate(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200" />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-zinc-400">Symbol</label>
          <input name="symbol" placeholder="AAPL, BTC, ES..." value={st.symbol}
            onChange={(e)=>st.setSymbol(e.target.value.toUpperCase())}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="grid gap-1">
          <label className="text-xs text-zinc-400">Side</label>
          <select name="side" value={st.side}
            onChange={(e)=>st.setSide(e.target.value as any)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200">
            <option>Long</option>
            <option>Short</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <label className="text-xs text-zinc-400">Quantity</label>
            <input name="quantity" type="number" placeholder="100"
              onChange={(e)=>st.setSize(parseFloat(e.target.value)||0)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200" />
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-zinc-400">Fees</label>
            <input name="fees" type="number" placeholder="0"
              onChange={(e)=>st.setFees(parseFloat(e.target.value)||0)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="grid gap-1">
          <label className="text-xs text-zinc-400">Entry Price</label>
          <input name="entryPrice" type="number" placeholder="150.50"
            onChange={(e)=>st.setEntry(parseFloat(e.target.value)||0)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200" />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-zinc-400">Stop Price</label>
          <input name="stopPrice" type="number" placeholder="149.00"
            onChange={(e)=>st.setStop(parseFloat(e.target.value)||0)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200" />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-zinc-400">Exit Price</label>
          <input name="exitPrice" type="number" placeholder="155.00"
            onChange={(e)=>st.setExit(parseFloat(e.target.value)||0)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="grid gap-1">
          <label className="text-xs text-zinc-400">Session</label>
          <input name="session" placeholder="Select session…"
            onChange={(e)=>st.setSession(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200" />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-zinc-400">Strategy</label>
          <input name="strategy" placeholder="Momentum, Reversal…"
            onChange={(e)=>st.setStrategy(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200" />
        </div>
      </div>

      <div className="grid gap-1">
        <label className="text-xs text-zinc-400">Setup</label>
        <input name="setup" placeholder="Breakout, Support…"
          onChange={(e)=>st.setSetup(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200" />
      </div>
    </div>
  );
}
