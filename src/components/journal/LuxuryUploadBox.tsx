import React, { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";

type Props = {
  name?: string;
  value?: File | null;
  onChange?: (file: File | null) => void;
  accept?: string;
  maxBytes?: number;
  error?: string | null;
  ariaLabel?: string;
};

const GOLD = "#C9A646";

export default function LuxuryUploadBox({
  name = "screenshot",
  value = null,
  onChange,
  accept = "image/png,image/jpeg,image/webp",
  maxBytes = 5 * 1024 * 1024,
  error = null,
  ariaLabel = "Upload trade screenshot",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(value ?? null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const choose = () => inputRef.current?.click();
  const validate = (f: File) => {
    if (!accept.split(",").some(type => f.type === type)) {
      return "Unsupported file type. Please upload PNG, JPG, or WebP.";
    }
    if (f.size > maxBytes) {
      return "File too large. The limit is 5MB.";
    }
    return null;
  };
  const setSelected = (f: File | null) => {
    setLocalError(null);
    if (!f) {
      setFile(null);
      onChange?.(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const v = validate(f);
    if (v) { setLocalError(v); return; }
    setFile(f);
    onChange?.(f);
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setSelected(f);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    setSelected(f);
  };
  const onDrag = (e: React.DragEvent<HTMLDivElement>, over: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(over);
  };
  const remove = () => setSelected(null);

  const hasFile = !!file;
  const borderColor = dragOver ? `${GOLD}99` : `${GOLD}40`;

  return (
    <div className="w-full" aria-label={ariaLabel}>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        onChange={onInput}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? choose() : null)}
        onClick={choose}
        onDragEnter={(e) => onDrag(e, true)}
        onDragOver={(e) => onDrag(e, true)}
        onDragLeave={(e) => onDrag(e, false)}
        onDrop={onDrop}
        className="rounded-2xl p-6 sm:p-8 transition-all duration-200 ease-out focus:outline-none"
        style={{
          background: "linear-gradient(180deg, #0a0a0a, #121212)",
          border: `1px dashed ${borderColor}`,
          boxShadow: dragOver
            ? "0 10px 30px rgba(201,166,70,0.18)"
            : "0 8px 24px rgba(0,0,0,0.35)",
        }}
      >
        {!hasFile ? (
          <div className="flex items-center gap-4 justify-center sm:justify-start">
            <UploadCloud className="w-8 h-8 opacity-70" style={{ color: GOLD }} />
            <div className="text-left">
              <div className="text-[#E8E8E8] font-medium">
                Drop your chart screenshot here — or click to upload
              </div>
              <div className="text-sm text-[#9CA3AF]">PNG, JPG, or WebP — up to 5MB</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 border border-[color:var(--gold,#C9A646)]/20">
              <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[#E8E8E8] truncate">{file.name}</div>
              <div className="text-xs text-[#9CA3AF]">{Math.round(file.size / 1024)} KB</div>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={choose}
                  className="text-sm underline underline-offset-4"
                  style={{ color: GOLD }}
                  aria-label="Replace file"
                >
                  Replace file
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(); }}
                  aria-label="Remove file"
                  className="inline-flex items-center justify-center rounded-lg p-1 hover:bg-white/5"
                >
                  <X className="w-4 h-4" style={{ color: GOLD }} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {(localError || error) && <p className="mt-2 text-sm text-red-400">{localError ?? error}</p>}
    </div>
  );
}
