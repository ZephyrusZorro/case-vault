import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MinusCircle,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  UserCheck,
  Hash,
  Layers,
  Scale,
  FileText,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import type {
  CaseComparisonResponse,
  ComparisonFieldRow,
  RuleEvaluationItem,
} from "../../types/api";
import { EvidenceGraph } from "./EvidenceGraph";
import { EvidenceFusionMatrix } from "./EvidenceFusionMatrix";

function RuleCard({ rule }: { rule: RuleEvaluationItem }) {
  const isPass = rule.status === "pass";
  const isFail = rule.status === "fail";
  const isWarn = rule.status === "warning";

  const getRuleIcon = () => {
    if (rule.rule_id.includes("AGE")) return <Calendar size={16} />;
    if (rule.rule_id.includes("PAN")) return <Hash size={16} />;
    if (rule.rule_id.includes("FATHER")) return <UserCheck size={16} />;
    return isPass ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />;
  };

  const badgeTone = isPass
    ? "bg-emerald-50 text-emerald-700   ring-emerald-500/30"
    : isFail
      ? "bg-rose-50 text-rose-700   ring-rose-500/30"
      : isWarn
        ? "bg-amber-50 text-amber-700   ring-amber-500/30"
        : "bg-slate-100 text-slate-600   ring-slate-500/20";

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isFail
          ? "border-rose-300  bg-rose-50/40 "
          : isWarn
            ? "border-amber-300  bg-amber-50/40 "
            : "border-slate-200/90  bg-white "
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-800  font-bold text-xs">
          <span
            className={`p-1.5 rounded-lg ${
              isPass
                ? "text-emerald-600  bg-emerald-50 "
                : isFail
                  ? "text-rose-600  bg-rose-50 "
                  : "text-slate-500  bg-slate-100 "
            }`}
          >
            {getRuleIcon()}
          </span>
          <span>{rule.rule_name}</span>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ring-inset ${badgeTone}`}
        >
          {rule.status.replace("_", " ")}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600  font-medium">
        {rule.explanation}
      </p>
    </div>
  );
}

function FieldBlock({ row }: { row: ComparisonFieldRow }) {
  const mismatch = row.status === "mismatch";
  const single = row.status === "single_source";

  return (
    <section className="card overflow-hidden border border-slate-200/90 ">
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5 ${
          mismatch
            ? "border-rose-200  bg-rose-50/80 "
            : "border-slate-100  bg-slate-50/80 "
        }`}
      >
        <div className="flex items-center gap-2.5">
          {mismatch ? (
            <AlertTriangle
              size={18}
              className="text-rose-500  shrink-0"
              aria-hidden="true"
            />
          ) : single ? (
            <MinusCircle
              size={18}
              className="text-slate-400  shrink-0"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              size={18}
              className="text-emerald-500  shrink-0"
              aria-hidden="true"
            />
          )}
          <h4 className="text-sm font-bold text-slate-900 ">
            {row.label}
          </h4>
          {mismatch && (
            <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm">
              Mismatch Detected
            </span>
          )}
          {row.similarity !== undefined && row.similarity !== null && (
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-mono font-bold ${
                row.similarity >= 0.9
                  ? "bg-emerald-50 text-emerald-700  "
                  : row.similarity >= 0.7
                    ? "bg-amber-50 text-amber-700  "
                    : "bg-rose-50 text-rose-700  "
              }`}
            >
              Similarity: {(row.similarity * 100).toFixed(0)}%
            </span>
          )}
        </div>
        {!single && !mismatch && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 ">
            <CheckCircle2 size={14} aria-hidden="true" /> Consistent across all documents
          </span>
        )}
        {single && (
          <span className="text-xs text-slate-500 ">
            Present in one document only
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-100 ">
            {row.values.map((v) => (
              <tr
                key={`${row.field_name}-${v.document_id}`}
                className={
                  v.agrees
                    ? "hover:bg-slate-50/60 "
                    : "bg-rose-50/60 "
                }
              >
                <td className="px-5 py-3 font-semibold text-slate-700  sm:w-64">
                  <div className="flex items-center">
                    {row.field_name === "facial_photo" && v.document_id && (
                      <img
                        src={`/api/documents/${v.document_id}/face-crop`}
                        alt={v.file_name}
                        className="mr-2 h-7 w-7 rounded-lg object-cover ring-1 ring-slate-300 "
                      />
                    )}
                    <span className="truncate">{v.file_name}</span>
                    {!v.agrees && (
                      <span className="ml-2 shrink-0 rounded bg-rose-100  px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700 ">
                        conflicts
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`text-sm ${
                      v.agrees
                        ? "font-semibold text-slate-900 "
                        : "font-bold text-rose-700 "
                    }`}
                  >
                    {v.normalized_value ?? v.raw_value}
                  </span>
                </td>
                <td className="hidden px-5 py-3 text-right text-xs font-mono text-slate-400  md:table-cell">
                  {v.confidence !== null ? `${Math.round(v.confidence)}% conf.` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mismatch && row.explanation && (
        <div className="border-t border-rose-200  bg-rose-50/60  px-5 py-3 text-xs leading-relaxed text-rose-800  font-medium">
          <strong>Explainable finding:</strong> {row.explanation}
        </div>
      )}
    </section>
  );
}

export function ComparisonTab({ caseId }: { caseId: string }) {
  const [viewMode, setViewMode] = useState<"graph" | "fusion" | "ledger">("graph");
  const { data, loading, error } = useApi<CaseComparisonResponse>(
    `/api/cases/${caseId}/comparison`,
  );

  if (loading)
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-xs font-medium text-slate-500 ">
        <Loader2 size={18} className="animate-spin text-blue-500" aria-hidden="true" />{" "}
        Evaluating cross-document verification rules &amp; evidence…
      </div>
    );
  if (error)
    return (
      <p
        role="alert"
        className="rounded-xl bg-rose-50  p-4 text-xs font-semibold text-rose-700  border border-rose-200 "
      >
        {error}
      </p>
    );
  if (!data || (data.fields.length === 0 && (!data.rules_evaluated || data.rules_evaluated.length === 0)))
    return (
      <p className="py-12 text-center text-xs text-slate-400 ">
        No extracted fields or documents available to compare yet.
      </p>
    );

  const mismatches = data.fields.filter((f) => f.status === "mismatch").length;
  const consistent = data.fields.filter((f) => f.status === "consistent").length;
  const ruleViolations = (data.rules_evaluated || []).filter((r) => r.status === "fail").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary strip with view mode toggle */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-900 ">
            Cross-Document Evidence Fusion
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 ">
            <CheckCircle2 size={15} aria-hidden="true" /> {consistent} Consistent Fields
          </span>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold ${
              mismatches > 0 ? "text-rose-600 " : "text-slate-400 "
            }`}
          >
            <AlertTriangle size={15} aria-hidden="true" /> {mismatches} Field Discrepanc{mismatches === 1 ? "y" : "ies"}
          </span>
          {ruleViolations > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 ">
              <ShieldAlert size={15} /> {ruleViolations} Rule Violation{ruleViolations === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1 ">
          <button
            type="button"
            onClick={() => setViewMode("graph")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === "graph"
                ? "bg-white text-blue-600 shadow-sm  "
                : "text-slate-600 hover:text-slate-900  "
            }`}
          >
            <Layers size={14} />
            <span>Evidence Graph (12)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("fusion")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === "fusion"
                ? "bg-white text-blue-600 shadow-sm  "
                : "text-slate-600 hover:text-slate-900  "
            }`}
          >
            <Scale size={14} />
            <span>Fusion Matrix (4 &amp; 6)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("ledger")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === "ledger"
                ? "bg-white text-blue-600 shadow-sm  "
                : "text-slate-600 hover:text-slate-900  "
            }`}
          >
            <FileText size={14} />
            <span>Field Ledger</span>
          </button>
        </div>
      </div>

      {/* View 1: Evidence Graph (Workflow Module 12) */}
      {viewMode === "graph" && data.evidence_graph && (
        <EvidenceGraph
          data={data.evidence_graph}
          overallRisk={mismatches > 0 ? 65 : 15}
        />
      )}

      {/* View 2: Multi-Source Evidence Fusion (Workflow Modules 4 & 6) */}
      {viewMode === "fusion" && data.fusion_matrix && (
        <EvidenceFusionMatrix rows={data.fusion_matrix} />
      )}

      {/* Verification Rule Engine Results (Always visible below graph/matrix or in ledger) */}
      {data.rules_evaluated && data.rules_evaluated.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 ">
            Custom Verification Rules &amp; Chronological Integrity
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data.rules_evaluated.map((r) => (
              <RuleCard key={r.rule_id} rule={r} />
            ))}
          </div>
        </section>
      )}

      {/* View 3: Cross-Document Field Ledger */}
      {viewMode === "ledger" && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 ">
            Multi-Document Field Comparison Matrix
          </h3>
          <div className="space-y-4">
            {data.fields.map((row) => (
              <FieldBlock key={row.field_name} row={row} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

