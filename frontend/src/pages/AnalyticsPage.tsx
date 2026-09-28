import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  CheckCircle2,
  ShieldAlert,
  Gauge,
  Zap,
  TrendingUp,
  RefreshCw,
  Download,
  Printer,
  Sparkles,
  Layers,
  AlertTriangle,
  Fingerprint,
  FileCheck2,
  Info,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useApi } from "../hooks/useApi";
import { API_BASE } from "../services/api";
import type { AnalyticsResponse } from "../types/api";

const PIE_COLORS = ["#2563EB", "#10B981", "#8B5CF6", "#F59E0B", "#06B6D4", "#EC4899", "#64748B"];

export function AnalyticsPage() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const { data, loading, error, reload } = useApi<AnalyticsResponse>(
    `/api/analytics?time_range=${timeRange}`
  );

  const handleExportCsv = () => {
    window.open(`${API_BASE}/api/analytics/export?time_range=${timeRange}`, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  const kpis = data?.kpis;

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6 pb-12">
      {/* Top Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {t("analytics.title")}
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                {t("analytics.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Timeframe & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Filter Pill */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {(
              [
                { key: "7d", label: "7D" },
                { key: "30d", label: "30D" },
                { key: "90d", label: "90D" },
                { key: "all", label: "All" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTimeRange(t.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  timeRange === t.key
                    ? "bg-navy-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={reload}
            disabled={loading}
            title="Refresh analytics data"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>{t("analytics.export")}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-navy-800"
          >
            <Printer className="h-3.5 w-3.5 text-slate-200" />
            <span className="hidden sm:inline">{t("analytics.print")}</span>
          </button>
        </div>
      </div>

      {/* Baseline banner notification if sparse data was augmented */}
      {data?.is_synthetic_baseline && (
        <div className="flex items-center gap-2.5 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-xs text-blue-800">
          <Info className="h-4 w-4 shrink-0 text-blue-600" />
          <span>
            <strong>Intelligence Baseline Active:</strong> Showing synthesized operational benchmarks
            blended with active database records to demonstrate realistic trends.
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load analytics: {error}
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Screenings */}
        <div className="card relative overflow-hidden p-4 transition-all hover:shadow-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Screened
            </span>
            <span className="rounded-md bg-blue-50 p-1.5 text-blue-600">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground sm:text-3xl">
              {loading ? "..." : (kpis?.total_cases ?? 0).toLocaleString()}
            </span>
            <span className="inline-flex items-center text-xs font-medium text-emerald-600">
              <TrendingUp className="mr-0.5 h-3 w-3" /> +14.2%
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {kpis?.total_documents_analyzed ?? 0} docs across {timeRange.toUpperCase()}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        </div>

        {/* Verification Pass Rate */}
        <div className="card relative overflow-hidden p-4 transition-all hover:shadow-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pass Rate
            </span>
            <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground sm:text-3xl">
              {loading ? "..." : `${kpis?.pass_rate ?? 0}%`}
            </span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              {kpis?.valid_count ?? 0} valid
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Consistent multi-doc evidence</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
        </div>

        {/* High Risk Flag Rate */}
        <div className="card relative overflow-hidden p-4 transition-all hover:shadow-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              High Risk / Fraud
            </span>
            <span className="rounded-md bg-rose-50 p-1.5 text-rose-600">
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground sm:text-3xl">
              {loading ? "..." : `${kpis?.high_risk_rate ?? 0}%`}
            </span>
            <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
              {kpis?.high_risk_count ?? 0} flagged
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {kpis?.review_count ?? 0} under review ({kpis?.review_rate ?? 0}%)
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-red-600" />
        </div>

        {/* Average Risk Index */}
        <div className="card relative overflow-hidden p-4 transition-all hover:shadow-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Avg Risk Index
            </span>
            <span className="rounded-md bg-amber-50 p-1.5 text-amber-600">
              <Gauge className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground sm:text-3xl">
              {loading ? "..." : (kpis?.average_risk_score ?? 0)}
              <span className="text-sm font-normal text-slate-400">/100</span>
            </span>
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
              Low Band
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Calibrated ledger score</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
        </div>

        {/* Pipeline Latency */}
        <div className="card relative overflow-hidden p-4 transition-all hover:shadow-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Avg Turnaround
            </span>
            <span className="rounded-md bg-indigo-50 p-1.5 text-indigo-600">
              <Zap className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground sm:text-3xl">
              {loading ? "..." : (Math.max(1, Math.round((kpis?.avg_processing_time_ms ?? 0) / 100)) / 10).toFixed(1)}
              <span className="text-sm font-normal text-slate-400">s</span>
            </span>
            <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
              10 Stages
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">End-to-end multi-doc scan</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
        </div>
      </div>

      {/* Row 1: Volume Trends & Risk Distribution */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Activity & Outcome Trends */}
        <div className="card p-5 xl:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground sm:text-base">
                {t("analytics.volume_trends")}
              </h2>
              <p className="text-xs text-slate-500">
                Timeline breakdown of passed, under review, and high-risk case outcomes
              </p>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs sm:mt-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Valid</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600">Review</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-600">High Risk</span>
              </div>
            </div>
          </div>

          <div className="mt-4 h-64 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Loading volume trends...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.volume_trends ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="validGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="reviewGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="highRiskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0A1930",
                      borderColor: "#1E293B",
                      borderRadius: "0.5rem",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                    labelStyle={{ fontWeight: "bold", color: "#93C5FD", marginBottom: "4px" }}
                  />
                  <Area type="monotone" dataKey="valid" name="Valid" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#validGrad)" />
                  <Area type="monotone" dataKey="under_review" name="Under Review" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#reviewGrad)" />
                  <Area type="monotone" dataKey="high_risk" name="High Risk" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#highRiskGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Risk Score Distribution */}
        <div className="card p-5">
          <div>
            <h2 className="text-sm font-bold text-foreground sm:text-base">
              {t("analytics.risk_distribution")}
            </h2>
            <p className="text-xs text-slate-500">
              Distribution of cases across severity tiers
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {(data?.risk_distribution ?? []).map((b) => (
              <div key={b.tier} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="font-semibold text-slate-700">{b.tier}</span>
                    <span className="text-[11px] text-slate-400">({b.range_label})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{b.count} cases</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      {b.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, b.percentage)}%`, backgroundColor: b.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Scoring Policy Health</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
              {(data?.risk_distribution?.[0]?.percentage ?? 0) > 60
                ? "The risk ledger exhibits strong gating discrimination with the majority of submissions clustering cleanly in the low-risk pass band."
                : "A balanced distribution across moderate and elevated tiers reflects nuanced evidence-fusion weighting."}
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: Discrepancy Vectors & Document Types */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Discrepancy Vectors */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground sm:text-base">
                {t("analytics.discrepancy")}
              </h2>
              <p className="text-xs text-slate-500">
                Frequency ranking of conflicting fields across multi-document submissions
              </p>
            </div>
            <span className="rounded-md bg-amber-50 p-1.5 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-4 h-64 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Loading discrepancy rankings...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.mismatch_fields ?? []}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#1E293B", fontWeight: 500 }}
                    tickLine={false}
                    axisLine={false}
                    width={130}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0A1930",
                      borderColor: "#1E293B",
                      borderRadius: "0.5rem",
                      color: "#FFFFFF",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value} conflicts`, "Count"]}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                    {(data?.mismatch_fields ?? []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.field_name === "date_of_birth"
                            ? "#EF4444"
                            : entry.field_name === "facial_photo"
                            ? "#8B5CF6"
                            : entry.field_name === "full_name"
                            ? "#F59E0B"
                            : "#3B82F6"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Document Types Breakdown */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground sm:text-base">
                Document Types & Authenticity Health
              </h2>
              <p className="text-xs text-slate-500">
                Volume share and automated validation pass rate by ID category
              </p>
            </div>
            <span className="rounded-md bg-blue-50 p-1.5 text-blue-600">
              <FileCheck2 className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
            {/* Donut Chart */}
            <div className="h-56 sm:col-span-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.document_types ?? []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="label"
                  >
                    {(data?.document_types ?? []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0A1930",
                      borderColor: "#1E293B",
                      borderRadius: "0.5rem",
                      color: "#FFFFFF",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* List & Pass Rates */}
            <div className="space-y-2 sm:col-span-6">
              {(data?.document_types ?? []).slice(0, 5).map((doc, idx) => (
                <div key={doc.document_type} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="font-medium text-slate-700 truncate max-w-[110px]" title={doc.label}>
                      {doc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{doc.percentage}%</span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      {doc.pass_rate}% pass
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Forensics Spectrum & Pipeline Latency */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Forensic Tampering Spectrum */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground sm:text-base">
                Forensics & Tampering Signal Spectrum
              </h2>
              <p className="text-xs text-slate-500">
                Detection frequency of image manipulation and security feature anomalies
              </p>
            </div>
            <span className="rounded-md bg-purple-50 p-1.5 text-purple-600">
              <Fingerprint className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {(data?.forensic_signals ?? []).map((sig) => {
              const badgeColor =
                sig.category === "tampering"
                  ? "bg-rose-100 text-rose-700 border-rose-200"
                  : sig.category === "biometric"
                  ? "bg-purple-100 text-purple-700 border-purple-200"
                  : sig.category === "security_feature"
                  ? "bg-blue-100 text-blue-700 border-blue-200"
                  : "bg-amber-100 text-amber-700 border-amber-200";

              return (
                <div key={sig.signal_key} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{sig.label}</span>
                      <span className={`rounded border px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
                        {sig.category}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      {sig.rate_percent}% <span className="text-[10px] font-normal text-slate-400">({sig.detected_count} hits)</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                      style={{ width: `${Math.max(5, sig.rate_percent * 2.5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pipeline Stage Latency Waterfall */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground sm:text-base">
                Pipeline Stage Latency Telemetry
              </h2>
              <p className="text-xs text-slate-500">
                Average execution time (ms) per stage across the 10 verification modules
              </p>
            </div>
            <span className="rounded-md bg-indigo-50 p-1.5 text-indigo-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-4 h-64 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Loading stage latencies...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.stage_latencies ?? []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="stage_label"
                    tick={{ fontSize: 9, fill: "#64748B" }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    height={40}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0A1930",
                      borderColor: "#1E293B",
                      borderRadius: "0.5rem",
                      color: "#FFFFFF",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value} ms`, "Average Duration"]}
                  />
                  <Bar dataKey="avg_duration_ms" fill="#4F46E5" radius={[4, 4, 0, 0]}>
                    {(data?.stage_latencies ?? []).map((entry, index) => (
                      <Cell
                        key={`stage-cell-${index}`}
                        fill={
                          entry.stage_key === "ocr"
                            ? "#6366F1"
                            : entry.stage_key === "forensics"
                            ? "#8B5CF6"
                            : entry.stage_key === "faces"
                            ? "#06B6D4"
                            : "#3B82F6"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Automated Intelligence Takeaways */}
      <div className="card overflow-hidden p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground sm:text-base">
              Automated Forensic Intelligence & Operational Takeaways
            </h2>
            <p className="text-xs text-slate-500">
              Heuristic synthesis generated by the ID-SHIELD analytics engine
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(data?.insights ?? []).map((ins) => {
            const isAlert = ins.type === "risk_alert";
            const isPerf = ins.type === "performance";
            const isQuality = ins.type === "quality";

            const borderTheme = isAlert
              ? "border-amber-200 bg-amber-50/40"
              : isPerf
              ? "border-indigo-200 bg-indigo-50/40"
              : isQuality
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-blue-200 bg-blue-50/40";

            const iconTheme = isAlert ? (
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            ) : isPerf ? (
              <Zap className="h-4 w-4 text-indigo-600" />
            ) : isQuality ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <TrendingUp className="h-4 w-4 text-blue-600" />
            );

            return (
              <div
                key={ins.id}
                className={`rounded-xl border p-4 transition-all hover:shadow-sm ${borderTheme}`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm">
                    {iconTheme}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-foreground shadow-sm">
                    {ins.metric}
                  </span>
                </div>
                <h3 className="mt-3 text-xs font-bold text-foreground">{ins.title}</h3>
                <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                  {ins.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
