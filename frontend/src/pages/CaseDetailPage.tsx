import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  GitCommit,
  Lock,
  ShieldAlert,
  Shield,
  Users,
  Send,
  BookOpen,
  ClipboardList,
  PlusCircle,
  Clock,
  StickyNote,
  FolderOpen,
  Link2,
  ChevronRight,
  FolderPlus,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { ReportTab } from "../components/documents/ReportTab";
import { DocImage } from "../components/documents/DocImage";
import { DocumentTypeSelector } from "../components/documents/DocumentTypeSelector";
import { DocumentVersionModal } from "../components/documents/DocumentVersionModal";
import { RedactionModal } from "../components/documents/RedactionModal";
import { CaseAuditTab } from "../components/documents/CaseAuditTab";
import { WorkflowPanel } from "../components/workflow/WorkflowPanel";
import { ChainOfCustodyTab } from "../components/documents/ChainOfCustodyTab";
import { UploadExhibitModal } from "../components/documents/UploadExhibitModal";
import { useApi } from "../hooks/useApi";
import { apiPatch, apiPost } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { CaseDetail, DocumentDetail } from "../types/api";
import { useTranslation } from "react-i18next";

// ----------------------------------------------------------------- tabs
const TABS = [
  "Overview",
  "Workflow",
  "Evidence",
  "Chain of Custody",
  "Case Diary",
  "Audit Trail",
  "Report",
] as const;
type Tab = (typeof TABS)[number];

// ----------------------------------------------------------------- helpers
const FIELD_LABELS: Record<string, string> = {
  full_name: "Name",
  document_number: "Document Number",
  date_of_birth: "Date of Birth",
  gender: "Gender",
  nationality: "Nationality",
  issue_date: "Date of Issue",
  expiry_date: "Date of Expiry",
  address: "Address",
  aadhaar_number: "Aadhaar Number",
  pan_number: "PAN Number",
  phone: "Phone",
  email: "Email",
};

