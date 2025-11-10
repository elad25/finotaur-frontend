import React, { useEffect, useMemo, useRef, useState } from "react";
import { NotebookPen } from "lucide-react";

type Props = {
  name?: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  helper?: string | null;
  ariaLabel?: string;
  minChars?: number;
};

const GOLD = "#C9A646";

export default function NotesPremium({
  name = "notes",
  value,
  onChange,
  placeholder = "Trade notes, lessons learned, catalysts, emotions…",
  required = false,
  error = null,
  helper = "Optional, but highly recommended for improving your edge.",
  ariaLabel = "Notes",
  minChars = 3,
}: Props) {
  const [val, setVal] = useState(value ?? "");
  const [focused, setFocused] = useState(false);
  const [count, setCount] = useState(0);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => setCount(val.trim().split(/\s+/).filter(Boolean).length), [val]);
  useEffect(() => setVal(value ?? ""), [value]);

  const showError = useMemo(() => {
    if (error) return error;
    if (required && val.trim().length < minChars && !focused) {
      return "Please add at least a few words about the trade.";
    }
    return null;
  }, [error, required, focused, val, minChars]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <NotebookPen className="w-4 h-4" style={{ color: GOLD }} />
        <span className="text-xs tracking-wide" style={{ color: GOLD }}>NOTES</span>
      </div>

      <textarea
        ref={taRef}
        name={name}
        value={val}
        onChange={(e) => { setVal(e.target.value); onChange?.(e.target.value); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="w-full rounded-xl resize-y min-h-[220px] max-h-[480px] px-4 py-3 text-[15px] leading-6 outline-none
                   placeholder:italic placeholder:text-[#6B7280] text-[#E8E8E8] scrollbar-thin"
        style={{
          background: "linear-gradient(180deg, #0b0b0b, #121212)",
          border: `1px solid ${GOLD}33`,
          boxShadow: focused
            ? "0 0 0 2px rgba(201,166,70,0.25), inset 0 1px 0 rgba(255,255,255,0.03)"
            : "inset 0 1px 0 rgba(255,255,255,0.03)",
          caretColor: "#ffffff",
        }}
      />

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-[#9CA3AF]">{helper}</span>
        <span className="text-[#9CA3AF]">{count} words</span>
      </div>

      {showError && <p className="mt-1 text-sm text-red-400">{showError}</p>}
    </div>
  );
}
