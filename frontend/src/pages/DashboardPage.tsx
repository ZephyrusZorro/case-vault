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
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MetricCard, SkeletonRows } from "../components/dashboard/MetricCard";
import { StatusBadge, statusToBadge } from "../components/dashboard/StatusBadge";
import { EmptyState } from "../components/layout/PageHeader";
import { useTranslation } from "react-i18next";
import { useApi } from "../hooks/useApi";
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

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="card relative overflow-hidden p-5 sm:p-6 bg-accent-violet border-2 border-foreground shadow-hard text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-mint px-2.5 py-0.5 text-xs font-extrabold text-slate-900 border-2 border-foreground shadow-hard-active">
                <Sparkles size={13} aria-hidden="true" strokeWidth={2.5} />
                {t("dashboard.live_active")}
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-black text-white">
              {t("dashboard.title")}
            </h2>
            <p className="mt-2 text-sm font-bold text-white/90 max-w-xl">
              {t("dashboard.subtitle")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              to="/screen/new"
              className="btn-primary flex items-center gap-1.5 "
            >
              <Plus size={16} aria-hidden="true" />
              <span>{t("dashboard.screen_new")}</span>
            </Link>
          </div>
        </div>
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
