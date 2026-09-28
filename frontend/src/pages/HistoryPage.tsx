import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, ArrowUpDown, Plus } from "lucide-react";
import { PageHeader, EmptyState } from "../components/layout/PageHeader";
import { StatusBadge, statusToBadge } from "../components/dashboard/StatusBadge";
import { useTranslation } from "react-i18next";
import { useApi } from "../hooks/useApi";
import type { HistoryItem } from "../types/api";

type SortKey = "recent" | "risk_desc" | "risk_asc";

const OUTCOME_FILTERS = [
  { value: "all", label: "history.filter_all" },
  { value: "valid", label: "history.filter_valid" },
  { value: "review", label: "review" },
  { value: "high_risk", label: "history.filter_high" },
  { value: "unable", label: "unable" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function recommendationToStatus(rec: string | null, risk: number | null) {
  if (rec === null || risk === null || rec === "unable_to_verify")
    return rec === "unable_to_verify" ? "pending" : "processing";
  if (rec === "verification_passed") return "valid";
  if (risk >= 60) return "high_risk";
  return "under_review";
}

export function HistoryPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [outcome, setOutcome] = useState("all");
  const [sort, setSort] = useState<SortKey>("recent");

  // Debounce search so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = `/api/cases?search=${encodeURIComponent(debouncedSearch)}&outcome=${outcome}&sort=${sort}`;
  const { data, loading, error } = useApi<HistoryItem[]>(query);

  const items = useMemo(() => data ?? [], [data]);

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6">
      <PageHeader
        title={t("history.title")}
        subtitle={t("history.subtitle")}
        actions={
          <Link to="/screen/new" className="btn-primary  flex items-center gap-1.5 text-xs">
            <Plus size={15} aria-hidden="true" />
            <span>{t("history.new_case")}</span>
          </Link>
        }
      />

      {/* Controls */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 " aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("history.search")}
            aria-label="Search screening history"
            className="input-field pl-9 text-xs"
          />
        </div>
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          aria-label="Filter by outcome"
          className="input-field w-auto text-xs"
        >
          {OUTCOME_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {t(f.label) !== f.label ? t(f.label) : f.label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort cases"
          className="input-field w-auto text-xs"
        >
          <option value="recent">{t("history.filter_newest")}</option>
          <option value="risk_desc">Risk: high to low</option>
          <option value="risk_asc">Risk: low to high</option>
        </select>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50  p-4 text-xs font-semibold text-rose-700  border border-rose-200 ">
          {error}
        </p>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-xs text-slate-500 ">
            <Loader2 size={18} className="animate-spin text-blue-500" aria-hidden="true" /> Loading history…
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={t("history.no_matching")}
            message={
              search || outcome !== "all"
                ? "Try adjusting the search or filters."
                : t("history.screen_set")
            }
            action={
              !search && outcome === "all" ? (
                <Link to="/screen/new" className="btn-primary">
                  <Plus size={16} aria-hidden="true" /> {t("history.new_case")}
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="border-b border-slate-100  bg-slate-50/70  text-slate-500 ">
                <tr>
                  <th scope="col" className="table-head-cell">
                    <span className="inline-flex items-center gap-1 font-bold">
                      Case <ArrowUpDown size={11} aria-hidden="true" />
                    </span>
                  </th>
                  <th scope="col" className="table-head-cell font-bold">Subject</th>
                  <th scope="col" className="table-head-cell font-bold">Case Name</th>
                  <th scope="col" className="table-head-cell font-bold">Docs</th>
                  <th scope="col" className="table-head-cell">
                    <span className="inline-flex items-center gap-1 font-bold">
                      Risk <ArrowUpDown size={11} aria-hidden="true" />
                    </span>
                  </th>
                  <th scope="col" className="table-head-cell font-bold">Status</th>
                  <th scope="col" className="table-head-cell font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 ">
                {items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/80 ">
                    <td className="table-cell font-mono font-bold">
                      <Link
                        to={`/cases/${item.id}`}
                        className="text-blue-600  hover:underline"
                      >
                        #{item.case_number}
                      </Link>
                    </td>
                    <td className="table-cell font-semibold text-slate-900 ">{item.person_name ?? "—"}</td>
                    <td className="table-cell max-w-[220px] truncate text-slate-600 ">{item.case_name}</td>
                    <td className="table-cell text-slate-500 ">{item.document_count}</td>
                    <td className="table-cell">
                      {item.overall_risk !== null ? (
                        <span
                          className={`font-mono font-extrabold ${
                            item.overall_risk >= 60
                              ? "text-rose-600 "
                              : item.overall_risk >= 30
                                ? "text-amber-600 "
                                : "text-emerald-600 "
                          }`}
                        >
                          {item.overall_risk}/100
                        </span>
                      ) : (
                        <span className="text-slate-400 ">—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <StatusBadge
                        status={statusToBadge(
                          recommendationToStatus(item.recommendation, item.overall_risk)
                        )}
                      />
                    </td>
                    <td className="table-cell whitespace-nowrap text-slate-400 ">
                      {fmtDate(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
