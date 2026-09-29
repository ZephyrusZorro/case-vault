import { useState, useEffect } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Award,
  Filter,
  Search,
  ExternalLink,
  Copy,
  Check,
  Lock,
  ChevronDown,
  ChevronRight,
  Database,
  Clock,
  UserCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  EvidentiaryCertificateModal,
  type EvidentiaryCertificate,
} from "../components/audit/EvidentiaryCertificateModal";

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

interface VerificationReport {
  is_valid: boolean;
  tampered: boolean;
  total_events: number;
  verified_events: number;
  tampered_sequences: number[];
  errors: string[];
  verified_at: string;
}

export function AuditPage() {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [verification, setVerification] = useState<VerificationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<EvidentiaryCertificate | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      const [eventsRes, verifyRes] = await Promise.all([
        fetch("/api/audit?limit=250"),
        fetch("/api/audit/verify"),
      ]);

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data);
      }
      if (verifyRes.ok) {
        const vData = await verifyRes.json();
        setVerification(vData);
      }
    } catch (err) {
      console.error("Failed to fetch audit ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    try {
      setVerifying(true);
      const res = await fetch("/api/audit/verify");
      if (res.ok) {
        const data = await res.json();
        setVerification(data);
      }
    } catch (err) {
      console.error("Verification error:", err);
    } finally {
      setVerifying(false);
    }
  };

  const handleGenerateCertificate = async () => {
    try {
      const res = await fetch("/api/audit/certificate");
      if (res.ok) {
        const cert = await res.json();
        setCertificate(cert);
      }
    } catch (err) {
      console.error("Failed to generate evidentiary certificate:", err);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredEvents = events.filter((e) => {
    if (selectedEventType !== "all" && e.event_type !== selectedEventType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = e.action.toLowerCase().includes(q);
      const matchUser = (e.user_email || "").toLowerCase().includes(q) || (e.user_name || "").toLowerCase().includes(q);
      const matchCase = (e.case_id || "").toLowerCase().includes(q);
      const matchHash = e.current_hash.toLowerCase().includes(q);
      return matchAction || matchUser || matchCase || matchHash;
    }
    return true;
  });

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Title & Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Cryptographic Audit Ledger
            </h1>
            <span className="rounded bg-accent-yellow px-2 py-0.5 text-[10px] font-black border-2 border-foreground shadow-hard-active">
              TAMPER-EVIDENT
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">
            MHA / NCRB Women Safety Division · In-System Cryptographic Hash Chain · Evidentiary Traceability
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-white border-2 border-foreground shadow-hard hover:translate-y-[-1px] transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={verifying ? "animate-spin text-blue-600" : ""} />
            {verifying ? "Verifying SHA-256 Chain..." : "Verify Cryptographic Ledger"}
          </button>
          <button
            onClick={handleGenerateCertificate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-accent-mint border-2 border-foreground shadow-hard hover:translate-y-[-1px] transition-all text-slate-900"
          >
            <Award size={14} /> Evidentiary Certificate
          </button>
        </div>
      </div>

      {/* Chain Status Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Verification Status */}
        <div className="p-5 rounded-2xl bg-white border-2 border-foreground shadow-hard space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400">Cryptographic Integrity</span>
            {verification?.is_valid ? (
              <ShieldCheck size={20} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={20} className="text-rose-600" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${
                verification?.is_valid ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="text-lg font-black text-foreground">
              {verification?.is_valid ? "UNBROKEN HASH CHAIN" : "INTEGRITY WARNING"}
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-500">
            {verification?.is_valid
              ? `All ${verification.total_events} events verified against deterministic SHA-256 predecessor links.`
              : `${verification?.errors.length || 0} anomaly detected in ledger sequence.`}
          </p>
        </div>

        {/* Total Ledger Events */}
        <div className="p-5 rounded-2xl bg-white border-2 border-foreground shadow-hard space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400">Total Sequential Events</span>
            <Database size={20} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            #{verification?.total_events ? String(verification.total_events).padStart(5, "0") : "00000"}
          </div>
          <p className="text-[11px] font-bold text-slate-500">
            Immutable chain-of-custody tracking authentication, exhibits & case updates.
          </p>
        </div>

        {/* Architecture Notice (Mandate 4 compliant) */}
        <div className="p-5 rounded-2xl bg-cream border-2 border-foreground shadow-hard space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400">Blockchain Architecture</span>
            <Lock size={18} className="text-amber-700" />
          </div>
          <div className="text-xs font-black text-amber-900 uppercase">
            In-System Ledger (Blockchain-Ready)
          </div>
          <p className="text-[11px] font-medium text-slate-600 leading-tight">
            Cryptographic hash linking enforces internal tamper evidence. Architecture is designed for seamless future integration into permissioned MHA distributed ledgers.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 bg-white rounded-2xl border-2 border-foreground shadow-hard">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={15} className="text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-500">Type:</span>
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="text-xs font-bold rounded-lg border-2 border-foreground/30 px-2.5 py-1.5 bg-slate-50 focus:outline-none"
          >
            <option value="all">All Event Types</option>
            <option value="AUTHENTICATION">Authentication (AUTH)</option>
            <option value="CASE">Case Container (CASE)</option>
            <option value="DOCUMENT">Document Upload (DOCUMENT)</option>
            <option value="DOCUMENT_VERSION">Document Versions (VERSION)</option>
            <option value="DOCUMENT_METADATA">Exhibit Metadata (METADATA)</option>
            <option value="CASE_REVIEW">Case Review (REVIEW)</option>
          </select>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, officer, case or hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-bold pl-9 pr-3 py-1.5 rounded-xl border-2 border-foreground/30 bg-slate-50 focus:outline-none focus:border-foreground"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl bg-white border-2 border-foreground shadow-hard overflow-hidden">
        <div className="px-5 py-3 border-b-2 border-foreground/10 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
            Sequential Audit Events ({filteredEvents.length})
          </span>
          <span className="text-[11px] font-bold text-slate-400">
            Ordered Chronologically (Latest First)
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400 animate-pulse">
            Loading cryptographic audit ledger...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400">
            No audit events found matching filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEvents.map((evt) => {
              const isExpanded = expandedEventId === evt.id;
              return (
                <div key={evt.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Sequence + Action + Time */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-black px-2 py-1 bg-slate-100 border border-slate-300 rounded text-slate-700">
                        #{String(evt.sequence_number).padStart(5, "0")}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-foreground uppercase tracking-wide">
                            {evt.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            {evt.event_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-0.5">
                          <Clock size={11} />
                          <span>{new Date(evt.timestamp).toLocaleString()}</span>
                          {evt.user_email && (
                            <>
                              <span>·</span>
                              <UserCheck size={11} />
                              <span className="text-slate-600">
                                {evt.user_name || evt.user_email} ({evt.user_role || "officer"})
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Cryptographic Hashes & Expand */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Hash:</span>
                          <span className="font-bold">{evt.current_hash.slice(0, 12)}...</span>
                          <button
                            type="button"
                            onClick={() => handleCopyHash(evt.current_hash)}
                            className="p-1 text-slate-400 hover:text-slate-700"
                            title="Copy full SHA-256 hash"
                          >
                            {copiedHash === evt.current_hash ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                        {evt.previous_hash ? (
                          <div className="text-[10px] font-mono text-slate-400">
                            Prev: {evt.previous_hash.slice(0, 10)}...
                          </div>
                        ) : (
                          <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1 rounded">
                            GENESIS BLOCK
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-200 transition-colors"
                        title={isExpanded ? "Collapse event payload" : "Expand event details"}
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Event Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/90 p-3 rounded-xl border border-slate-200">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-400 text-[10px] uppercase">
                          Cryptographic Hash Integrity
                        </div>
                        <div className="space-y-1 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-500 font-bold">Current SHA-256: </span>
                            <span className="break-all font-black text-slate-800">{evt.current_hash}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold">Previous Hash Link: </span>
                            <span className="break-all text-slate-600">
                              {evt.previous_hash || "None (Genesis Block)"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold">Block Height: </span>
                            <span>{evt.block_height}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="font-bold text-slate-400 text-[10px] uppercase">
                          Event Context & Payload
                        </div>
                        <pre className="text-[10px] font-mono bg-white p-2 rounded border border-slate-200 overflow-x-auto max-h-32 text-slate-700">
                          {JSON.stringify(evt.details, null, 2)}
                        </pre>
                        {evt.case_id && (
                          <div className="pt-1">
                            <Link
                              to={`/cases/${evt.case_id}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                            >
                              <ExternalLink size={12} /> Open Case Dossier
                            </Link>
                          </div>
                        )}
                      </div>
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
