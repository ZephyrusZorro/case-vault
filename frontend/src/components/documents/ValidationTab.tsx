import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, Loader2 } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import type {
  CaseValidationsResponse,
  CheckStatus,
  DocumentValidationReport,
  OverallValidation,
} from "../../types/api";

function CheckIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case "pass":
      return <CheckCircle2 size={17} className="shrink-0 text-emerald-500" aria-hidden="true" />;
    case "fail":
      return <XCircle size={17} className="shrink-0 text-rose-500" aria-hidden="true" />;
    case "warning":
      return <AlertTriangle size={17} className="shrink-0 text-amber-500" aria-hidden="true" />;
    default:
      return <MinusCircle size={17} className="shrink-0 text-slate-400 " aria-hidden="true" />;
  }
}

const OVERALL_LABEL: Record<OverallValidation, string> = {
  valid: "VALID",
  review_required: "REVIEW REQUIRED",
  unable_to_verify: "UNABLE TO VERIFY",
};

const OVERALL_TONE: Record<OverallValidation, string> = {
  valid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20   ",
  review_required: "bg-amber-50 text-amber-700 ring-amber-600/25   ",
  unable_to_verify: "bg-slate-100 text-slate-700 ring-slate-500/20   ",
};

function DocumentCard({ report }: { report: DocumentValidationReport }) {
  return (
    <section className="card p-5 space-y-4 border border-slate-200/90 ">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100  pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 ">{report.file_name}</h4>
          <p className="text-xs capitalize text-slate-500  font-medium">
            {report.document_type?.replace(/_/g, " ") ?? "unclassified"}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold tracking-wide ring-1 ring-inset ${OVERALL_TONE[report.overall_status]}`}
        >
          {OVERALL_LABEL[report.overall_status]}
        </span>
      </div>

      {report.items.length === 0 ? (
        <p className="text-xs text-slate-400 ">No validation checks recorded.</p>
      ) : (
        <ul className="space-y-2.5">
          {report.items.map((item, i) => {
            const isQualityCheck = item.check_type === "Image quality check";
            const isPoorQuality = isQualityCheck && item.status !== "pass";

            return (
              <li
                key={`${i}-${item.check_type}-${item.message}`}
                className={`flex items-start gap-2.5 rounded-lg p-2.5 transition-colors ${
                  isPoorQuality
                    ? "bg-amber-50/70  border border-amber-200 "
                    : "hover:bg-slate-50/70 "
                }`}
              >
                <span className="mt-0.5">
                  <CheckIcon status={item.status} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900 ">
                      {item.check_type}
                    </p>
                    {isQualityCheck && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600  ">
                        Workflow Module 2
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-0.5 text-xs leading-relaxed ${
                      item.status === "fail"
                        ? "text-rose-600  font-semibold"
                        : item.status === "warning"
                          ? "text-amber-700  font-medium"
                          : "text-slate-600 "
                    }`}
                  >
                    {item.message}
                  </p>
                  {isPoorQuality && (
                    <p className="mt-1.5 inline-flex items-center gap-1 rounded bg-amber-100/80 px-2 py-0.5 text-[11px] font-bold text-amber-800  ">
                      <AlertTriangle size={12} /> Guardrail: OCR extracted text marked unverified due to image clarity issues.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function ValidationTab({ caseId }: { caseId: string }) {
  const { data, loading, error } = useApi<CaseValidationsResponse>(
    `/api/cases/${caseId}/validations`,
  );

  if (loading)
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-xs font-medium text-slate-500 ">
        <Loader2 size={18} className="animate-spin text-blue-500" aria-hidden="true" /> Verifying structural &amp; checksum rules…
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
        No documents to validate in this case.
      </p>
    );

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 animate-fade-in">
      {data.documents.map((r) => (
        <DocumentCard key={r.document_id} report={r} />
      ))}
      <p className="col-span-full text-center text-[11px] text-slate-400  font-medium">
        Validation verifies ICAO MRZ checksums, expiry boundaries, and format patterns deterministically.
      </p>
    </div>
  );
}
