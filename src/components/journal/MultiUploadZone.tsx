import React, { useRef, useState, useEffect } from "react";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { compressImage, validateImage, createImagePreview, revokeImagePreview } from "@/utils/imageCompression";
import { toast } from "sonner";

interface Screenshot {
  file: File;
  preview: string;
  compressed?: File;
  compressing?: boolean;
}

interface MultiUploadZoneProps {
  screenshots: Screenshot[];
  onScreenshotsChange: (screenshots: Screenshot[]) => void;
  maxFiles?: number;
}

export default function MultiUploadZone({
  screenshots,
  onScreenshotsChange,
  maxFiles = 4,
}: MultiUploadZoneProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [compressing, setCompressing] = useState(false);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      screenshots.forEach((s) => revokeImagePreview(s.preview));
    };
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remaining = maxFiles - screenshots.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxFiles} screenshots allowed`);
      return;
    }

    const filesToAdd = Array.from(files).slice(0, remaining);
    const newScreenshots: Screenshot[] = [];

    // Validate all files first
    for (const file of filesToAdd) {
      const validation = validateImage(file);
      if (!validation.valid) {
        toast.error(validation.error || "Invalid image");
        continue;
      }

      const preview = createImagePreview(file);
      newScreenshots.push({
        file,
        preview,
        compressing: true,
      });
    }

    if (newScreenshots.length === 0) return;

    // Add to state immediately with "compressing" flag
    onScreenshotsChange([...screenshots, ...newScreenshots]);

    // Compress images in parallel
    setCompressing(true);
    const compressPromises = newScreenshots.map(async (screenshot, index) => {
      try {
        const compressed = await compressImage(screenshot.file);
        return { index, compressed };
      } catch (error) {
        console.error("Compression failed:", error);
        toast.error(`Failed to compress ${screenshot.file.name}`);
        return { index, compressed: null };
      }
    });

    const results = await Promise.all(compressPromises);
    setCompressing(false);

    // Update screenshots with compressed versions
    const updatedScreenshots = [...screenshots, ...newScreenshots].map((s, i) => {
      const result = results.find((r) => i === screenshots.length + r.index);
      if (result?.compressed) {
        return { ...s, compressed: result.compressed, compressing: false };
      }
      return { ...s, compressing: false };
    });

    onScreenshotsChange(updatedScreenshots);

    toast.success(
      `${newScreenshots.length} image${newScreenshots.length > 1 ? "s" : ""} compressed successfully`
    );
  };

  const removeScreenshot = (index: number) => {
    const screenshot = screenshots[index];
    revokeImagePreview(screenshot.preview);
    const updated = screenshots.filter((_, i) => i !== index);
    onScreenshotsChange(updated);
    toast.success("Screenshot removed");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    handleFiles(e.dataTransfer.files);
  };

  const canAddMore = screenshots.length < maxFiles;

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {canAddMore && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={`rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-all ${
            drag
              ? "border-yellow-400/60 bg-yellow-900/10 scale-[1.02]"
              : "border-yellow-700/30 bg-zinc-950/40"
          }`}
        >
          <input
            ref={ref}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            max={maxFiles}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="flex flex-col items-center gap-3">
            {compressing ? (
              <>
                <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
                <div className="text-sm text-zinc-300">Compressing images...</div>
                <div className="text-xs text-zinc-500">This won't take long</div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-yellow-500" />
                </div>
                <button
                  type="button"
                  onClick={() => ref.current?.click()}
                  className="text-sm text-zinc-300 hover:text-yellow-200 transition-colors"
                >
                  Drop your screenshots here — or click to upload
                </button>
                <div className="text-xs text-zinc-500">
                  PNG, JPG, or WebP — Up to {maxFiles - screenshots.length} more{" "}
                  {maxFiles - screenshots.length === 1 ? "image" : "images"}
                </div>
                <div className="text-xs text-zinc-600">
                  Images will be automatically compressed to save space
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Screenshot Grid */}
      {screenshots.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {screenshots.map((screenshot, index) => (
            <div
              key={index}
              className="relative group rounded-xl overflow-hidden border border-yellow-200/20 bg-zinc-900/50"
            >
              {/* Image Preview */}
              <div className="aspect-video relative">
                <img
                  src={screenshot.preview}
                  alt={`Screenshot ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Compressing Overlay */}
                {screenshot.compressing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mx-auto mb-2" />
                      <div className="text-xs text-zinc-300">Compressing...</div>
                    </div>
                  </div>
                )}

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeScreenshot(index)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-600/90 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                  disabled={screenshot.compressing}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Info Bar */}
              <div className="px-3 py-2 bg-zinc-950/80">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <ImageIcon className="w-3 h-3" />
                    <span className="truncate max-w-[120px]">{screenshot.file.name}</span>
                  </div>
                  {screenshot.compressed && (
                    <div className="text-emerald-400 font-medium">
                      {(screenshot.compressed.size / 1024).toFixed(0)}KB
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Counter */}
      <div className="text-center text-xs text-zinc-500">
        {screenshots.length} / {maxFiles} screenshots uploaded
      </div>
    </div>
  );
}