import { Link } from "react-router-dom";
import {
  Files,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Gauge,
  Plus,
  ArrowRight,
  Sparkles,
  Shield,
  FileCheck,
  Scale,
  FolderOpen,
  Hash,
  Clock,
  UserCheck,
  Lock,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MetricCard, SkeletonRows } from "../components/dashboard/MetricCard";
import { StatusBadge, statusToBadge } from "../components/dashboard/StatusBadge";
import { EmptyState } from "../components/layout/PageHeader";
import { useTranslation } from "react-i18next";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import type { DashboardSummary, RecentScreeningsResponse } from "../types/api";

const DONUT_COLORS: Record<string, string> = {
  Valid: "#2CF4A8", // accent-mint
  Review: "#FFD54F", // accent-yellow
  "High Risk": "#FF6B8B", // accent-pink
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const summary = useApi<DashboardSummary>("/api/dashboard/summary");
  const recent = useApi<RecentScreeningsResponse>("/api/dashboard/recent");

  const s = summary.data;
  const donutData =
    s === null
      ? []
      : [
          { name: "Valid", value: s.valid },
          { name: "Review", value: s.under_review },
          { name: "High Risk", value: s.high_risk },
        ].filter((d) => d.value > 0);

  const wf = s?.workflow_counts || {};
  const currentRole = user?.role || "investigator";

  // Role action prompt
  const supervisorPending = wf["pending_review"] || 0;
  const legalPending = wf["pending_legal_review"] || 0;

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="card relative overflow-hidden p-5 sm:p-6 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 border-2 border-foreground shadow-hard text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-mint px-2.5 py-0.5 text-xs font-extrabold text-slate-900 border-2 border-foreground shadow-hard-active">
                <Sparkles size={13} aria-hidden="true" strokeWidth={2.5} />
                NCRB Forensic Command Center
              </span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-mono font-bold text-slate-300">
                Bharatiya Sakshya Adhiniyam Sec 65B
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-black text-white">
              {t("dashboard.title")}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-300 max-w-xl">
              National statutory identity screening, forensic document verification, and tamper-evident evidentiary chain management.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <Link
              to="/audit"
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-white/80 bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur hover:bg-white/20 transition-all shadow-hard active:translate-y-0.5"
            >
              <Hash size={14} className="text-emerald-400" />
              <span>Audit Ledger</span>
            </Link>
            <Link
              to="/screen/new"
              className="btn-primary flex items-center gap-1.5"
            >
              <Plus size={16} aria-hidden="true" />
              <span>{t("dashboard.screen_new")}</span>
            </Link>
          </div>
        </div>

        {/* Role-Specific Triage Banner */}
        {currentRole === "supervisor" && supervisorPending > 0 && (
          <div className="mt-4 rounded-xl border border-amber-400/60 bg-amber-500/20 p-3 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-200">
              <UserCheck size={16} className="text-amber-300 shrink-0" />
              <span>
                <strong>Action Required:</strong> You have <strong>{supervisorPending}</strong> case(s) waiting for your Supervisor Review &amp; Approval.
              </span>
            </div>
            <Link
              to="/history"
              className="rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-black text-slate-950 hover:bg-amber-300 transition-colors shrink-0"
            >
              Review Dossiers →
            </Link>
          </div>
        )}

        {(currentRole === "legal_officer" || currentRole === "admin") && legalPending > 0 && (
          <div className="mt-4 rounded-xl border border-indigo-400/60 bg-indigo-500/20 p-3 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-indigo-200">
              <Scale size={16} className="text-indigo-300 shrink-0" />
              <span>
                <strong>Legal Compliance:</strong> You have <strong>{legalPending}</strong> case(s) awaiting your Legal Officer Sign-off for Court Docket.
              </span>
            </div>
            <Link
              to="/history"
              className="rounded-lg bg-indigo-400 px-2.5 py-1 text-[11px] font-black text-slate-950 hover:bg-indigo-300 transition-colors shrink-0"
            >
              Inspect Legal Queue →
            </Link>
          </div>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label={t("dashboard.total_screened")}
          value={s?.total_screened ?? "—"}
          icon={Files}
          tone="navy"
          loading={summary.loading}
        />
        <MetricCard
          label={t("dashboard.valid_passed")}
          value={s?.valid ?? "—"}
          icon={CheckCircle2}
          tone="green"
          loading={summary.loading}
        />
        <MetricCard
          label={t("dashboard.under_review")}
          value={s?.under_review ?? "—"}
          icon={AlertTriangle}
          tone="amber"
          loading={summary.loading}
        />
        <MetricCard
          label={t("dashboard.high_risk")}
          value={s?.high_risk ?? "—"}
          icon={ShieldAlert}
          tone="red"
          loading={summary.loading}
        />
        <MetricCard
          label={t("dashboard.avg_risk")}
          value={s ? (s.average_risk_score ?? "—") : "—"}
          icon={Gauge}
          tone="blue"
          loading={summary.loading}
        />
      </div>

      {/* Workflow Approval Funnel Strip */}
      <div className="rounded-2xl border-2 border-foreground bg-white p-5 shadow-hard space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-yellow border border-foreground font-mono text-[10px] font-black">
              WF
            </span>
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
              Investigation Lifecycle Pipeline (Statutory Progression)
            </h3>
          </div>
          <Link
            to="/history"
            className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1"
          >
            <span>Filter Case Directory</span>
            <ArrowRight size={11} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Link
            to="/history"
            className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3 hover:border-foreground hover:bg-white hover:shadow-hard transition-all group"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase">
              <span>Open</span>
              <Clock size={12} className="text-slate-400 group-hover:text-foreground" />
            </div>
            <p className="mt-1 text-2xl font-black text-foreground">
              {wf["open"] || 0}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">Initial intake</span>
          </Link>

          <Link
            to="/history"
            className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3 hover:border-foreground hover:bg-white hover:shadow-hard transition-all group"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase">
              <span>Investigation</span>
              <Shield size={12} className="text-blue-500 group-hover:text-blue-600" />
            </div>
            <p className="mt-1 text-2xl font-black text-blue-900">
              {wf["under_investigation"] || 0}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">Forensic analysis</span>
          </Link>

          <Link
            to="/history"
            className="rounded-xl border-2 border-amber-200 bg-amber-50/60 p-3 hover:border-foreground hover:bg-amber-50 hover:shadow-hard transition-all group"
          >
            <div className="flex items-center justify-between text-[11px] text-amber-800 font-bold uppercase">
              <span>Supervisor</span>
              <UserCheck size={12} className="text-amber-600" />
            </div>
            <p className="mt-1 text-2xl font-black text-amber-950">
              {wf["pending_review"] || 0}
            </p>
            <span className="text-[10px] text-amber-700 font-medium">Review pending</span>
          </Link>

          <Link
            to="/history"
            className="rounded-xl border-2 border-indigo-200 bg-indigo-50/60 p-3 hover:border-foreground hover:bg-indigo-50 hover:shadow-hard transition-all group"
          >
            <div className="flex items-center justify-between text-[11px] text-indigo-800 font-bold uppercase">
              <span>Legal Review</span>
              <Scale size={12} className="text-indigo-600" />
            </div>
            <p className="mt-1 text-2xl font-black text-indigo-950">
              {wf["pending_legal_review"] || 0}
            </p>
            <span className="text-[10px] text-indigo-700 font-medium">Compliance check</span>
          </Link>

          <Link
            to="/history"
            className="rounded-xl border-2 border-emerald-300 bg-emerald-50/70 p-3 hover:border-foreground hover:bg-emerald-50 hover:shadow-hard transition-all group"
          >
            <div className="flex items-center justify-between text-[11px] text-emerald-800 font-bold uppercase">
              <span>Court Ready</span>
              <FileCheck size={12} className="text-emerald-600" />
            </div>
            <p className="mt-1 text-2xl font-black text-emerald-950">
              {wf["court_ready"] || 0}
            </p>
            <span className="text-[10px] text-emerald-700 font-medium">Sec 65B certified</span>
          </Link>

          <Link
            to="/history"
            className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3 hover:border-foreground hover:bg-white hover:shadow-hard transition-all group"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase">
              <span>Closed</span>
              <Lock size={12} className="text-slate-400" />
            </div>
            <p className="mt-1 text-2xl font-black text-slate-700">
              {(wf["closed"] || 0) + (wf["archived"] || 0)}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">Archived dossiers</span>
          </Link>
        </div>

        {/* Evidentiary Integrity Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5 border border-slate-200">
            <FolderOpen size={16} className="text-blue-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Seized Exhibits</p>
              <p className="text-sm font-black text-foreground">{s?.total_exhibits || 0} In Custody</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5 border border-slate-200">
            <Hash size={16} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Cryptographic Ledger</p>
              <p className="text-sm font-black text-foreground">{s?.audit_events_count || 0} Blocks Chained</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5 border border-slate-200">
            <ShieldAlert size={16} className="text-rose-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Active Legal Holds</p>
              <p className="text-sm font-black text-rose-700">{s?.legal_hold_count || 0} Sealed Dossiers</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5 border border-slate-200">
            <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Statutory Standard</p>
              <p className="text-sm font-black text-foreground">NCRB / BSA 65B</p>
            </div>
          </div>
        </div>
      </div>

      {(summary.error || recent.error) && (
        <p role="alert" className="rounded-xl bg-accent-pink p-4 text-xs font-bold text-white border-2 border-foreground shadow-hard">
          Could not load telemetry: {summary.error ?? recent.error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent screenings */}
        <section className="card xl:col-span-2 overflow-hidden bg-white border-2 border-foreground shadow-hard rounded-2xl" aria-labelledby="recent-heading">
          <div className="flex items-center justify-between border-b-2 border-foreground/10 px-5 py-4">
            <h3 id="recent-heading" className="text-sm font-extrabold text-foreground flex items-center gap-2">
              {t("dashboard.recent_cases")}
            </h3>
            <Link
              to="/history"
              className="text-xs font-bold text-foreground hover:bg-accent-yellow border-2 border-transparent hover:border-foreground hover:shadow-hard-active px-2 py-1 rounded-lg transition-all flex items-center gap-1"
            >
              <span>{t("dashboard.view_history")}</span>
              <ArrowRight size={12} aria-hidden="true" strokeWidth={2.5} />
            </Link>
          </div>

          {recent.loading ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="border-b-2 border-foreground/10 bg-slate-50">
                  <tr>
                    <th scope="col" className="table-head-cell">{t("dashboard.case_id")}</th>
                    <th scope="col" className="table-head-cell">{t("dashboard.document_type")}</th>
                    <th scope="col" className="table-head-cell">{t("dashboard.name")}</th>
                    <th scope="col" className="table-head-cell">{t("dashboard.risk")}</th>
                    <th scope="col" className="table-head-cell">{t("dashboard.status")}</th>
                    <th scope="col" className="table-head-cell">{t("dashboard.time")}</th>
                  </tr>
                </thead>
                <SkeletonRows rows={4} cols={6} />
              </table>
            </div>
          ) : recent.data && recent.data.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="border-b-2 border-foreground/10 bg-slate-50">
                  <tr>
                    <th scope="col" className="table-head-cell">{t("dashboard.case_id")}</th>
                    <th scope="col" className="table-head-cell">{t("dashboard.document_type")}</th>
                    <th scope="col" className="table-head-cell">{t("dashboard.name")}</th>
                    <th scope="col" className="table-head-cell">{t("dashboard.risk")}</th>
                    <th scope="col" className="table-head-cell">{t("dashboard.status")}</th>
                    <th scope="col" className="table-head-cell">{t("dashboard.time")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-foreground/10">
                  {recent.data.items.map((item) => (
                    <tr key={item.case_id} className="transition-colors hover:bg-accent-yellow">
                      <td className="table-cell font-mono font-extrabold text-foreground">
                        <Link
                          to={`/cases/${item.case_id}`}
                          className="hover:underline"
                        >
                          #{item.case_number}
                        </Link>
                      </td>
                      <td className="table-cell text-foreground/80 font-medium">
                        {item.document_type ?? "—"}
                      </td>
                      <td className="table-cell font-semibold text-foreground">
                        {item.person_name ?? item.case_name}
                      </td>
                      <td className="table-cell">
                        {item.risk_score !== null ? (
                          <span
                            className={`font-mono font-extrabold ${
                              item.risk_score >= 60
                                ? "text-accent-pink"
                                : item.risk_score >= 30
                                  ? "text-accent-yellow"
                                  : "text-accent-mint"
                            }`}
                          >
                            {item.risk_score}/100
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={statusToBadge(item.status)} />
                      </td>
                      <td className="table-cell whitespace-nowrap text-foreground/60 text-xs">
                        {timeAgo(item.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={t("dashboard.no_screenings")}
              message={t("dashboard.create_first")}
              action={
                <Link to="/screen/new" className="btn-primary">
                  <Plus size={16} aria-hidden="true" /> New Case
                </Link>
              }
            />
          )}
        </section>

        {/* Risk distribution */}
        <section className="card flex flex-col bg-white border-2 border-foreground shadow-hard rounded-2xl" aria-labelledby="distribution-heading">
          <div className="border-b-2 border-foreground/10 px-5 py-4">
            <h3 id="distribution-heading" className="text-sm font-extrabold text-foreground">
              {t("dashboard.risk_distribution")}
            </h3>
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            {donutData.length > 0 ? (
              <div className="flex w-full items-center justify-around">
                <div className="h-56 w-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        strokeWidth={0}
                      >
                        {donutData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={DONUT_COLORS[entry.name]}
                            aria-hidden="true"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          borderRadius: "8px",
                          border: "1px solid #334155",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-3">
                  {donutData.map((d) => (
                    <li key={d.name} className="flex items-center gap-2.5 text-xs">
                      <span
                        className="h-3 w-3 rounded-full shadow-sm"
                        style={{ backgroundColor: DONUT_COLORS[d.name] }}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-foreground/80">{d.name}</span>
                      <span className="font-bold text-foreground  ml-auto">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState
                title={s && s.total_screened > 0 ? "All cases pending" : "No data yet"}
                message="Risk distribution appears once screening results exist."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
