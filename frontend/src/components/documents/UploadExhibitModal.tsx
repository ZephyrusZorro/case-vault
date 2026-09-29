import { useState, useRef } from "react";
import {
  Upload,
  X,
  FileText,
  AlertTriangle,
  Loader2,
  FolderPlus,
  Shield,
} from "lucide-react";
import { apiPostForm } from "../../services/api";
import type { UploadResult } from "../../types/api";

interface UploadExhibitModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export function UploadExhibitModal({
  caseId,
  isOpen,
  onClose,
  onUploaded,
}: UploadExhibitModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setUploadError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setIsUploading(true);
      setUploadError(null);

      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await apiPostForm<UploadResult>(
        `/api/cases/${caseId}/documents`,
        formData
      );

      if (res.failed && res.failed.length > 0) {
        setUploadError(
          `Some files failed: ${res.failed.map((f) => `${f.file_name} (${f.error})`).join(", ")}`
        );
      }

      if (res.uploaded && res.uploaded.length > 0) {
        setSelectedFiles([]);
        onUploaded();
        onClose();
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload evidence exhibits.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl border-2 border-foreground bg-white p-6 shadow-hard space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-900 border border-blue-300">
              <FolderPlus size={18} />
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                Seize &amp; Upload Evidence Exhibit
              </h3>
              <p className="text-[11px] text-slate-500">
                Direct evidence ingestion into immutable case dossier
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
            isDragOver
              ? "border-blue-600 bg-blue-50"
              : "border-slate-300 bg-slate-50/70 hover:border-slate-400 hover:bg-slate-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload size={32} className="text-blue-600 mb-2" />
          <p className="text-xs font-bold text-foreground">
            Click to browse or drag &amp; drop exhibits here
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Accepts PDF, JPG, PNG (Max 15MB each) • Automatic SHA-256 anchoring
          </p>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Staged Exhibits ({selectedFiles.length})
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {selectedFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate font-semibold text-foreground">{f.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Notification */}
        {uploadError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Shield size={13} className="text-emerald-600" />
            <span>Cryptographic custody record logged automatically</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedFiles.length === 0 || isUploading}
              onClick={handleUpload}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Seizing &amp; Uploading…</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>Upload Exhibits</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
