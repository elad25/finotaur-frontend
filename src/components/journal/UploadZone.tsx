import React, { useRef, useState } from "react";
import { compressImage, validateImage } from "@/utils/imageCompression";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function UploadZone({ file, onFile }:{ file?: File|null; onFile:(f:File|null)=>void; }){
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const handleFile = async (f: File | null) => {
    if (!f) {
      onFile(null);
      return;
    }

    // Validate
    const validation = validateImage(f);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid image");
      return;
    }

    // Compress
    setCompressing(true);
    try {
      const compressed = await compressImage(f);
      onFile(compressed);
      toast.success("Image compressed successfully");
    } catch (error) {
      console.error("Compression failed:", error);
      toast.error("Failed to compress image");
      onFile(f); // Fallback to original
    } finally {
      setCompressing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div
      onDragOver={(e)=>{ e.preventDefault(); setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onDrop={onDrop}
      className={`rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-all ${drag ? "border-yellow-400/60 bg-yellow-900/10 scale-[1.02]" : "border-yellow-700/30 bg-zinc-950/40"}`}
    >
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e)=> handleFile(e.target.files?.[0] ?? null)}
      />
      {compressing ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
          <div className="text-sm text-zinc-300">Compressing image...</div>
          <div className="text-xs text-zinc-500">This won't take long</div>
        </div>
      ) : !file ? (
        <button
          type="button"
          onClick={()=>ref.current?.click()}
          className="text-sm text-zinc-300 hover:text-yellow-200 transition-colors"
        >
          Drop your chart screenshot here — or click to upload
          <div className="mt-1 text-xs text-zinc-500">PNG, JPG, or WebP — up to 10MB</div>
          <div className="mt-1 text-xs text-zinc-600">Images will be automatically compressed</div>
        </button>
      ) : (
        <div className="flex items-center justify-center gap-3">
          <div className="text-sm text-zinc-200">{file.name}</div>
          <button type="button" onClick={()=>onFile(null)} className="rounded-full border border-zinc-600 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors">Remove</button>
        </div>
      )}
    </div>
  );
}