import { useState } from "react";
import { Edit2, Check, AlertCircle, Shield, CheckCircle2, RotateCw } from "lucide-react";
import { apiPatch, apiPost } from "../../services/api";
import type { DocumentItem } from "../../types/api";

export const DOCUMENT_TYPE_OPTIONS = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "driving_licence", label: "Driving Licence" },
  { value: "passport", label: "Passport" },
  { value: "voter_id", label: "Voter ID (EPIC)" },
  { value: "national_id", label: "National ID" },
  { value: "address_proof", label: "Address Proof" },
  { value: "visa", label: "Visa" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other Identity Document" },
  { value: "unknown", label: "Unknown / Unclassified" },
] as const;

export function getDocTypeLabel(type: string | null | undefined): string {
  if (!type || type === "unknown") return "Unknown / Unclassified";
  const match = DOCUMENT_TYPE_OPTIONS.find((opt) => opt.value === type.toLowerCase());
  if (match) return match.label;
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  caseId: string;
  document: DocumentItem;
  onUpdated?: (updated: DocumentItem) => void;
  compact?: boolean;
}

export function DocumentTypeSelector({
  caseId,
  document,
  onUpdated,
  compact = false,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedType, setSelectedType] = useState(document.document_type || "unknown");
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [showRerunPrompt, setShowRerunPrompt] = useState(false);
  const [rerunning, setRerunning] = useState(false);

  const isUnknown = !document.document_type || document.document_type === "unknown";
  const isUserVerified = document.type_confidence === 1.0;

  async function handleSave() {
    setSaving(true);
    setStatusMsg(null);
    try {
      const updated = await apiPatch<DocumentItem>(
        `/api/cases/${caseId}/documents/${document.id}/type`,
        { document_type: selectedType },
      );
      setStatusMsg("Document type updated");
      setIsEditing(false);
      setShowRerunPrompt(true);
      if (onUpdated) {
        onUpdated(updated);
      }
    } catch (err) {
      setStatusMsg("Failed to update type");
    } finally {
      setSaving(false);
    }
  }

  async function handleRerunAnalysis() {
    setRerunning(true);
    try {
      await apiPost(`/api/cases/${caseId}/analyze`);
      window.location.href = `/processing/${caseId}`;
    } catch {
      setRerunning(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Type Display Badge */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${
            isUnknown
              ? "bg-amber-100 text-amber-800   ring-1 ring-amber-400/40"
              : isUserVerified
                ? "bg-emerald-50 text-emerald-700   ring-1 ring-emerald-500/30"
                : "bg-blue-50 text-blue-700   ring-1 ring-blue-500/30"
          }`}
        >
          {isUnknown ? (
            <AlertCircle size={12} className="text-amber-500" />
          ) : isUserVerified ? (
            <CheckCircle2 size={12} className="text-emerald-500" />
          ) : (
            <Shield size={12} className="text-blue-500" />
          )}
          <span>{getDocTypeLabel(document.document_type)}</span>
          {document.type_confidence !== null && (
            <span className="opacity-70 font-mono text-[10px]">
              {isUserVerified
                ? "· Manual"
                : `· ${Math.round(document.type_confidence * 100)}%`}
            </span>
          )}
        </span>

        {/* Change / Correct button */}
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600  hover:underline"
            title="Correct or manually specify document type"
          >
            <Edit2 size={11} />
            <span>{compact ? "Edit" : "Correct Type"}</span>
          </button>
        )}
      </div>

      {/* Inline Editor */}
      {isEditing && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-slate-300  bg-white  px-2.5 py-1 text-xs font-medium text-slate-800  focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DOCUMENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="btn-primary flex items-center gap-1 px-2.5 py-1 text-xs"
          >
            <Check size={12} />
            <span>{saving ? "Saving…" : "Confirm"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="btn-secondary px-2.5 py-1 text-xs"
          >
            Cancel
          </button>
        </div>
      )}

      {statusMsg && !isEditing && (
        <p className="text-[11px] text-emerald-600  font-medium">
          {statusMsg}
        </p>
      )}

      {showRerunPrompt && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200  bg-blue-50/70  p-2.5 text-xs">
          <span className="text-blue-800 ">
            Re-run screening with updated document type?
          </span>
          <button
            type="button"
            disabled={rerunning}
            onClick={handleRerunAnalysis}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition"
          >
            <RotateCw size={12} className={rerunning ? "animate-spin" : ""} />
            <span>{rerunning ? "Starting…" : "Re-run Analysis"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
