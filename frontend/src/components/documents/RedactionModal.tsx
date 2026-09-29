import { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Eye,
  FileCheck2,
  Lock,
  AlertTriangle,
  X,
  Search,
  CheckCircle,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { apiGet, apiPost } from "../../services/api";
import type {
  DocumentItem,
  PIIScanResponse,
  RedactDocumentRequest,
  RedactDocumentResponse,
  RedactedVersionOut,
} from "../../types/api";

interface Props {
  document: DocumentItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function RedactionModal({ document, isOpen, onClose, onUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<"scan" | "history">("scan");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<PIIScanResponse | null>(null);
  const [customVictimNames, setCustomVictimNames] = useState("");
  const [selectedEntities, setSelectedEntities] = useState<Record<number, boolean>>({});
  const [reason, setReason] = useState("Section 228A IPC / Section 73 BNS statutory victim identity protection for judicial filing");
  const [courtOrderRef, setCourtOrderRef] = useState("");
  const [applyWatermark, setApplyWatermark] = useState(true);
  const [maskStyle, setMaskStyle] = useState("blackout");

  const [redacting, setRedacting] = useState(false);
  const [redactResult, setRedactResult] = useState<RedactDocumentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [redactedVersions, setRedactedVersions] = useState<RedactedVersionOut[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRedactedVersions();
    }
  }, [isOpen, document.id]);

  const loadRedactedVersions = async () => {
    try {
      setLoadingHistory(true);
      const list = await apiGet<RedactedVersionOut[]>(`/api/redaction/documents/${document.id}/versions`);
      setRedactedVersions(list || []);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleScan = async () => {
    try {
      setScanning(true);
      setError(null);
      setRedactResult(null);
      const params = customVictimNames.trim()
        ? `?victim_names=${encodeURIComponent(customVictimNames.trim())}`
        : "";
      const result = await apiGet<PIIScanResponse>(`/api/redaction/documents/${document.id}/scan${params}`);
      setScanResult(result);

      // Select all detected entities by default
      const initial: Record<number, boolean> = {};
      result.entities_found.forEach((_, idx) => {
        initial[idx] = true;
      });
      setSelectedEntities(initial);
    } catch (err: any) {
      setError(err?.message || "Failed to scan document for PII.");
    } finally {
      setScanning(false);
    }
  };

  const handleExecuteRedaction = async () => {
    if (!reason.trim()) {
      setError("Please specify a legal or statutory justification for redacting this exhibit.");
      return;
    }

    try {
      setRedacting(true);
      setError(null);

      const itemsToRedact = (scanResult?.entities_found || [])
        .filter((_, idx) => selectedEntities[idx])
        .map((ent) => ({
          entity_type: ent.entity_type,
          text_to_redact: ent.text,
          bbox: ent.bbox || null,
          label: ent.masked_value,
        }));

      const payload: RedactDocumentRequest = {
        redactions: itemsToRedact,
        reason: reason.trim(),
        court_order_ref: courtOrderRef.trim() || undefined,
        apply_watermark: applyWatermark,
        mask_style: maskStyle,
        custom_victim_names: customVictimNames
          ? customVictimNames.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      };

      const resp = await apiPost<RedactDocumentResponse>(
        `/api/redaction/documents/${document.id}/redact`,
        payload
      );
      setRedactResult(resp);
      loadRedactedVersions();
      onUpdated?.();
    } catch (err: any) {
      setError(err?.message || "Failed to generate redacted exhibit derivative.");
    } finally {
      setRedacting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border-2 border-slate-900 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 text-white shadow-sm">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Data Privacy &amp; PII Redaction Shield
              </h3>
              <p className="text-xs text-slate-300">
                Statutory Non-Disclosure u/s 228A IPC / Sec 73 BNS • DPDP Act 2023
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("scan")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "scan"
                ? "border-rose-600 text-rose-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles size={14} />
            <span>Scan &amp; Redact Exhibit</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "history"
                ? "border-rose-600 text-rose-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileCheck2 size={14} />
            <span>Certified Redacted Copies ({redactedVersions.length})</span>
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Evidentiary Guarantee Banner */}
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 flex items-start gap-3">
            <ShieldCheck size={20} className="text-emerald-700 mt-0.5 shrink-0" />
            <div className="text-xs text-emerald-950">
              <span className="font-bold uppercase tracking-wider block mb-0.5 text-emerald-900">
                Evidentiary Guarantee — Original Evidence Remains Immutable
              </span>
              The original exhibit file is pristine, tamper-proof, and will never be overwritten.
              Performing redaction generates a derivative certified version (e.g.{" "}
              <code className="bg-emerald-100 font-bold px-1 rounded">court_redacted</code>) cryptographically
              chained to the original SHA-256 hash.
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "scan" && (
            <>
              {/* Document Overview */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Target Exhibit
                  </div>
                  <div className="font-bold text-slate-900 font-mono mt-0.5">
                    {document.exhibit_number ? `${document.exhibit_number} — ` : ""}
                    {document.file_name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Active Version
                  </div>
                  <div className="font-bold text-blue-700 font-mono mt-0.5">
                    v{document.current_version_number || 1}
                  </div>
                </div>
              </div>

              {/* Step 1: Scanner */}
              <div className="rounded-xl border-2 border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Search size={14} className="text-slate-600" />
                    <span>Statutory PII &amp; Victim Identity Scanner</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={scanning}
                    className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5 shadow-sm"
                  >
                    {scanning ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Scanning Exhibit…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>Scan Exhibit for PII</span>
                      </>
                    )}
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Designated Protected Names / Victim Identifiers (Optional comma-separated):
                  </label>
                  <input
                    type="text"
                    value={customVictimNames}
                    onChange={(e) => setCustomVictimNames(e.target.value)}
                    placeholder="e.g. Sunita Devi, Minor Child X, Complainant"
                    className="input-text text-xs w-full py-1.5"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Matches specific victim/minor names for statutory protection under Section 228A IPC / Section 73 BNS.
                  </p>
                </div>

                {/* Scan Results View */}
                {scanResult && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          Detected Entities ({scanResult.total_pii_count})
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            scanResult.privacy_risk_level === "critical"
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : scanResult.privacy_risk_level === "high"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-blue-100 text-blue-800 border border-blue-300"
                          }`}
                        >
                          Risk: {scanResult.privacy_risk_level}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Categories: {scanResult.categories.join(", ") || "None"}
                      </span>
                    </div>

                    {scanResult.entities_found.length === 0 ? (
                      <div className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">
                        No statutory PII patterns detected in extracted fields. You can still apply court redactions manually below.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {scanResult.entities_found.map((ent, idx) => (
                          <div
                            key={idx}
                            onClick={() =>
                              setSelectedEntities((prev) => ({ ...prev, [idx]: !prev[idx] }))
                            }
                            className={`flex items-start justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              selectedEntities[idx]
                                ? "bg-rose-50/70 border-rose-300 text-slate-900"
                                : "bg-slate-50 border-slate-200 text-slate-500 opacity-60"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                checked={!!selectedEntities[idx]}
                                onChange={() => {}} // handled by parent div
                                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 font-mono">
                                    {ent.entity_type}
                                  </span>
                                  <span className="font-mono font-semibold line-through text-slate-600">
                                    {ent.text}
                                  </span>
                                </div>
                                <div className="mt-1 text-[11px] font-bold text-rose-700 font-mono">
                                  Mask: {ent.masked_value}
                                </div>
                                {ent.recommendation && (
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    {ent.recommendation}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {ent.bbox ? "Spatial [bbox]" : "Text"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Redaction Parameters */}
              <div className="rounded-xl border-2 border-slate-200 p-4 space-y-3">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Judicial &amp; Evidentiary Release Context
                </label>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Redaction Reason / Legal Authority <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Section 228A IPC / Section 73 BNS compliance for court submission"
                    className="input-text text-xs w-full py-1.5"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Court Case / Order Reference
                    </label>
                    <input
                      type="text"
                      value={courtOrderRef}
                      onChange={(e) => setCourtOrderRef(e.target.value)}
                      placeholder="e.g. HC-CRL-2026/884 or FIR-102/2026"
                      className="input-text text-xs w-full py-1.5"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Redaction Masking Style
                    </label>
                    <select
                      value={maskStyle}
                      onChange={(e) => setMaskStyle(e.target.value)}
                      className="input-text text-xs w-full py-1.5"
                    >
                      <option value="blackout">Solid Blackout Box (Standard)</option>
                      <option value="redacted_label">Opaque with [REDACTED] Label</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="watermark-chk"
                    checked={applyWatermark}
                    onChange={(e) => setApplyWatermark(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <label htmlFor="watermark-chk" className="text-xs text-slate-700 font-medium cursor-pointer">
                    Apply official header banner:{" "}
                    <span className="font-mono text-[11px] text-slate-500">
                      "CERTIFIED COURT-REDACTED EXHIBIT • NCRB WOMEN SAFETY"
                    </span>
                  </label>
                </div>
              </div>

              {/* Execution Button */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRedaction}
                  disabled={redacting || !reason.trim()}
                  className="btn-primary text-xs flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white shadow-hard"
                >
                  {redacting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Generating Redacted Copy…</span>
                    </>
                  ) : (
                    <>
                      <Lock size={15} />
                      <span>Generate Certified Court-Redacted Derivative</span>
                    </>
                  )}
                </button>
              </div>

              {/* Redaction Result Confirmation */}
              {redactResult && (
                <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 space-y-2.5 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle size={18} className="text-emerald-600" />
                    <span>Certified Redacted Derivative Created (v{redactResult.version_number})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-500">Redacted File:</span>{" "}
                      <span className="font-mono font-bold text-slate-900">{redactResult.file_name}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Version Tag:</span>{" "}
                      <span className="font-mono font-bold text-rose-700">{redactResult.version_tag}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-semibold text-slate-500">Redacted SHA-256:</span>{" "}
                      <span className="font-mono text-slate-900 break-all">{redactResult.sha256_hash}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-semibold text-slate-500">Predecessor Hash Link:</span>{" "}
                      <span className="font-mono text-slate-600 break-all">
                        {redactResult.previous_version_hash || "Genesis"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <a
                      href={`/api/documents/${document.id}/versions/${redactResult.version_number}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3 bg-slate-900 text-white"
                    >
                      <Eye size={13} />
                      <span>View Redacted Exhibit Copy</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              {loadingHistory ? (
                <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-500">
                  <Loader2 size={16} className="animate-spin text-rose-600" />
                  <span>Loading redacted versions…</span>
                </div>
              ) : redactedVersions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
                  <FileCheck2 size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="font-semibold text-slate-700">No Court-Redacted Copies Generated Yet</p>
                  <p className="text-slate-400 mt-1">
                    Use the "Scan &amp; Redact Exhibit" tab to mask victim PII and generate certified derivative versions.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {redactedVersions.map((v) => (
                    <div
                      key={v.version_id}
                      className="rounded-xl border-2 border-slate-200 bg-white p-4 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                            v{v.version_number} · court_redacted
                          </span>
                          <span className="font-bold text-slate-800">{v.file_name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(v.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                        {v.change_summary || "Court-mandated redaction copy"}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <div className="font-mono truncate max-w-[360px]">
                          SHA-256: <span className="text-slate-700 font-semibold">{v.sha256_hash.slice(0, 16)}…</span>
                        </div>
                        <a
                          href={v.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary text-xs flex items-center gap-1 py-1 px-2.5 bg-slate-900 text-white"
                        >
                          <Eye size={12} />
                          <span>View Redacted File</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
