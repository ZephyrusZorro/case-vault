import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, Plus, Shield } from "lucide-react";
import { PageHeader, EmptyState } from "../components/layout/PageHeader";
import { useApi } from "../hooks/useApi";
import type { HistoryItem } from "../types/api";

type SortKey = "recent" | "risk_desc" | "risk_asc";

const CASE_TYPES = [
  { value: "all", label: "All Classifications" },
  { value: "Women Safety Investigation", label: "Women Safety" },
  { value: "Cyber Crime Investigation", label: "Cyber Crime" },
  { value: "Identity Forgery Investigation", label: "Identity Forgery" },
  { value: "Evidence Tampering Analysis", label: "Evidence Tampering" },
  { value: "Financial Fraud Investigation", label: "Financial Fraud" },
  { value: "Missing Person Inquiry", label: "Missing Person" },
  { value: "General Investigation", label: "General Investigation" },
];

const PRIORITIES = [
  { value: "all", label: "All Priorities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "under_investigation", label: "Under Investigation" },
  { value: "under_review", label: "Under Review" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PriorityBadge({ priority }: { priority?: string | null }) {
  const p = (priority ?? "medium").toLowerCase();
  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-300";
  if (p === "critical") badgeStyle = "bg-rose-100 text-rose-800 border-rose-300 font-extrabold";
  else if (p === "high") badgeStyle = "bg-amber-100 text-amber-800 border-amber-300 font-bold";
  else if (p === "medium") badgeStyle = "bg-blue-100 text-blue-800 border-blue-300 font-semibold";
  
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider border ${badgeStyle}`}>
      {p}
    </span>
  );
}

export function HistoryPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [caseType, setCaseType] = useState("all");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortKey>("recent");

  // Debounce search so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const queryParams = new URLSearchParams();
  if (debouncedSearch) queryParams.set("search", debouncedSearch);
  if (caseType !== "all") queryParams.set("case_type", caseType);
  if (priority !== "all") queryParams.set("priority", priority);
  if (status !== "all") queryParams.set("status", status);
  if (sort) queryParams.set("sort", sort);

  const query = `/api/cases?${queryParams.toString()}`;
  const { data, loading, error } = useApi<HistoryItem[]>(query);

  const items = useMemo(() => data ?? [], [data]);

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <PageHeader
        title="Investigation Cases Directory"
        subtitle="Secure registry of legal and crime investigation dossiers under NCRB / MHA guidelines"
        actions={
          <Link to="/screen/new" className="btn-primary flex items-center gap-1.5 text-xs">
            <Plus size={15} aria-hidden="true" />
            <span>Open New Case</span>
          </Link>
        }
      />

      {/* Multi-facet Filter Toolbar */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case ID, title, officer, or department..."
            aria-label="Search case registry"
            className="input-field pl-9 text-xs"
          />
        </div>

        {/* Case Type filter */}
        <select
          value={caseType}
          onChange={(e) => setCaseType(e.target.value)}
          aria-label="Filter by case classification"
          className="input-field w-auto text-xs"
        >
          {CASE_TYPES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          aria-label="Filter by priority"
          className="input-field w-auto text-xs"
        >
          {PRIORITIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="input-field w-auto text-xs"
        >
          {STATUSES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort cases"
          className="input-field w-auto text-xs"
        >
          <option value="recent">Newest First</option>
          <option value="risk_desc">Risk: High to Low</option>
          <option value="risk_asc">Risk: Low to High</option>
        </select>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200">
          {error}
        </p>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-xs text-slate-500">
            <Loader2 size={18} className="animate-spin text-blue-500" aria-hidden="true" /> Loading case dossiers…
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No matching investigation cases found"
            message={
              search || caseType !== "all" || priority !== "all" || status !== "all"
                ? "Try adjusting your search criteria or resetting filters."
                : "No cases registered in the system yet. Click below to register the first case."
            }
            action={
              !search && caseType === "all" ? (
                <Link to="/screen/new" className="btn-primary">
                  <Plus size={16} aria-hidden="true" /> Register Case
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500">
                <tr>
                  <th scope="col" className="table-head-cell font-bold">Case ID</th>
                  <th scope="col" className="table-head-cell font-bold">Subject / Title</th>
                  <th scope="col" className="table-head-cell font-bold">Classification &amp; Dept</th>
                  <th scope="col" className="table-head-cell font-bold text-center">Priority</th>
                  <th scope="col" className="table-head-cell font-bold">Assigned Officers</th>
                  <th scope="col" className="table-head-cell font-bold text-center">Docs</th>
                  <th scope="col" className="table-head-cell font-bold text-center">Status</th>
                  <th scope="col" className="table-head-cell font-bold text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const displayId = item.case_id || `CASE-2026-${String(item.case_number).padStart(5, "0")}`;
                  const displayTitle = item.title || item.case_name;
                  const officers = item.assigned_investigators || [];

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="table-cell font-mono font-bold">
                        <Link
                          to={`/cases/${item.id}`}
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Shield size={12} className="text-blue-500 shrink-0" />
                          <span>{displayId}</span>
                        </Link>
                      </td>
                      <td className="table-cell max-w-[260px]">
                        <Link to={`/cases/${item.id}`} className="font-semibold text-slate-900 hover:text-blue-600 truncate block">
                          {displayTitle}
                        </Link>
                        {item.person_name && (
                          <span className="text-[11px] text-slate-500 block truncate">
                            Subject: {item.person_name}
                          </span>
                        )}
                      </td>
                      <td className="table-cell max-w-[220px]">
                        <span className="font-medium text-slate-700 block truncate">{item.case_type || "Investigation"}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{item.department || "NCRB"}</span>
                      </td>
                      <td className="table-cell text-center">
                        <PriorityBadge priority={item.priority} />
                      </td>
                      <td className="table-cell max-w-[180px]">
                        {officers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {officers.slice(0, 2).map((off, idx) => (
                              <span
                                key={idx}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 truncate max-w-[120px]"
                                title={off}
                              >
                                {off}
                              </span>
                            ))}
                            {officers.length > 2 && (
                              <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-500">
                                +{officers.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="table-cell text-center font-bold text-slate-600">
                        {item.document_count}
                      </td>
                      <td className="table-cell text-center">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="table-cell whitespace-nowrap text-right text-slate-400">
                        {fmtDate(item.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