function formatFieldName(key: string): string {
  return (
    FIELD_LABELS[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function ConfidenceChip({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-slate-400">—</span>;
  const tone =
    value >= 85
      ? "bg-accent-mint text-foreground"
      : value >= 65
        ? "bg-accent-yellow text-foreground"
        : "bg-accent-pink text-white";
  return (
    <span className={`rounded-md px-2 py-0.5 border-2 border-foreground shadow-hard text-xs font-mono font-bold ${tone}`}>
      {value.toFixed(0)}%
    </span>
  );
}

// -------------------------------------------------------------- status badge
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-blue-50 text-blue-800 border-blue-300",
    under_investigation: "bg-amber-50 text-amber-800 border-amber-300",
    pending_review: "bg-indigo-50 text-indigo-800 border-indigo-300",
    pending_approval: "bg-orange-50 text-orange-800 border-orange-300",
    court_ready: "bg-emerald-50 text-emerald-900 border-emerald-400 font-extrabold",
    closed: "bg-slate-100 text-slate-600 border-slate-300",
    archived: "bg-slate-50 text-slate-500 border-slate-200",
    active: "bg-blue-50 text-blue-800 border-blue-300",
    under_review: "bg-indigo-50 text-indigo-800 border-indigo-300",
  };
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const cls = map[status] ?? "bg-slate-100 text-slate-600 border-slate-300";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    critical: "bg-rose-600 text-white",
    high: "bg-orange-500 text-white",
    medium: "bg-amber-400 text-slate-900",
    low: "bg-slate-200 text-slate-700",
  };
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-extrabold uppercase ${map[priority] ?? "bg-slate-200 text-slate-700"}`}>
      {priority}
    </span>
  );
}

// ---------------------------------------------------------- Evidence Tab
function EvidenceTab({
  caseData,
  onRefresh,
  onAddExhibit,
}: {
  caseData: CaseDetail;
  onRefresh?: () => void;
  onAddExhibit?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    caseData.documents[0]?.id ?? null,
  );
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [redactionModalOpen, setRedactionModalOpen] = useState(false);
  const { data: doc, loading, error, reload: reloadDoc } = useApi<DocumentDetail>(
    selectedId ? `/api/documents/${selectedId}` : null,
  );
  const selectedDocItem = caseData.documents.find((d) => d.id === selectedId);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
      {/* Evidence list */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Case Exhibits ({caseData.documents.length})
          </h4>
          {onAddExhibit && (
            <button
              type="button"
              onClick={onAddExhibit}
              className="inline-flex items-center gap-1 rounded-lg border-2 border-foreground bg-white px-2 py-0.5 text-[10px] font-bold text-foreground shadow-hard-active hover:bg-accent-yellow transition-colors"
            >
              <PlusCircle size={11} />
              <span>Add Exhibit</span>
            </button>
          )}
        </div>
        <ul className="space-y-2" aria-label="Case exhibits">
          {caseData.documents.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setSelectedId(d.id)}
                className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                  selectedId === d.id
                    ? "border-foreground bg-accent-yellow shadow-hard-active translate-x-1"
                    : "border-transparent bg-white hover:border-foreground hover:shadow-hard"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-xs font-bold text-foreground">{d.file_name}</p>
                  <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1 rounded shrink-0">
                    v{d.current_version_number || 1}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span className="capitalize truncate">
                    {d.document_type
                      ? `${d.document_type.replace(/_/g, " ")}${
                          d.type_confidence !== null
                            ? ` · ${Math.round(d.type_confidence * 100)}%`
                            : ""
                        }`
                      : "type pending"}
                  </span>
                  {d.is_sealed && <Lock size={11} className="text-rose-600 shrink-0" />}
                </div>
                {d.exhibit_number && (
                  <span className="mt-0.5 inline-block text-[10px] font-bold text-blue-700 font-mono">
                    {d.exhibit_number}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Detail panel */}
      <div className="card p-5">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-xs text-slate-500">
            <Loader2 size={18} className="animate-spin text-blue-500" aria-hidden="true" /> Loading exhibit details…
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200">
            {error}
          </p>
        )}
        {!loading && !error && doc && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(220px,320px)_1fr]">
            {/* Preview */}
            <div>
              {doc.has_preview ? (
                <DocImage
                  src={`/api/documents/${doc.id}/file`}
                  alt={`Exhibit ${doc.file_name}`}
                  className="w-full rounded-xl border-2 border-foreground shadow-hard"
                />
              ) : (
                <div className="flex aspect-[3/2] items-center justify-center rounded-xl border-2 border-foreground bg-slate-50 shadow-hard">
                  <FileText size={40} className="text-slate-400" aria-hidden="true" strokeWidth={2.5} />
                </div>
              )}
              <dl className="mt-4 space-y-3 text-xs text-slate-500 border-t border-slate-100 pt-3">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Exhibit Type
                  </dt>
                  <dd>
                    <DocumentTypeSelector
                      caseId={caseData.id}
                      document={doc}
                      onUpdated={() => { reloadDoc(); onRefresh?.(); }}
                    />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>SHA-256 Hash</dt>
                  <dd className="font-mono text-[11px] text-foreground">{doc.file_hash_prefix ?? "—"}</dd>
                </div>
              </dl>

              {/* Exhibit action buttons */}
              {selectedDocItem && (
                <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Exhibit Ref</span>
                    <span className="font-mono font-bold text-blue-700">
                      {selectedDocItem.exhibit_number || "Unassigned"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Legal Category</span>
                    <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                      {selectedDocItem.legal_category || "General Exhibit"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVersionModalOpen(true)}
                    className="btn-primary w-full text-xs flex items-center justify-center gap-1.5 py-2 mt-2"
                  >
                    <GitCommit size={14} />
                    <span>Version History &amp; Chain (v{selectedDocItem.current_version_number || 1})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRedactionModalOpen(true)}
                    className="btn-primary w-full text-xs flex items-center justify-center gap-1.5 py-2 mt-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                  >
                    <ShieldAlert size={14} />
                    <span>PII Shield &amp; Court Redact</span>
                  </button>
                  <a
                    href={`/api/documents/${doc.id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full mt-1.5 flex items-center justify-center gap-1.5 rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-900 hover:bg-white transition-colors"
                  >
                    <FolderOpen size={14} />
                    <span>Download Original Exhibit</span>
                  </a>
                </div>
              )}
            </div>

            {/* Extracted fields */}
            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
                Structured Field Ledger
              </h4>
              {doc.fields.length === 0 ? (
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 p-4 border border-amber-200">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
                  <p className="text-xs leading-relaxed text-amber-800">
                    No structured fields extracted yet. Run analysis or upload a clearer document scan.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500">
                      <tr>
                        <th scope="col" className="table-head-cell">Field</th>
                        <th scope="col" className="table-head-cell">Extracted Value</th>
                        <th scope="col" className="table-head-cell">Conf.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {doc.fields.map((f, i) => (
                        <tr key={`${i}-${f.field_name}-${f.raw_value}`} className="hover:bg-slate-50/50">
                          <td className="table-cell whitespace-nowrap font-medium text-slate-600">{formatFieldName(f.field_name)}</td>
                          <td className="table-cell">
                            <span className="font-bold text-foreground">{f.normalized_value ?? f.raw_value}</span>
                          </td>
                          <td className="table-cell"><ConfidenceChip value={f.confidence} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                <CheckCircle2 size={13} aria-hidden="true" className="text-blue-500" />
                Evidence extracted via multi-pass OCR. Run analysis pipeline for deeper extraction.
              </div>
            </div>
          </div>
        )}
        {!loading && !error && !doc && (
          <div className="flex items-center justify-center py-16 text-xs text-slate-400">
            Select an exhibit from the list to inspect its contents.
          </div>
        )}
      </div>

      {versionModalOpen && selectedDocItem && (
        <DocumentVersionModal
          document={selectedDocItem}
          isOpen={versionModalOpen}
          onClose={() => setVersionModalOpen(false)}
          onUpdated={() => { reloadDoc(); onRefresh?.(); }}
        />
      )}

      {redactionModalOpen && selectedDocItem && (
        <RedactionModal
          document={selectedDocItem}
          isOpen={redactionModalOpen}
          onClose={() => setRedactionModalOpen(false)}
          onUpdated={() => { reloadDoc(); onRefresh?.(); }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------- Case Diary Tab
interface CaseNote {
  id: string;
  content: string;
  author: string;
  role: string;
  timestamp: string;
}

function CaseDiaryTab({ caseId }: { caseId: string }) {
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const endRef = useRef<HTMLDivElement>(null);

  // Load notes from audit trail (CASE_NOTE events)
  const loadNotes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/audit/cases/${caseId}`);
      const events = await res.json();
      const noteEvents = (events as any[])
        .filter((e: any) => e.event_type === "CASE_NOTE")
        .map((e: any) => ({
          id: e.id,
          content: e.details?.note || e.action,
          author: e.user_name || e.user_email || "System",
          role: e.user_role || "—",
          timestamp: e.timestamp,
        }));
      setNotes(noteEvents);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNotes(); }, [caseId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [notes]);

  const handleSubmit = async () => {
    if (!draft.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      await apiPost(`/api/audit/cases/${caseId}/note`, { note: draft.trim() });
      setDraft("");
      await loadNotes();
    } catch (err: any) {
      setError(err?.message || "Failed to save diary entry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex items-start gap-3">
        <BookOpen size={18} className="text-blue-700 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-900">
          <span className="font-bold block mb-0.5">Investigation Case Diary</span>
          All entries are immutably recorded in the cryptographic audit chain. Each note is timestamped, attributed to the officer's role, and cannot be deleted or altered.
        </div>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
            <Loader2 size={16} className="animate-spin" /> Loading diary entries…
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
            <StickyNote size={28} className="mx-auto text-slate-400 mb-2" />
            <p className="font-semibold text-slate-600">No diary entries yet.</p>
            <p className="text-slate-400 mt-1">Add the first investigation note below.</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="flex gap-3 animate-in fade-in duration-200">
              <div className="shrink-0 mt-1">
                <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-extrabold">
                  {note.author.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="flex-1 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{note.author}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                      {note.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock size={11} />
                    <span>{new Date(note.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{note.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Compose entry */}
      <div className="rounded-xl border-2 border-slate-200 bg-slate-50/60 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <PlusCircle size={15} className="text-blue-600" />
          <span>Add Diary Entry</span>
          {user && (
            <span className="ml-auto font-normal text-slate-500 text-[11px]">
              as {user.name || user.email} ({user.role})
            </span>
          )}
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Enter investigation note, observation, witness account summary, or operational update…"
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Ctrl+Enter to submit</span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !draft.trim()}
            className="btn-primary text-xs flex items-center gap-2 px-4 py-2"
          >
            {submitting ? (
              <><Loader2 size={13} className="animate-spin" /> Recording…</>
            ) : (
              <><Send size={13} /> Record Entry</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------- main page
export function CaseDetailPage() {
  useTranslation();
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Overview");
  const {
    data: caseData,
    loading,
    error,
    reload,
  } = useApi<CaseDetail>(caseId ? `/api/cases/${caseId}` : null);

  useEffect(() => {
    const handleTabSwitch = (e: any) => {
      const targetTab = e.detail;
      if (targetTab && (TABS as readonly string[]).includes(targetTab)) {
        setTab(targetTab as Tab);
      }
    };
    window.addEventListener("idshield:switch-tab", handleTabSwitch);
    return () => window.removeEventListener("idshield:switch-tab", handleTabSwitch);
  }, []);

  const { user } = useAuth();
  const canEdit = user ? ["admin", "supervisor", "investigator"].includes(user.role) : false;
  const canApplyHold = user ? ["admin", "supervisor", "reviewer", "legal_officer", "legal"].includes(user.role) : false;
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const handleToggleCaseLegalHold = async () => {
    if (!caseData) return;
    if (caseData.legal_hold) {
      const confirmLift = window.confirm(
        "Are you sure you want to lift the Legal Hold on this case? Evidence modification protections will revert to standard RBAC policies."
      );
      if (!confirmLift) return;
      const reason = window.prompt("Enter legal justification for lifting the hold:") || "Hold lifted by authorized officer";
      try {
        await apiPost(`/api/cases/${caseData.id}/legal-hold`, { action: "lift", reason });
        reload();
      } catch (err: any) { alert(err.message || "Failed to lift legal hold."); }
    } else {
      const reason = window.prompt(
        "Enter legal hold reason / judicial preservation order reference:\n(e.g., 'HC Injunction CRL-2026/894')"
      );
      if (!reason || !reason.trim()) return;
      try {
        await apiPost(`/api/cases/${caseData.id}/legal-hold`, { action: "apply", reason: reason.trim() });
        reload();
      } catch (err: any) { alert(err.message || "Failed to apply legal hold."); }
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!caseData) return;
    setUpdating(true); setUpdateError(null);
    try { await apiPatch(`/api/cases/${caseData.id}`, { status: newStatus }); reload(); }
    catch (err: any) { setUpdateError(err.message || "Failed to update case status"); }
    finally { setUpdating(false); }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!caseData) return;
    setUpdating(true); setUpdateError(null);
    try { await apiPatch(`/api/cases/${caseData.id}`, { priority: newPriority }); reload(); }
    catch (err: any) { setUpdateError(err.message || "Failed to update case priority"); }
    finally { setUpdating(false); }
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6">
      <button
        type="button"
        onClick={() => navigate("/history")}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-navy-900"
      >
        <ArrowLeft size={14} aria-hidden="true" /> Back to Case Directory
      </button>

      <PageHeader
        title={caseData ? `${caseData.case_id || `CASE-2026-${String(caseData.case_number).padStart(5, "0")}`} — ${caseData.title || caseData.case_name}` : "Investigation Dossier"}
        subtitle="Secure Digital Document Management — NCRB Women Safety Division"
        actions={
          caseData && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <FolderPlus size={14} />
                <span>Add Exhibit</span>
              </button>
              {canApplyHold && (
                <button
                  type="button"
                  onClick={handleToggleCaseLegalHold}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border-2 font-bold transition-all ${
                    caseData.legal_hold
                      ? "bg-rose-50 border-rose-600 text-rose-700 hover:bg-rose-100 shadow-sm"
                      : "bg-white border-slate-300 text-slate-700 hover:border-foreground"
                  }`}
                >
                  <ShieldAlert size={14} className={caseData.legal_hold ? "text-rose-600" : "text-slate-500"} />
                  <span>{caseData.legal_hold ? "Release Legal Hold" : "Apply Legal Hold"}</span>
                </button>
              )}
            </div>
          )
        }
      />

      {/* Active Legal Hold Banner */}
      {caseData && caseData.legal_hold && (
        <div className="rounded-xl border-2 border-rose-500 bg-rose-50/95 p-4 text-rose-900 shadow-hard flex items-start gap-3">
          <ShieldAlert size={22} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-extrabold uppercase tracking-wider text-rose-800 flex items-center gap-2">
              <span>ACTIVE LEGAL HOLD / EVIDENTIARY PRESERVATION ORDER</span>
              <span className="rounded bg-rose-200 text-rose-800 px-1.5 py-0.5 text-[10px] font-mono">IMMUTABLE</span>
            </div>
            <p className="text-rose-700 font-semibold leading-relaxed">
              {caseData.legal_hold_reason || "All exhibits under this investigation are locked against modification or deletion pursuant to evidentiary preservation order."}
            </p>
            {caseData.legal_hold_applied_by && (
              <p className="text-[11px] text-rose-600">
                Applied by <span className="font-bold">{caseData.legal_hold_applied_by}</span>
                {caseData.legal_hold_applied_at && ` on ${new Date(caseData.legal_hold_applied_at).toLocaleString()}`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Case Dossier Header Card */}
      {caseData && (
        <div className="card p-5 space-y-4 border-l-4 border-l-blue-600 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                  <Shield size={12} className="text-blue-600" />
                  {caseData.case_id || `CASE-2026-${String(caseData.case_number).padStart(5, "0")}`}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {caseData.case_type || "Women Safety Investigation"}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {caseData.department || "NCRB Women Safety Division"}
                </span>
              </div>
              <h2 className="text-base font-bold text-foreground">
                {caseData.title || caseData.case_name}
              </h2>
              {caseData.description && (
                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                  {caseData.description}
                </p>
              )}
            </div>

            {/* Priority & Status */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Priority:</span>
                {canEdit ? (
                  <select
                    value={caseData.priority || "medium"}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    disabled={updating}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold capitalize text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                ) : (
                  <PriorityBadge priority={caseData.priority || "medium"} />
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status:</span>
                {canEdit ? (
                  <select
                    value={caseData.status || "open"}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={updating}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold capitalize text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="open">Open</option>
                    <option value="under_investigation">Under Investigation</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="court_ready">Court Ready</option>
                    <option value="closed">Closed</option>
                    <option value="archived">Archived</option>
                  </select>
                ) : (
                  <StatusBadge status={caseData.status} />
                )}
              </div>
              {updating && <Loader2 size={15} className="animate-spin text-blue-600" />}
            </div>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Exhibits</p>
              <p className="mt-0.5 text-xl font-black text-foreground">{caseData.documents.length}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Classification</p>
              <p className="mt-0.5 text-sm font-bold text-foreground capitalize">{caseData.classification_level || "restricted"}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Legal Hold</p>
              <p className={`mt-0.5 text-sm font-bold ${caseData.legal_hold ? "text-rose-700" : "text-emerald-700"}`}>
                {caseData.legal_hold ? "Active" : "None"}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Priority</p>
              <p className="mt-0.5">
                <PriorityBadge priority={caseData.priority || "medium"} />
              </p>
            </div>
          </div>

          {/* Assigned Officers */}
          {caseData.assigned_investigators && caseData.assigned_investigators.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <Users size={12} className="text-slate-400 shrink-0" />
              <span className="font-bold text-slate-500 text-[11px]">Assigned Officers:</span>
              <div className="flex flex-wrap gap-1.5">
                {caseData.assigned_investigators.map((officer, i) => (
                  <span key={i} className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                    {officer}
                  </span>
                ))}
              </div>
            </div>
          )}
          {updateError && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">{updateError}</p>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="card overflow-hidden">
        <div role="tablist" aria-label="Case sections" className="flex gap-1 overflow-x-auto border-b-2 border-foreground bg-slate-50 px-3 pt-2">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              type="button"
              onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-t-xl px-4 py-2.5 text-xs font-bold transition-all border-2 border-b-0 ${
                tab === t
                  ? "border-foreground bg-white text-foreground shadow-hard-active translate-y-0.5 z-10"
                  : "border-transparent text-slate-500 hover:text-foreground hover:bg-slate-100/50"
              }`}
            >
              {t === "Overview" && <span className="inline-flex items-center gap-1.5"><ChevronRight size={12} />{t}</span>}
              {t === "Workflow" && <span className="inline-flex items-center gap-1.5"><ShieldCheck size={12} className="text-blue-600" />{t}</span>}
              {t === "Evidence" && <span className="inline-flex items-center gap-1.5"><FolderOpen size={12} />{t}</span>}
              {t === "Chain of Custody" && <span className="inline-flex items-center gap-1.5"><Scale size={12} className="text-amber-600" />{t}</span>}
              {t === "Case Diary" && <span className="inline-flex items-center gap-1.5"><StickyNote size={12} />{t}</span>}
              {t === "Audit Trail" && <span className="inline-flex items-center gap-1.5"><Link2 size={12} />{t}</span>}
              {t === "Report" && <span className="inline-flex items-center gap-1.5"><ClipboardList size={12} />{t}</span>}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center gap-3 py-16 text-xs text-slate-500">
              <Loader2 size={18} className="animate-spin text-blue-500" aria-hidden="true" /> Loading investigation dossier…
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200">
              {error}
            </p>
          )}

          {/* ---- OVERVIEW ---- */}
          {caseData && tab === "Overview" && (
            <div className="space-y-6">
              {/* Prominent Workflow Approval Pipeline */}
              <WorkflowPanel caseData={caseData} onWorkflowUpdated={() => reload()} />

              {caseData.documents.length > 0 ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Evidence Exhibit Gallery ({caseData.documents.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => setUploadModalOpen(true)}
                      className="btn-secondary text-xs flex items-center gap-1.5"
                    >
                      <FolderPlus size={13} className="text-blue-600" />
                      <span>Add Exhibit</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {caseData.documents.map((d) => (
                      <figure
                        key={d.id}
                        className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-card cursor-pointer hover:border-blue-400 transition-colors"
                        onClick={() => setTab("Evidence")}
                      >
                        {d.has_preview ? (
                          <DocImage
                            src={`/api/documents/${d.id}/file`}
                            alt={`Exhibit ${d.file_name}`}
                            className="aspect-[3/2] w-full object-cover"
                            fallbackClassName="aspect-[3/2] w-full"
                          />
                        ) : (
                          <div className="flex aspect-[3/2] items-center justify-center bg-slate-50">
                            <FileText size={32} className="text-slate-400" aria-hidden="true" />
                          </div>
                        )}
                        <figcaption className="p-3 border-t border-slate-100 space-y-1">
                          <p className="truncate text-xs font-bold text-foreground" title={d.file_name}>{d.file_name}</p>
                          {d.exhibit_number && (
                            <span className="font-mono text-[10px] font-bold text-blue-700">{d.exhibit_number}</span>
                          )}
                          {d.is_sealed && (
                            <span className="flex items-center gap-1 text-[10px] text-rose-700 font-bold">
                              <Lock size={10} /> Sealed
                            </span>
                          )}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => setTab("Evidence")} className="btn-primary text-xs flex items-center gap-1.5">
                      <FolderOpen size={13} />
                      <span>Inspect Exhibits &amp; Version Chain</span>
                    </button>
                    <button type="button" onClick={() => setTab("Chain of Custody")} className="btn-secondary text-xs flex items-center gap-1.5">
                      <Scale size={13} />
                      <span>Sec 65B Chain of Custody</span>
                    </button>
                    <button type="button" onClick={() => setTab("Case Diary")} className="btn-secondary text-xs flex items-center gap-1.5">
                      <StickyNote size={13} />
                      <span>Open Case Diary</span>
                    </button>
                    <button type="button" onClick={() => setTab("Audit Trail")} className="btn-secondary text-xs flex items-center gap-1.5">
                      <Link2 size={13} />
                      <span>View Audit Chain</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center space-y-3">
                  <FolderOpen size={40} className="mx-auto text-slate-300" />
                  <p className="text-xs text-slate-500 font-semibold">No exhibits uploaded yet.</p>
                  <p className="text-xs text-slate-400">Add seized evidence documents to this case dossier to initiate forensic analysis.</p>
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(true)}
                    className="btn-primary text-xs inline-flex items-center gap-1.5 mx-auto"
                  >
                    <FolderPlus size={13} />
                    <span>Upload First Exhibit</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ---- WORKFLOW ---- */}
          {caseData && tab === "Workflow" && (
            <WorkflowPanel caseData={caseData} onWorkflowUpdated={() => reload()} />
          )}

          {/* ---- EVIDENCE ---- */}
          {caseData && tab === "Evidence" && (
            <EvidenceTab
              caseData={caseData}
              onRefresh={() => reload()}
              onAddExhibit={() => setUploadModalOpen(true)}
            />
          )}

          {/* ---- CHAIN OF CUSTODY ---- */}
          {caseData && tab === "Chain of Custody" && (
            <ChainOfCustodyTab caseData={caseData} onRefresh={() => reload()} />
          )}

          {/* ---- CASE DIARY ---- */}
          {caseData && tab === "Case Diary" && caseId && (
            <CaseDiaryTab caseId={caseId} />
          )}

          {/* ---- AUDIT TRAIL ---- */}
          {caseData && tab === "Audit Trail" && caseId && (
            <CaseAuditTab caseId={caseId} caseData={caseData} />
          )}

          {/* ---- REPORT ---- */}
          {caseData && tab === "Report" && caseId && <ReportTab caseId={caseId} />}
        </div>
      </div>

      {/* Upload Exhibit Modal */}
      {caseData && (
        <UploadExhibitModal
          caseId={caseData.id}
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onUploaded={() => reload()}
        />
      )}
    </div>
  );
}
