import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CloudUpload,
  FileText,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Shield,
  Smartphone,
} from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { useTranslation } from "react-i18next";
import { apiPost, apiPostForm } from "../services/api";
import type { CaseCreated, UploadResult } from "../types/api";

const ACCEPTED = ".jpg,.jpeg,.png,.pdf";
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

const DOC_CATEGORIES = [
  "Aadhaar Card",
  "PAN Card",
  "Driving Licence",
  "Passport",
  "Voter ID (EPIC)",
  "National ID",
  "Address Proof",
  "Visa",
  "Certificate",
  "Other / Unknown",
];


interface PendingFile {
  key: string;
  file: File;
  previewUrl: string | null;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function NewCasePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [caseName, setCaseName] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [autoNotify, setAutoNotify] = useState(false);
  const [showContactFields, setShowContactFields] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const counter = useRef(0);
  const filesRef = useRef<PendingFile[]>([]);
  filesRef.current = files;

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError(null);
      const next: PendingFile[] = [];
      const problems: string[] = [];
      for (const f of Array.from(incoming)) {
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
        if (!["jpg", "jpeg", "png", "pdf"].includes(ext)) {
          problems.push(`"${f.name}" — unsupported type (.${ext || "?"}). Allowed: JPG, PNG, PDF.`);
          continue;
        }
        if (f.size > MAX_BYTES) {
          problems.push(`"${f.name}" — exceeds the ${MAX_MB} MB limit (${formatSize(f.size)}).`);
          continue;
        }
        if (f.size === 0) {
          problems.push(`"${f.name}" — file is empty.`);
          continue;
        }
        next.push({
          key: `f${counter.current++}`,
          file: f,
          previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
        });
      }
      setFiles((prev) => [...prev, ...next]);
      if (problems.length > 0) setError(problems.join(" "));
    },
    [],
  );

  const removeFile = (key: string) => {
    setFiles((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  };

  useEffect(() => {
    return () => {
      filesRef.current.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
    };
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const canSubmit = caseName.trim().length > 0 && files.length > 0 && !submitting;

  const startScreening = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiPost<CaseCreated>("/api/cases", {
        case_name: caseName.trim(),
        applicant_name: applicantName.trim() || null,
        applicant_phone: applicantPhone.trim() || null,
        applicant_email: applicantEmail.trim() || null,
        auto_notify_on_mismatch: autoNotify,
      });
      const form = new FormData();
      files.forEach((f) => form.append("files", f.file));
      const result = await apiPostForm<UploadResult>(
        `/api/cases/${created.id}/documents`,
        form,
      );
      files.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
      if (result.failed.length > 0) {
        setError(
          result.failed.map((f) => `"${f.file_name}" — ${f.error}`).join(" "),
        );
        if (result.uploaded.length === 0) {
          setSubmitting(false);
          return;
        }
      }
      await apiPost(`/api/cases/${created.id}/analyze`);
      navigate(`/screen/processing/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setSubmitting(false);
    }
  };

  const loadDemoCase = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiPost<CaseCreated>("/api/demo/signature-case");
      navigate(`/screen/processing/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the demo case.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-6">
      <PageHeader
        title={t("cases.new_title")}
        subtitle={t("cases.new_subtitle")}
        actions={
          <button
            type="button"
            onClick={loadDemoCase}
            disabled={submitting}
            className="btn-secondary flex items-center gap-1.5"
            title="Loads synthetic test documents into the 11-stage pipeline"
          >
            {submitting ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles size={15} className="text-blue-500 animate-pulse" aria-hidden="true" />
            )}
            <span>Load Demo Case</span>
          </button>
        }
      />

      <div className="card p-6 space-y-6">
        {/* Case name */}
        <div>
          <label htmlFor="case-name" className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground ">
            {t("new_case.identifier")} <span className="text-rose-500">*</span>
          </label>
          <input
            id="case-name"
            type="text"
            className="input-field"
            placeholder={t("new_case.identifier_ph")}
            value={caseName}
            maxLength={200}
            onChange={(e) => setCaseName(e.target.value)}
          />
        </div>

        {/* Optional Applicant Contact & Alerts */}
        <div className="rounded-xl border border-slate-200/80  bg-slate-50/50  p-4 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100  text-blue-700 ">
                <Smartphone size={15} />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground ">
                  {t("new_case.contact")}
                </h4>
                <p className="text-[11px] text-slate-500 ">
                  {t("new_case.contact_desc")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowContactFields(!showContactFields)}
              className="text-xs font-semibold text-blue-600  hover:underline"
            >
              {showContactFields ? "Hide options" : t("new_case.configure_contact")}
            </button>
          </div>

          {showContactFields && (
            <div className="mt-4 space-y-3 pt-3 border-t border-slate-200/70  animate-fade-in">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 ">Applicant Full Name</label>
                  <input
                    type="text"
                    className="input-field mt-1 text-xs"
                    placeholder="e.g. Rahul Sharma"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 ">Phone / WhatsApp</label>
                  <input
                    type="text"
                    className="input-field mt-1 text-xs"
                    placeholder="e.g. +91 98765 43210"
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 ">Email Address</label>
                  <input
                    type="email"
                    className="input-field mt-1 text-xs"
                    placeholder="e.g. applicant@example.com"
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 ">
                  <input
                    type="checkbox"
                    checked={autoNotify}
                    onChange={(e) => setAutoNotify(e.target.checked)}
                    className="rounded border-slate-300  bg-white  text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <strong>Auto-dispatch alert</strong> if verification screening flags high risk or cross-document conflict
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Dropzone */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground ">
            {t("new_case.upload")} <span className="text-rose-500">*</span>
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            aria-label="Add identity documents"
            className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              dragOver
                ? "border-blue-500 bg-blue-50/80   scale-[1.01]"
                : "border-slate-300  bg-slate-50/60  hover:border-blue-400  hover:bg-blue-50/30 "
            }`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100/80  text-blue-600  mb-3 shadow-sm">
              <CloudUpload size={28} />
            </div>
            <span className="text-sm font-bold text-foreground ">
              {t("new_case.drag_drop")}
            </span>
            <span className="mt-1 text-xs text-slate-400  font-medium">
              {t("new_case.supported")}
            </span>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-blue-600 ">
              <Shield size={13} />
              <span>{t("new_case.multi_doc")}</span>
            </div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <ul className="space-y-2.5" aria-label="Selected documents">
            {files.map(({ key, file, previewUrl }) => (
              <li
                key={key}
                className="animate-rise-in flex items-center gap-3.5 rounded-xl border border-slate-200/90  bg-white  p-3 shadow-card transition-all"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={`Preview of ${file.name}`}
                    className="h-12 w-16 shrink-0 rounded-lg border border-slate-200  object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100  text-slate-500 ">
                    <FileText size={22} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground ">{file.name}</p>
                  <p className="text-[11px] text-slate-400 ">
                    {formatSize(file.size)} · Ready for upload
                  </p>
                </div>
                <CheckCircle2 size={18} className="shrink-0 text-emerald-500" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => removeFile(key)}
                  aria-label={`Remove ${file.name}`}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50  hover:text-rose-600 transition-colors"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Error message */}
        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-rose-50  p-4 border border-rose-200  text-rose-700 ">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-500" aria-hidden="true" />
            <p className="text-xs font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {/* Supported Categories Badge List */}
        <div className="flex flex-wrap gap-1.5 pt-2" aria-label="Supported document categories">
          {DOC_CATEGORIES.map((c) => (
            <span
              key={c}
              className="rounded-lg border border-slate-200/80  bg-slate-50/70  px-2.5 py-1 text-[11px] font-medium text-slate-600 "
            >
              {c}
            </span>
          ))}
        </div>

        {/* Submit */}
        <div className="flex justify-end border-t border-slate-100  pt-5">
          <button
            type="button"
            onClick={startScreening}
            disabled={!canSubmit}
            className="btn-primary px-6 py-2.5 "
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Uploading &amp; Initiating Pipeline…
              </>
            ) : (
              t("cases.start_screening")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
