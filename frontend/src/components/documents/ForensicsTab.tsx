import { useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck, Info } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { DocImage } from "./DocImage";
import type {
  CaseForensicsResponse,
  DocumentForensicsReport,
  ForensicItem,
} from "../../types/api";

const SUSPICION_TONE: Record<
  DocumentForensicsReport["overall_suspicion"],
  string
> = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20   ",
  medium: "bg-amber-50 text-amber-700 ring-amber-600/25   ",
  high: "bg-rose-50 text-rose-700 ring-rose-600/20   ",
};

function severityColor(severity: ForensicItem["severity"]): string {
  if (severity === "high") return "border-rose-500 bg-rose-500/20";
  if (severity === "medium") return "border-amber-500 bg-amber-400/20";
  return "border-slate-400 bg-slate-400/10";
}

/** Preview with percentage-based bbox overlays (scales with the image). */
function AnnotatedPreview({ report }: { report: DocumentForensicsReport }) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  return (
    <div className="relative inline-block overflow-hidden rounded-xl border border-slate-200  bg-slate-100  shadow-sm">
      <DocImage
        src={`/api/documents/${report.document_id}/file`}
        alt={`Document ${report.file_name}`}
        className="max-h-[420px] w-auto object-contain"
        onLoad={(e) => {
          const t = e.currentTarget;
          setDims({ w: t.naturalWidth, h: t.naturalHeight });
        }}
      />
      {dims &&
        report.findings.map((f, i) => {
          const [x, y, w, h] = f.bbox;
          const isStructural = f.severity === "low";
          return (
            <div
              key={i}
              className={`absolute rounded border-2 ${severityColor(f.severity)} ${
                isStructural ? "opacity-40" : "opacity-90"
              }`}
              style={{
                left: `${(x / dims.w) * 100}%`,
                top: `${(y / dims.h) * 100}%`,
                width: `${(w / dims.w) * 100}%`,
                height: `${(h / dims.h) * 100}%`,
              }}
              title={`${f.region} — score ${Math.round(f.score * 100)}`}
            >
              <span
                className={`absolute -top-2 left-1 h-2 w-2 -translate-y-1/2 rounded-full ring-1 ring-white ${
                  f.severity === "high"
                    ? "bg-rose-500"
                    : f.severity === "medium"
                      ? "bg-amber-500"
                      : "bg-slate-400"
                }`}
              />
            </div>
          );
        })}
    </div>
  );
}

function DocumentCard({ report }: { report: DocumentForensicsReport }) {
  return (
    <section className="card p-5 space-y-4 border border-slate-200/90 ">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100  pb-3.5">
        <div>
          <h4 className="text-sm font-bold text-slate-900 ">{report.file_name}</h4>
          <p className="text-xs capitalize text-slate-500  font-medium">
            {report.document_type?.replace(/_/g, " ") ?? "unclassified"} ·{" "}
            {report.findings.length} visual finding{report.findings.length === 1 ? "" : "s"}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ring-inset ${SUSPICION_TONE[report.overall_suspicion]}`}
        >
          {report.overall_suspicion === "low" ? (
            <ShieldCheck size={14} aria-hidden="true" />
          ) : (
            <ShieldAlert size={14} aria-hidden="true" />
          )}
          {report.overall_suspicion} suspicion · {report.suspicion_score}/100
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <AnnotatedPreview report={report} />

        <div className="space-y-3">
          {report.findings.length === 0 ? (
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50  p-4 border border-emerald-200 ">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600 " aria-hidden="true" />
              <p className="text-xs leading-relaxed text-emerald-800  font-medium">
                No significant image tampering, compression anomalies, or splicing indicators detected.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {report.findings.map((f, i) => (
                <li
                  key={i}
                  className={`rounded-xl border-l-4 p-3.5 transition-colors ${
                    f.severity === "high"
                      ? "border-rose-500 bg-rose-50/70  text-rose-900 "
                      : f.severity === "medium"
                        ? "border-amber-500 bg-amber-50/70  text-amber-900 "
                        : "border-slate-300  bg-slate-50/80  text-slate-800 "
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold capitalize text-slate-900 ">
                      {f.region}
                    </p>
                    <span className="font-mono text-[10px] text-slate-400 ">
                      [{f.bbox.join(", ")}]
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700  font-medium">
                    {f.explanation}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      f.finding_type === "copy_move_anomaly"
                        ? "bg-purple-100 text-purple-800   border border-purple-200 "
                        : f.finding_type === "metadata_tamper_indicator"
                          ? "bg-rose-100 text-rose-800   border border-rose-200 "
                          : f.finding_type === "noise_variance_anomaly"
                            ? "bg-indigo-100 text-indigo-800   border border-indigo-200 "
                            : f.finding_type === "compression_anomaly"
                              ? "bg-amber-100 text-amber-800   border border-amber-200 "
                              : "bg-blue-100 text-blue-800   border border-blue-200 "
                    }`}>
                      {f.finding_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-500 ">
                      Score: {Math.round(f.score * 100)}/100
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-start gap-2.5 rounded-xl border border-blue-100  bg-blue-50/70  p-3 text-xs leading-relaxed text-blue-900 ">
            <Info size={15} className="mt-0.5 shrink-0 text-blue-600 " aria-hidden="true" />
            <p className="text-[11px]">
              Highlighted bounding boxes mark algorithmic anomalies in pixel gradient and noise levels. Verification decisions should combine ELA and cross-document data.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ForensicsTab({ caseId }: { caseId: string }) {
  const { data, loading, error } = useApi<CaseForensicsResponse>(
    `/api/cases/${caseId}/forensics`,
  );

  if (loading)
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-xs text-slate-500  font-medium">
        <Loader2 size={18} className="animate-spin text-blue-500" aria-hidden="true" /> Analyzing image noise and compression gradients…
      </div>
    );
  if (error)
    return (
      <p role="alert" className="rounded-xl bg-rose-50  p-4 text-xs font-semibold text-rose-700  border border-rose-200 ">
        {error}
      </p>
    );
  if (!data || data.documents.length === 0)
    return (
      <p className="py-12 text-center text-xs text-slate-400 ">
        No documents available for forensic analysis.
      </p>
    );

  return (
    <div className="space-y-5 animate-fade-in">
      {data.documents.map((r) => (
        <DocumentCard key={r.document_id} report={r} />
      ))}
      <p className="text-center text-[11px] text-slate-400  font-medium">{data.disclaimer}</p>
    </div>
  );
}
