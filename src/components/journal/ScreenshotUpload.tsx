import React, { useRef, useState } from "react";

export type ScreenshotValue = {
  dataUrl: string | null;
  file?: File | null;
  fileName?: string;
  fileSize?: number;
};

export interface ScreenshotUploadProps {
  value?: ScreenshotValue;
  onChange: (value: ScreenshotValue) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
  maxMB?: number; // default 5
}

export const ScreenshotUpload: React.FC<ScreenshotUploadProps> = ({
  value,
  onChange,
  className = "",
  id = "finotaur-upload-input",
  disabled = false,
  maxMB = 5,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string>("");

  const allowed = ["image/png", "image/jpeg", "image/webp"];

  const openFileDialog = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const validateAndRead = (file: File | undefined | null) => {
    if (!file) return;
    setError("");
    if (!allowed.includes(file.type)) {
      setError("Unsupported file type. Please upload PNG, JPG, or WebP.");
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      setError("File too large. The limit is 5MB.");
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      onChange({
        dataUrl: (r.result as string) || null,
        file,
        fileName: file.name,
        fileSize: file.size,
      });
    };
    r.readAsDataURL(file);
  };

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    validateAndRead(e.target.files?.[0]);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    validateAndRead(e.dataTransfer.files?.[0]);
  };

  const remove = () => onChange({ dataUrl: null, file: null });

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload screenshot"
        className={`lux-upload ${dragOver ? "is-drag" : ""}`}
        onClick={openFileDialog}
        onKeyDown={(e) => ((e.key === "Enter" || e.key === " ") && openFileDialog())}
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={onDrop}
      >
        {!value?.dataUrl ? (
          <div className="center">
            <svg className="ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3v12m0 0l-3-3m3 3l3-3M4 17h16" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <div>
              <div className="headline">Drop your chart screenshot here — or click to upload</div>
              <div className="helper">PNG, JPG, or WebP — up to {maxMB}MB</div>
            </div>
          </div>
        ) : (
          <div className="preview">
            <img src={value.dataUrl} alt="Screenshot preview" className="thumb" />
            <div className="meta">
              <div>{value.fileName || "screenshot"}</div>
              <small>{value.fileSize ? (value.fileSize/1024/1024).toFixed(2) + " MB" : ""}</small>
            </div>
            <div className="actions">
              <button type="button" className="link-action" onClick={openFileDialog} aria-label="Replace file">Replace file</button>
              <button type="button" className="icon-btn" onClick={remove} aria-label="Remove file">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6"/>
                </svg>
              </button>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onFileChange}
          disabled={disabled}
        />
      </div>
      {error && (
        <div className="lux-upload" style={{ border: "none", background: "transparent", padding: 0 }}>
          <div className="error">{error}</div>
        </div>
      )}
    </div>
  );
};
