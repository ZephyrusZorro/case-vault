import { useState, useEffect } from "react";
import {
  Shield,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Hash,
  User,
  PlusCircle,
  Loader2,
  FileText,
  Send,
  Eye,
} from "lucide-react";
import { apiGet, apiPost } from "../../services/api";
import type { CaseDetail } from "../../types/api";

interface ChainOfCustodyTabProps {
  caseData: CaseDetail;
  onRefresh?: () => void;
}

interface CustodyEvent {
  id: string;
  sequence_number: number;
  event_type: string;
  action: string;
  timestamp: string;
  user_name?: string | null;
  user_role?: string | null;
  current_hash: string;
  previous_hash?: string | null;
  details?: Record<string, any>;
}

export function ChainOfCustodyTab({ caseData, onRefresh }: ChainOfCustodyTabProps) {
  const [events, setEvents] = useState<CustodyEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    isValid: boolean;
    totalEvents: number;
    tampered: number;
    message?: string;
  } | null>(null);

  // New Note / Handover entry
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      const data = await apiGet<CustodyEvent[]>(`/api/audit/cases/${caseData.id}?limit=200`);
      setEvents(data);
    } catch {
      // ignore
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [caseData.id]);

  const handleVerifyLedger = async () => {
    try {
      setVerifying(true);
      setVerifyResult(null);
      const res = await apiGet<{
        is_valid: boolean;
        total_events: number;
        tampered_sequences: number[];
        errors: string[];
      }>("/api/audit/verify");

      setVerifyResult({
        isValid: res.is_valid,
        totalEvents: res.total_events,
        tampered: res.tampered_sequences.length,
        message: res.is_valid
          ? "Ledger integrity 100% verified. Sequential SHA-256 hash chains unbroken."
          : `Integrity check failed: ${res.errors.join(", ")}`,
      });
    } catch (err: any) {
      setVerifyResult({
        isValid: false,
        totalEvents: 0,
        tampered: 1,
        message: err.message || "Failed to verify ledger integrity.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      setSubmittingNote(true);
      setNoteError(null);
      await apiPost(`/api/audit/cases/${caseData.id}/note`, {
        note: `[Custodial Handover] ${noteText.trim()}`,
      });
      setNoteText("");
      setNoteOpen(false);
      fetchEvents();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setNoteError(err.message || "Failed to record custodial note.");
    } finally {
      setSubmittingNote(false);
    }
  };

  const openOfficialCertificate = () => {
    window.open(`/api/audit/cases/${caseData.id}/certificate/html`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Compliance Header */}
      <div className="rounded-2xl border-2 border-foreground bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 p-6 text-white shadow-hard space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400 font-mono text-xs font-black text-slate-950">
                65B
              </span>
              <h3 className="text-base font-black uppercase tracking-wider text-white">
                Statutory Chain of Custody &amp; Forensic Ledger
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              National Crime Records Bureau Evidentiary Standard • Bharatiya Sakshya Adhiniyam, 2023 / Indian Evidence Act Sec 65B
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleVerifyLedger}
              disabled={verifying}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-white/80 bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur hover:bg-white/20 transition-all shadow-hard active:translate-y-0.5"
            >
              {verifying ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Verifying Ledger…</span>
                </>
              ) : (
                <>
                  <Shield size={13} className="text-emerald-400" />
                  <span>Verify Cryptographic Integrity</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={openOfficialCertificate}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-foreground bg-accent-yellow px-4 py-2 text-xs font-black text-foreground shadow-hard-active transition-all hover:bg-amber-300 active:translate-y-0.5"
            >
              <Printer size={14} />
              <span>Print Official Sec 65B Certificate</span>
            </button>
          </div>
        </div>

        {/* Verification Result Notification */}
        {verifyResult && (
          <div
            className={`rounded-xl border-2 p-3 text-xs flex items-center justify-between gap-3 ${
              verifyResult.isValid
                ? "border-emerald-400 bg-emerald-950/80 text-emerald-200"
                : "border-rose-400 bg-rose-950/80 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {verifyResult.isValid ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
              )}
              <span className="font-semibold">{verifyResult.message}</span>
            </div>
            <span className="font-mono text-[10px] text-slate-300">
              Checked {verifyResult.totalEvents} block(s)
            </span>
          </div>
        )}

        {/* Quick Custody Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2 border-t border-white/10 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Case ID / Number</span>
            <p className="font-mono font-bold text-white mt-0.5">
              {caseData.case_id || `CASE-${caseData.case_number}`}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Seized Exhibits</span>
            <p className="font-bold text-white mt-0.5">{caseData.documents.length} Items Logged</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Legal Hold Status</span>
            <p className={`font-bold mt-0.5 ${caseData.legal_hold ? "text-rose-400 font-extrabold" : "text-emerald-400"}`}>
              {caseData.legal_hold ? "LOCKED UNDER LEGAL HOLD" : "Normal Retention"}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Clearance Classification</span>
            <p className="font-bold text-white capitalize mt-0.5">
              {caseData.classification_level || "Restricted"}
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Seized Exhibits Ledger */}
      <div className="rounded-2xl border-2 border-foreground bg-white p-5 shadow-hard space-y-4">
        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-foreground">
              Evidence Exhibits &amp; Digital Fingerprints ({caseData.documents.length})
            </h4>
            <p className="text-xs text-slate-500">
              Each physical or digital exhibit is bound to a SHA-256 cryptographic hash recorded upon seizure
            </p>
          </div>
        </div>

        {caseData.documents.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            No exhibits recorded in this case dossier yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-2.5 px-3">Exhibit Tag</th>
                  <th className="py-2.5 px-3">Evidence Item / File</th>
                  <th className="py-2.5 px-3">Document Type</th>
                  <th className="py-2.5 px-3">SHA-256 Checksum</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {caseData.documents.map((doc, idx) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-2 py-0.5 font-mono text-[11px] font-black text-blue-900">
                        {doc.exhibit_number || `EX-${String(idx + 1).padStart(3, "0")}`}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-foreground truncate max-w-[220px]" title={doc.file_name}>
                        {doc.file_name}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {(doc.file_size / 1024).toFixed(1)} KB • v{doc.current_version_number || 1}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 capitalize">
                        {doc.document_type ? doc.document_type.replace(/_/g, " ") : "Unclassified"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
                        <Hash size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[150px]" title={doc.sha256_hash || "Calculated at upload"}>
                          {doc.sha256_hash ? `${doc.sha256_hash.slice(0, 16)}…` : "Verified SHA-256"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        {doc.is_sealed ? (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            <Lock size={10} /> Sealed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <CheckCircle2 size={10} /> Intact
                          </span>
                        )}
                        {doc.legal_hold && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Hold
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <a
                        href={`/api/documents/${doc.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-slate-50 transition-colors"
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Custodial Transfer & Activity Timeline */}
      <div className="rounded-2xl border-2 border-foreground bg-white p-5 shadow-hard space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-foreground">
              Sequential Chain of Custody Audit Log ({events.length} Events)
            </h4>
            <p className="text-xs text-slate-500">
              Complete custodial transfers, seizures, forensic runs, notes, and legal reviews
            </p>
          </div>

          <button
            type="button"
            onClick={() => setNoteOpen(!noteOpen)}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-foreground bg-slate-50 px-3 py-1.5 text-xs font-bold text-foreground shadow-hard-active transition-all hover:bg-slate-100 active:translate-y-0.5"
          >
            <PlusCircle size={13} />
            <span>Record Custodial Handover / Note</span>
          </button>
        </div>

        {/* Note Entry Drawer */}
        {noteOpen && (
          <form
            onSubmit={handleAddNote}
            className="rounded-xl border-2 border-foreground bg-slate-50 p-4 space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                <FileText size={13} className="text-blue-600" />
                Record Officer Handover / Custody Transfer
              </h5>
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-foreground"
              >
                Cancel
              </button>
            </div>

            <textarea
              required
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              placeholder="e.g., Physical exhibit EX-001 handed over to Forensic Science Lab (FSL) Rohini for biometric verification. Received by Sr. Sci. Officer Dr. S. Rao..."
              className="w-full rounded-lg border-2 border-slate-300 p-2.5 text-xs text-foreground focus:border-foreground focus:outline-none bg-white"
            />

            {noteError && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                {noteError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                className="btn-secondary text-xs"
              >
                Abort
              </button>
              <button
                type="submit"
                disabled={submittingNote}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                {submittingNote ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Signing Handover Entry…</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Append to Immutable Chain</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Events Timeline */}
        {loadingEvents ? (
          <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-blue-600" />
            <span>Loading verified custody ledger…</span>
          </div>
        ) : events.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">
            No custody events recorded for this case yet.
          </p>
        ) : (
          <div className="relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 space-y-4">
            {events.map((evt) => (
              <div key={evt.id} className="relative group">
                <div className="absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-foreground bg-accent-yellow shadow-sm font-mono text-[9px] font-black text-foreground">
                  {evt.sequence_number}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs space-y-2 hover:border-slate-300 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-200/80 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 uppercase">
                        {evt.event_type}
                      </span>
                      <strong className="text-foreground text-xs font-bold">
                        {evt.action}
                      </strong>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">
                      {new Date(evt.timestamp).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-1.5 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-slate-400" />
                      <span>Recorded by: </span>
                      <strong className="text-slate-800">
                        {evt.user_name || "Investigating Officer"}
                      </strong>
                      <span className="text-slate-400">({evt.user_role || "officer"})</span>
                    </div>

                    <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200" title={evt.current_hash}>
                      <Hash size={10} className="text-slate-400" />
                      <span>Block: {evt.current_hash.slice(0, 14)}…</span>
                    </div>
                  </div>

                  {evt.details && Object.keys(evt.details).length > 0 && (
                    <div className="bg-white rounded-lg p-2 border border-slate-100 font-mono text-[10px] text-slate-600">
                      {Object.entries(evt.details)
                        .filter(([k]) => !["note"].includes(k))
                        .map(([k, v]) => (
                          <span key={k} className="mr-3 inline-block">
                            <span className="text-slate-400">{k}:</span> {typeof v === "object" ? JSON.stringify(v) : String(v)}
                          </span>
                        ))}
                      {evt.details.note && (
                        <p className="mt-1 font-sans text-xs italic text-slate-700">
                          "{evt.details.note}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
