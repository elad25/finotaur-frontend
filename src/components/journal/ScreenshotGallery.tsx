import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Screenshot {
  id: string;
  image_url: string;
  order_index: number;
  uploaded_at: string;
  file_size: number;
}

interface ScreenshotGalleryProps {
  screenshots: Screenshot[];
}

export function ScreenshotGallery({ screenshots }: ScreenshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!screenshots || screenshots.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
  };

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < screenshots.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className="rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-900/30 p-5 shadow-lg">
        <h3 className="text-xs font-semibold text-zinc-400 mb-4 uppercase tracking-wider flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Trade Screenshots ({screenshots.length})
        </h3>

        <div className={`grid gap-3 ${
          screenshots.length === 1 ? 'grid-cols-1' :
          screenshots.length === 2 ? 'grid-cols-2' :
          'grid-cols-2'
        }`}>
          {screenshots.map((screenshot, index) => (
            <div
              key={screenshot.id}
              className="relative group cursor-pointer rounded-lg overflow-hidden border border-zinc-700/50 bg-zinc-950 aspect-video hover:border-yellow-500/50 transition-all"
              onClick={() => openLightbox(index)}
            >
              <img
                src={screenshot.image_url}
                alt={`Screenshot ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-zinc-900" />
                  </div>
                </div>
              </div>

              {/* Index badge */}
              <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center text-xs font-semibold text-white">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Dialog */}
      {selectedIndex !== null && (
        <Dialog open={selectedIndex !== null} onOpenChange={closeLightbox}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-zinc-800">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button */}
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-zinc-900/80 hover:bg-zinc-800 flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Previous button */}
              {selectedIndex > 0 && (
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 z-50 w-12 h-12 rounded-full bg-zinc-900/80 hover:bg-zinc-800 flex items-center justify-center transition-all"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
              )}

              {/* Next button */}
              {selectedIndex < screenshots.length - 1 && (
                <button
                  onClick={goToNext}
                  className="absolute right-4 z-50 w-12 h-12 rounded-full bg-zinc-900/80 hover:bg-zinc-800 flex items-center justify-center transition-all"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              )}

              {/* Image */}
              <div className="w-full h-full p-12 flex items-center justify-center">
                <img
                  src={screenshots[selectedIndex].image_url}
                  alt={`Screenshot ${selectedIndex + 1}`}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>

              {/* Counter */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full bg-zinc-900/80 backdrop-blur-sm">
                <div className="text-sm font-medium text-white">
                  {selectedIndex + 1} / {screenshots.length}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}