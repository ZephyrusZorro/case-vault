import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Send,
  Volume2,
  Layers,
} from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { ValidationTab } from "../components/documents/ValidationTab";
import { ComparisonTab } from "../components/documents/ComparisonTab";
import { ForensicsTab } from "../components/documents/ForensicsTab";
import { FaceVerificationTab } from "../components/documents/FaceVerificationTab";
import { ReportTab } from "../components/documents/ReportTab";
import { NotificationsTab } from "../components/notifications/NotificationsTab";
import { NotificationModal } from "../components/notifications/NotificationModal";
import { DocImage } from "../components/documents/DocImage";
import { DocumentTypeSelector } from "../components/documents/DocumentTypeSelector";
import { ReviewDispositionCard } from "../components/documents/ReviewDispositionCard";
import { useApi } from "../hooks/useApi";
import type { RiskReport, CaseDetail, DocumentDetail } from "../types/api";
import { TrendingDown, TrendingUp, ShieldAlert, ShieldCheck, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

function riskTone(score: number): string {
  if (score >= 60) return "text-accent-pink";
  if (score >= 30) return "text-accent-yellow";
  return "text-accent-mint";
}

function recommendationLabel(rec: string | null): { text: string; tone: string; icon: typeof ShieldCheck } {
  switch (rec) {
    case "verification_passed":
      return { text: "Verification Passed", tone: "bg-accent-mint text-foreground border-2 border-foreground shadow-hard", icon: ShieldCheck };
    case "review_recommended":
      return { text: "Review Recommended", tone: "bg-accent-yellow text-foreground border-2 border-foreground shadow-hard", icon: ShieldAlert };
    case "manual_review_required":
      return { text: "Manual Review Required", tone: "bg-accent-pink text-white border-2 border-foreground shadow-hard", icon: ShieldAlert };
    default:
      return { text: "Unable to Verify", tone: "bg-slate-100 text-slate-600 border-2 border-foreground shadow-hard", icon: HelpCircle };
  }
}

function RiskPanel({ caseId }: { caseId: string }) {
  const { data: risk } = useApi<RiskReport>(`/api/cases/${caseId}/risk`);
  if (!risk || (risk.score === null && risk.factors.length === 0)) return null;

  const rec = recommendationLabel(risk.recommendation);
  const RecIcon = rec.icon;

  return (
    <section className="card mt-6 p-5 border-slate-200/90 " aria-label="Risk assessment">
      <div className="flex flex-wrap items-center gap-8">
        {/* Score */}
        <div className="min-w-[180px]">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 ">
            Overall Risk Score
          </p>
          <div className="mt-1 flex items-end gap-2">
            <span className={`text-5xl font-black leading-none font-mono ${risk.score !== null ? riskTone(risk.score) : "text-slate-400"}`}>
              {risk.score ?? "—"}
            </span>
            <span className="pb-1 text-sm font-bold text-slate-400 ">/ 100</span>
          </div>
          {/* Score bar */}
          <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-white border-2 border-foreground shadow-hard">
            <div
              className={`h-full border-r-2 border-foreground transition-all duration-700 ${
                (risk.score ?? 0) >= 60 ? "bg-accent-pink" : (risk.score ?? 0) >= 30 ? "bg-accent-yellow" : "bg-accent-mint"
              }`}
              style={{ width: `${risk.score ?? 0}%` }}
            />
          </div>
          {risk.band && (
            <p className="mt-1.5 text-xs font-extrabold uppercase tracking-wider text-foreground ">
              {risk.band} RISK BAND
            </p>
          )}
        </div>

        {/* Recommendation */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 ">
            Automated Recommendation
          </p>
          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${rec.tone}`}
          >
            <RecIcon size={14} aria-hidden="true" />
            Decision: {rec.text}
          </span>
        </div>

        {/* Contribution ledger */}
        {risk.factors.length > 0 && (
          <div className="min-w-[260px] flex-1">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 ">
              Evidence Factors &amp; Point Adjustments
            </p>
            <ul className="space-y-1.5">
              {risk.factors.map((f) => (
                <li key={f.factor} className="flex items-start gap-2 text-xs">
                  {f.direction === "increase" ? (
                    <TrendingUp size={16} className="mt-0.5 shrink-0 text-accent-pink" aria-hidden="true" strokeWidth={2.5} />
                  ) : (
                    <TrendingDown size={16} className="mt-0.5 shrink-0 text-accent-mint" aria-hidden="true" strokeWidth={2.5} />
                  )}
                  <span className={`font-mono font-bold ${f.direction === "increase" ? "text-accent-pink" : "text-accent-mint"}`}>
                    {f.score > 0 ? `+${f.score}` : f.score}
                  </span>
                  <span className="text-slate-700 font-bold">{f.explanation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

const TABS = [
  "Overview",
  "Documents",
  "Validation",
  "Forensics",
  "Face Verification",
  "Comparison",
  "Report",
  "Notifications",
] as const;
type Tab = (typeof TABS)[number];

const FIELD_LABELS: Record<string, string> = {
  full_name: "Name",
  document_number: "Document Number",
  date_of_birth: "Date of Birth",
  gender: "Gender",
  nationality: "Nationality",
  issue_date: "Date of Issue",
  expiry_date: "Date of Expiry",
  address: "Address",
};

function formatFieldName(key: string): string {
  return (
    FIELD_LABELS[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function ConfidenceChip({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-slate-400 ">—</span>;
  const tone =
    value >= 85
      ? "bg-accent-mint text-foreground"
      : value >= 65
        ? "bg-accent-yellow text-foreground"
        : "bg-accent-pink text-white";
  return (
    <span className={`rounded-md px-2 py-0.5 border-2 border-foreground shadow-hard text-xs font-mono font-bold ${tone}`}>
      {value.toFixed(0)}%
    </span>
  );
}

function DocumentsTab({
  caseData,
  onRefresh,
}: {
  caseData: CaseDetail;
  onRefresh?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    caseData.documents[0]?.id ?? null,
  );
  const { data: doc, loading, error, reload: reloadDoc } = useApi<DocumentDetail>(
    selectedId ? `/api/documents/${selectedId}` : null,
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
      {/* Document list */}
      <ul className="space-y-2" aria-label="Case documents">
        {caseData.documents.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => setSelectedId(d.id)}
              className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                selectedId === d.id
                  ? "border-foreground bg-accent-yellow shadow-hard-active translate-x-1"
                  : "border-transparent bg-white hover:border-foreground hover:shadow-hard"
              }`}
            >
              <p className="truncate text-xs font-bold text-foreground ">{d.file_name}</p>
              <p className="mt-1 text-[11px] capitalize text-slate-500  font-medium">
                {d.document_type
                  ? `${d.document_type.replace(/_/g, " ")}${
                      d.type_confidence !== null
                        ? ` · ${Math.round(d.type_confidence * 100)}%`
                        : ""
                    }`
                  : "type pending"}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {/* Detail panel */}
      <div className="card p-5">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-xs text-slate-500 ">
            <Loader2 size={18} className="animate-spin text-blue-500" aria-hidden="true" /> Loading document details…
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50  p-4 text-xs font-semibold text-rose-700  border border-rose-200 ">
            {error}
          </p>
        )}
        {!loading && !error && doc && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(220px,320px)_1fr]">
            {/* Preview */}
            <div>
              {doc.has_preview ? (
                <DocImage
                  src={`/api/documents/${doc.id}/file`}
                  alt={`Uploaded document ${doc.file_name}`}
                  className="w-full rounded-xl border-2 border-foreground shadow-hard"
                />
              ) : (
                <div className="flex aspect-[3/2] items-center justify-center rounded-xl border-2 border-foreground bg-slate-50 shadow-hard">
                  <FileText size={40} className="text-slate-400" aria-hidden="true" strokeWidth={2.5} />
                </div>
              )}
              <dl className="mt-4 space-y-3 text-xs text-slate-500  border-t border-slate-100  pt-3">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400  mb-1">
                    Document Type
                  </dt>
                  <dd>
                    <DocumentTypeSelector
                      caseId={caseData.id}
                      document={doc}
                      onUpdated={() => {
                        reloadDoc();
                        onRefresh?.();
                      }}
                    />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>OCR Engine</dt>
                  <dd className="font-semibold text-foreground ">{doc.ocr_engine ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>OCR Confidence</dt>
                  <dd><ConfidenceChip value={doc.ocr_mean_confidence} /></dd>
                </div>
                <div className="flex justify-between">
                  <dt>SHA-256 Hash</dt>
                  <dd className="font-mono text-[11px] text-foreground ">{doc.file_hash_prefix ?? "—"}</dd>
                </div>
                <div className="flex flex-col gap-1 border-t border-slate-100  pt-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-500 ">Indic Multilingual OCR (14)</span>
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600   ring-1 ring-indigo-500/20">
                      Extension Ready
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Hindi (हिंदी), Kannada (ಕನ್ನಡ), Urdu (اردو), Malayalam (മലയാളം), Tamil (தமிழ்), Telugu (తెలుగు)
                  </p>
                </div>
              </dl>
            </div>

            {/* Extracted fields */}
            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground ">
                Structured Field Ledger
              </h4>
              {doc.fields.length === 0 ? (
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-50  p-4 border border-amber-200 ">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
                  <p className="text-xs leading-relaxed text-amber-800 ">
                    No structured fields could be extracted. Check document scan quality.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-slate-100  bg-slate-50/70  text-slate-500 ">
                      <tr>
                        <th scope="col" className="table-head-cell">Field</th>
                        <th scope="col" className="table-head-cell">Normalized Value</th>
                        <th scope="col" className="table-head-cell">Conf.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 ">
                      {doc.fields.map((f, i) => (
                        <tr key={`${i}-${f.field_name}-${f.raw_value}`} className="hover:bg-slate-50/50 ">
                          <td className="table-cell whitespace-nowrap font-medium text-slate-600 ">{formatFieldName(f.field_name)}</td>
                          <td className="table-cell">
                            <span className="font-bold text-foreground ">{f.normalized_value ?? f.raw_value}</span>
                          </td>
                          <td className="table-cell"><ConfidenceChip value={f.confidence} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400 ">
                <CheckCircle2 size={13} aria-hidden="true" className="text-blue-500" />
                Evidence extracted deterministically via multi-pass OCR &amp; MRZ parser.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CaseDetailPage() {
  const { t } = useTranslation();
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Overview");
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const {
    data: caseData,
    loading,
    error,
    reload,
  } = useApi<CaseDetail>(caseId ? `/api/cases/${caseId}` : null);

  useEffect(() => {
    const handleTabSwitch = (e: any) => {
      const targetTab = e.detail;
      if (targetTab && TABS.includes(targetTab)) {
        setTab(targetTab);
      }
    };
    window.addEventListener("idshield:switch-tab", handleTabSwitch);
    return () => window.removeEventListener("idshield:switch-tab", handleTabSwitch);
  }, []);

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6">
      <button
        type="button"
        onClick={() => navigate("/history")}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500  transition-colors hover:text-navy-900 "
      >
        <ArrowLeft size={14} aria-hidden="true" /> Back to screening history
      </button>

      <PageHeader
        title={caseData ? `Case #${caseData.case_number} — ${caseData.case_name}` : t("cases.detail_title")}
        subtitle={t("cases.detail_subtitle")}
        actions={
          caseData && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("idshield:voice-speak-brief"));
                }}
                className="btn-secondary flex items-center gap-1.5 text-xs text-blue-600  border-blue-200  hover:bg-blue-50 "
                title="Read plain oral summary of this case for accessibility"
              >
                <Volume2 size={13} />
                <span>{t("cases.voice_summary")}</span>
              </button>
              <button
                type="button"
                onClick={() => setNotificationModalOpen(true)}
                className="btn-primary  flex items-center gap-2 text-xs"
              >
                <Send size={13} />
                <span>Notify Applicant</span>
              </button>
            </div>
          )
        }
      />

      <div className="card overflow-hidden">
        <div role="tablist" aria-label="Case sections" className="flex gap-1 overflow-x-auto border-b-2 border-foreground bg-slate-50 px-3 pt-2">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              type="button"
              onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-t-xl px-4 py-2.5 text-xs font-bold transition-all border-2 border-b-0 ${
                tab === t
                  ? "border-foreground bg-white text-foreground shadow-hard-active translate-y-0.5 z-10"
                  : "border-transparent text-slate-500 hover:text-foreground hover:bg-slate-100/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center gap-3 py-16 text-xs text-slate-500 ">
              <Loader2 size={18} className="animate-spin text-blue-500" aria-hidden="true" /> Loading case dossier…
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-rose-50  p-4 text-xs font-semibold text-rose-700  border border-rose-200 ">
              {error}
            </p>
          )}

          {caseData && tab === "Overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200/80  bg-slate-50/50  p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ">Pipeline Status</p>
                  <p className="mt-1 text-sm font-extrabold capitalize text-foreground ">{caseData.status}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80  bg-slate-50/50  p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ">Evidence Count</p>
                  <p className="mt-1 text-sm font-extrabold text-foreground ">{caseData.documents.length} Docs</p>
                </div>
                <div className="rounded-xl border border-slate-200/80  bg-slate-50/50  p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ">Risk Score</p>
                  {caseData.overall_risk !== null ? (
                    <p className={`mt-1 text-lg font-mono font-black ${riskTone(caseData.overall_risk)}`}>
                      {caseData.overall_risk}/100
                    </p>
                  ) : (
                    <p className="mt-1 text-sm font-bold text-slate-400">Pending</p>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200/80  bg-slate-50/50  p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ">Recommendation</p>
                  {caseData.recommendation ? (
                    (() => {
                      const rec = recommendationLabel(caseData.recommendation);
                      return (
                        <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${rec.tone}`}>
                          {rec.text}
                        </span>
                      );
                    })()
                  ) : (
                    <p className="mt-1 text-sm font-bold text-slate-400">Evaluating</p>
                  )}
                </div>
              </div>

              {caseId && <RiskPanel caseId={caseId} />}

              <ReviewDispositionCard caseData={caseData} onReviewSubmitted={reload} />

              {caseData.documents.length > 0 ? (
                <div>
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground ">
                    Submitted Evidence Scans
                  </h4>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {caseData.documents.map((d) => (
                      <figure key={d.id} className="overflow-hidden rounded-xl border border-slate-200/80  bg-white  shadow-card">
                        {d.has_preview ? (
                          <DocImage
                            src={`/api/documents/${d.id}/file`}
                            alt={`Document ${d.file_name}`}
                            className="aspect-[3/2] w-full object-cover"
                            fallbackClassName="aspect-[3/2] w-full"
                          />
                        ) : (
                          <div className="flex aspect-[3/2] items-center justify-center bg-slate-50 ">
                            <FileText size={32} className="text-slate-400 " aria-hidden="true" />
                          </div>
                        )}
                        <figcaption className="p-3 border-t border-slate-100  space-y-2">
                          <p className="truncate text-xs font-bold text-foreground " title={d.file_name}>
                            {d.file_name}
                          </p>
                          <DocumentTypeSelector
                            caseId={caseData.id}
                            document={d}
                            compact={true}
                            onUpdated={() => reload()}
                          />
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setTab("Comparison")}
                      className="btn-secondary text-xs text-blue-600  border-blue-200 "
                    >
                      <Layers size={13} />
                      <span>Inspect Evidence Graph (12)</span>
                    </button>
                    <button type="button" onClick={() => setTab("Documents")} className="btn-secondary text-xs">
                      Inspect Extracted Fields
                    </button>
                    <button type="button" onClick={() => setTab("Face Verification")} className="btn-secondary text-xs">
                      Inspect Facial Biometrics
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationModalOpen(true)}
                      className="btn-secondary text-xs text-slate-600 "
                    >
                      <MessageSquare size={13} />
                      <span>Send Discrepancy Notice</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 ">No documents in this case yet.</p>
              )}
            </div>
          )}

          {caseData && tab === "Documents" && (
            <DocumentsTab caseData={caseData} onRefresh={() => reload()} />
          )}

          {caseData && tab === "Validation" && caseId && <ValidationTab caseId={caseId} />}

          {caseData && tab === "Comparison" && caseId && <ComparisonTab caseId={caseId} />}

          {caseData && tab === "Forensics" && caseId && <ForensicsTab caseId={caseId} />}

          {caseData && tab === "Face Verification" && caseId && (
            <FaceVerificationTab caseId={caseId} />
          )}

          {caseData && tab === "Report" && caseId && <ReportTab caseId={caseId} />}

          {caseData && tab === "Notifications" && caseId && (
            <NotificationsTab
              caseId={caseId}
              caseData={caseData}
              onRefreshCase={() => reload()}
            />
          )}
        </div>
      </div>

      {/* Discrepancy Notification Modal */}
      {caseId && (
        <NotificationModal
          caseId={caseId}
          isOpen={notificationModalOpen}
          onClose={() => setNotificationModalOpen(false)}
          onSent={() => reload()}
        />
      )}
    </div>
  );
}
