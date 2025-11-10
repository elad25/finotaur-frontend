import React, { useCallback, useEffect, useRef, useState } from "react";
import { uploadImage } from "@/services/journalApi";
import { JournalUpload } from "@/types/journal";

interface Props {
  value: JournalUpload[];
  onChange: (v: JournalUpload[]) => void;
}

export default function UploadDropzone({ value, onChange }: Props) {
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files as any as File[]);
    for (const f of list) {
      const up = await uploadImage(f);
      onChange([...(value ?? []), up]);
    }
  }, [value, onChange]);

  useEffect(() => {
    async function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const it of items) {
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) await onFiles(files);
    }
    window.addEventListener("paste", onPaste as any);
    return () => window.removeEventListener("paste", onPaste as any);
  }, [onFiles]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files); }}
      className={`border rounded-2xl px-4 py-10 text-center transition ${isOver ? "border-yellow-500/60 bg-yellow-500/5" : "border-yellow-200/15 bg-[#141414]"}`}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)} />
      <div className="text-sm text-zinc-300">Drop or paste screenshots</div>
      <div className="mt-2">
        <button type="button" onClick={() => inputRef.current?.click()}
          className="px-3 py-1.5 rounded-md border border-yellow-200/25 text-[13px] text-zinc-200 hover:border-yellow-400/40">
          Choose files
        </button>
      </div>

      {value?.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
          {value.map((u, i) => (
            <div key={u.id ?? i} className="relative group rounded-xl overflow-hidden border border-zinc-700/40">
              <img src={u.url} alt={u.type ?? "upload"} className="w-full h-28 object-cover" />
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
                  className="px-2 py-0.5 text-xs rounded bg-black/60 border border-white/15">✕</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
