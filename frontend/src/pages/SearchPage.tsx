import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  X,
  FileText,
  Folder,
  ShieldCheck,
  ShieldAlert,
  Lock,
  ArrowRight,
  Loader2,
  Clock,
  Sparkles,
} from "lucide-react";
import { PageHeader, EmptyState } from "../components/layout/PageHeader";
import { useApi } from "../hooks/useApi";
import type { SearchResultsResponse, SearchResultItem } from "../types/api";

const ENTITY_TABS = [
  { value: "all", label: "All Results" },
  { value: "cases", label: "Cases" },
  { value: "documents", label: "Exhibits & Evidence" },
  { value: "audit", label: "Audit Ledger" },
] as const;

const CLASSIFICATION_OPTIONS = [
  { value: "all", label: "All Clearance Tiers" },
  { value: "unrestricted", label: "Unrestricted" },
  { value: "restricted", label: "Restricted" },
  { value: "confidential", label: "Confidential" },
  { value: "secret", label: "Secret" },
  { value: "top_secret", label: "Top Secret" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "under_investigation", label: "Under Investigation" },
  { value: "under_review", label: "Under Review" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

function ClassificationChip({ level }: { level: string }) {
  const l = (level || "restricted").toLowerCase();
  let style = "bg-slate-100 text-slate-700 border-slate-300";
  if (l === "top_secret") style = "bg-rose-100 text-rose-800 border-rose-400 font-extrabold";
  else if (l === "secret") style = "bg-amber-100 text-amber-800 border-amber-400 font-bold";
  else if (l === "confidential") style = "bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold";

  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] uppercase tracking-wider border font-mono ${style}`}>
      {l.replace("_", " ")}
    </span>
  );
}

function ResultCard({ item }: { item: SearchResultItem }) {
  const isCase = item.entity_type === "case";
  const isDoc = item.entity_type === "document";
  const isAudit = item.entity_type === "audit_event";

  return (
    <article className="card p-5 space-y-3 border-2 border-foreground hover:shadow-hard-active transition-all bg-white">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Entity Icon Badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider border ${
              isCase
                ? "bg-blue-100 text-blue-800 border-blue-300"
                : isDoc
                ? "bg-purple-100 text-purple-800 border-purple-300"
                : "bg-emerald-100 text-emerald-800 border-emerald-300"
            }`}
          >
            {isCase && <Folder size={12} />}
            {isDoc && <FileText size={12} />}
            {isAudit && <ShieldCheck size={12} />}
            <span>{isCase ? "Case Container" : isDoc ? "Legal Exhibit" : "Audit Event"}</span>
          </span>

          {/* Subtitle identifier */}
          {item.subtitle && (
            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {item.subtitle}
            </span>
          )}

          {/* Security Classification */}
          <ClassificationChip level={item.classification_level} />

          {/* Sealed Indicator */}
          {item.is_sealed && (
            <span className="inline-flex items-center gap-1 rounded bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.5 text-[10px] font-bold">
              <Lock size={10} /> Sealed
            </span>
          )}

          {/* Legal Hold Indicator */}
          {item.legal_hold && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
              <ShieldAlert size={10} /> Legal Hold
            </span>
          )}
        </div>

        {/* Timestamp */}
        {item.timestamp && (
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
            <Clock size={11} />
            {new Date(item.timestamp).toLocaleString()}
          </span>
        )}
      </div>

      {/* Main Title & Action Links */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground hover:text-blue-600 transition-colors">
            {isCase ? (
              <Link to={`/cases/${item.id}`}>{item.title}</Link>
            ) : item.case_id ? (
              <Link to={`/cases/${item.case_id}`}>{item.title}</Link>
            ) : (
              item.title
            )}
          </h3>

          {item.case_title && !isCase && (
            <p className="text-xs text-slate-500">
              Parent Case: <span className="font-semibold text-slate-700">{item.case_title}</span>
            </p>
          )}
        </div>

        {/* Direct Action Link */}
        {item.case_id && (
          <Link
            to={
              isAudit
                ? `/cases/${item.case_id}`
                : isDoc
                ? `/cases/${item.case_id}`
                : `/cases/${item.id}`
            }
            className="btn-secondary text-xs px-3 py-1 flex items-center gap-1.5 hover:bg-slate-100 shrink-0"
          >
            <span>{isCase ? "Open Dossier" : isDoc ? "Inspect Exhibit" : "View Case Trail"}</span>
            <ArrowRight size={12} />
          </Link>
        )}
      </div>

      {/* Matched Snippet Context Box */}
      {item.match_snippet && (
        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 text-xs space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <Sparkles size={11} className="text-blue-500" />
            <span>Matched in {item.match_field}</span>
          </div>
          <p className="text-slate-800 font-medium font-mono text-[11px] leading-relaxed break-all">
            {item.match_snippet}
          </p>
        </div>
      )}

      {/* Metadata Pill Footer */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
        {item.metadata.department && (
          <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">
            Dept: {item.metadata.department}
          </span>
        )}
        {item.metadata.legal_category && (
          <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">
            Category: {item.metadata.legal_category}
          </span>
        )}
        {item.metadata.applicant_name && (
          <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">
            Applicant: {item.metadata.applicant_name}
          </span>
        )}
        {item.metadata.file_hash_prefix && (
          <span className="font-mono text-[10px] text-slate-500">
            SHA: {item.metadata.file_hash_prefix}…
          </span>
        )}
        {item.metadata.actor && (
          <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">
            Officer: {item.metadata.actor}
          </span>
        )}
      </div>
    </article>
  );
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const initialEntity = searchParams.get("entity_type") || "all";

  const [inputVal, setInputVal] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [entityType, setEntityType] = useState(initialEntity);
  const [classification, setClassification] = useState("all");
  const [status, setStatus] = useState("all");
  const [legalHoldOnly, setLegalHoldOnly] = useState(false);
  const [sealedOnly, setSealedOnly] = useState(false);

  // Debounce input search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(inputVal.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [inputVal]);

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (entityType !== "all") params.set("entity_type", entityType);
    setSearchParams(params, { replace: true });
  }, [debouncedQ, entityType, setSearchParams]);

  // Build query string
  const queryParams = new URLSearchParams();
  if (debouncedQ) queryParams.set("q", debouncedQ);
  if (entityType !== "all") queryParams.set("entity_type", entityType);
  if (classification !== "all") queryParams.set("classification", classification);
  if (status !== "all") queryParams.set("status", status);
  if (legalHoldOnly) queryParams.set("legal_hold", "true");
  if (sealedOnly) queryParams.set("is_sealed", "true");

  const queryUrl = `/api/search?${queryParams.toString()}`;
  const { data, loading, error } = useApi<SearchResultsResponse>(queryUrl);

  const results = data?.results || [];

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6">
      <PageHeader
        title="Unified Investigation Search &amp; Discovery"
        subtitle="Clearance-aware multi-facet search across cases, evidentiary exhibits, OCR text, and cryptographic audit chains."
      />

      {/* Main Search Input Box */}
      <div className="card p-4 space-y-4 border-2 border-foreground shadow-hard bg-white">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Search by Case ID, exhibit ref, OCR text, person name, or SHA-256 hash..."
            className="w-full rounded-xl border-2 border-foreground bg-slate-50 pl-11 pr-10 py-3 text-sm font-semibold text-foreground focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
          />
          {inputVal && (
            <button
              type="button"
              onClick={() => setInputVal("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              title="Clear search query"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Entity Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            {ENTITY_TABS.map((tab) => {
              let count = data?.total_hits ?? 0;
              if (tab.value === "cases") count = data?.cases_count ?? 0;
              else if (tab.value === "documents") count = data?.documents_count ?? 0;
              else if (tab.value === "audit") count = data?.audit_count ?? 0;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setEntityType(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 flex items-center gap-1.5 ${
                    entityType === tab.value
                      ? "bg-accent-yellow border-foreground text-foreground shadow-hard-active translate-y-0.5"
                      : "bg-white border-transparent text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 border border-slate-300 text-slate-700">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Filters Toggle Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Classification */}
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="input-field text-xs py-1 px-2.5 w-auto"
            >
              {CLASSIFICATION_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-field text-xs py-1 px-2.5 w-auto"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Legal Hold checkbox */}
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-300">
              <input
                type="checkbox"
                checked={legalHoldOnly}
                onChange={(e) => setLegalHoldOnly(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <ShieldAlert size={12} className={legalHoldOnly ? "text-rose-600" : "text-slate-400"} />
              <span>Legal Hold</span>
            </label>

            {/* Sealed checkbox */}
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-300">
              <input
                type="checkbox"
                checked={sealedOnly}
                onChange={(e) => setSealedOnly(e.target.checked)}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <Lock size={12} className={sealedOnly ? "text-rose-600" : "text-slate-400"} />
              <span>Sealed Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results Header / Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div>
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={13} className="animate-spin text-blue-600" /> Searching investigation records…
            </span>
          ) : (
            <span>
              Found <strong className="text-foreground">{data?.total_hits ?? 0}</strong> matching records
              {data?.took_ms !== undefined && ` in ${data.took_ms}ms`}
            </span>
          )}
        </div>

        {debouncedQ && (
          <span className="text-slate-400 text-[11px]">
            Query: <strong className="text-slate-700 font-mono">"{debouncedQ}"</strong>
          </span>
        )}
      </div>

      {/* Results List */}
      {error && (
        <div className="card p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          Error retrieving search results: {error}
        </div>
      )}

      {!loading && results.length === 0 && (
        <EmptyState
          title="No Matching Investigation Records"
          message={
            debouncedQ
              ? `No records found matching query "${debouncedQ}". Try searching by Case ID (CASE-2026-...), Exhibit Ref (EX-FIR-01), or person name.`
              : "No records found matching the active filter criteria. Adjust your clearance or category filters above."
          }
        />
      )}

      <div className="space-y-3">
        {results.map((item) => (
          <ResultCard key={`${item.entity_type}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  );
}
