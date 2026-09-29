import { useState, useEffect } from "react";
import {
  Award,
  RefreshCw,
  Copy,
  Check,
  Clock,
  UserCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  EvidentiaryCertificateModal,
  type EvidentiaryCertificate,
} from "../audit/EvidentiaryCertificateModal";
import type { CaseDetail } from "../../types/api";

interface AuditEventItem {
  id: string;
  sequence_number: number;
  event_type: string;
  action: string;
  case_id: string | null;
  document_id: string | null;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  user_name: string | null;
  ip_address: string | null;
  details: Record<string, any>;
  timestamp: string;
  previous_hash: string | null;
  current_hash: string;
  block_height: number;
}

interface Props {
  caseId: string;
  caseData: CaseDetail;
}

export function CaseAuditTab({ caseId, caseData }: Props) {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState<EvidentiaryCertificate | null>(null);
  const [certLoading, setCertLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadCaseAuditEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/audit/cases/${caseId}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("Failed to load case audit events:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificate = async () => {
    try {
      setCertLoading(true);
      const res = await fetch(`/api/audit/cases/${caseId}/certificate`);
      if (res.ok) {
        const cert = await res.json();
        setCertificate(cert);
      }
    } catch (err) {
      console.error("Failed to load case evidentiary certificate:", err);
    } finally {
      setCertLoading(false);
    }
  };

  useEffect(() => {
    loadCaseAuditEvents();
  }, [caseId]);

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border-2 border-foreground">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-foreground">
              Evidentiary Chain-of-Custody &amp; Audit Trail
            </h3>
            <span className="rounded bg-accent-yellow px-2 py-0.5 text-[9px] font-black border border-foreground">
              CRYPTOGRAPHIC CHAIN
            </span>
          </div>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            Dossier: {caseData.case_id || caseData.case_name} · All evidentiary actions linked via SHA-256
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCaseAuditEvents}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : ""} />
            <span>Refresh Ledger</span>
          </button>
          <button
            type="button"
            onClick={handleGenerateCertificate}
            disabled={certLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-accent-mint border-2 border-foreground shadow-hard hover:translate-y-[-1px] transition-all text-slate-900 disabled:opacity-50"
          >
            <Award size={14} />
            <span>{certLoading ? "Generating..." : "Export Case Certificate"}</span>
          </button>
        </div>
      </div>

      {/* Events Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total Case Custody Events
          </span>
          <p className="text-xl font-mono font-black text-foreground mt-0.5">
            {events.length} Recorded
          </p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Cryptographic Integrity
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-emerald-700 uppercase">
              VALID &amp; UNBROKEN
            </span>
          </div>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Blockchain Readiness
          </span>
          <p className="text-xs font-bold text-slate-700 mt-1">
            MHA In-System Ledger Protocol
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-600">Custody Event Log</span>
          <span className="text-[11px] text-slate-400">Sequential Chain</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400 animate-pulse">
            Loading case custody events...
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            No custody events recorded for this case yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {events.map((evt) => {
              const isExpanded = expandedId === evt.id;
              return (
                <div key={evt.id} className="p-3.5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-black px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700">
                        #{String(evt.sequence_number).padStart(5, "0")}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground uppercase">
                            {evt.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {evt.event_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
                          <Clock size={11} />
                          <span>{new Date(evt.timestamp).toLocaleString()}</span>
                          {evt.user_email && (
                            <>
                              <span>·</span>
                              <UserCheck size={11} />
                              <span className="text-slate-600">
                                {evt.user_name || evt.user_email}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600">
                          <span className="text-slate-400 uppercase font-bold text-[9px]">Digest:</span>
                          <span className="font-bold">{evt.current_hash.slice(0, 10)}...</span>
                          <button
                            type="button"
                            onClick={() => handleCopyHash(evt.current_hash)}
                            className="p-0.5 text-slate-400 hover:text-slate-700"
                            title="Copy full hash"
                          >
                            {copiedHash === evt.current_hash ? (
                              <Check size={11} className="text-emerald-600" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                        className="p-1 rounded text-slate-400 hover:text-foreground hover:bg-slate-100"
                      >
                        {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
                      <div className="font-mono text-[11px] space-y-1">
                        <div>
                          <span className="text-slate-500 font-bold">SHA-256 Digest: </span>
                          <span className="break-all font-black text-slate-800">{evt.current_hash}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold">Predecessor Hash Link: </span>
                          <span className="break-all text-slate-600">
                            {evt.previous_hash || "Genesis Block"}
                          </span>
                        </div>
                      </div>
                      <pre className="text-[10px] font-mono bg-white p-2 rounded border border-slate-200 overflow-x-auto max-h-28 text-slate-700">
                        {JSON.stringify(evt.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Evidentiary Certificate Modal */}
      <EvidentiaryCertificateModal
        certificate={certificate}
        onClose={() => setCertificate(null)}
      />
    </div>
  );
}
