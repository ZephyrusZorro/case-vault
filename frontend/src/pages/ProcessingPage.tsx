import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CheckCircle2,
  Loader2,
  CircleDashed,
  AlertTriangle,
  MinusCircle,
  XCircle,
  ArrowRight,
  Cpu,
} from "lucide-react";
import { apiGet } from "../services/api";
import { useTranslation } from "react-i18next";
import type { AnalysisResponse, StageStatus } from "../types/api";

const POLL_MS = 800;
const MAX_CONSECUTIVE_ERRORS = 8;

function StageIcon({ status }: { status: StageStatus }) {
  switch (status) {
    case "done":
      return <CheckCircle2 size={19} className="shrink-0 text-accent-mint" aria-hidden="true" strokeWidth={2.5} />;
    case "running":
      return <Loader2 size={19} className="shrink-0 animate-spin text-accent-violet" aria-hidden="true" strokeWidth={2.5} />;
    case "warning":
      return <AlertTriangle size={19} className="shrink-0 text-accent-yellow" aria-hidden="true" strokeWidth={2.5} />;
    case "unavailable":
      return <MinusCircle size={19} className="shrink-0 text-slate-500" aria-hidden="true" strokeWidth={2.5} />;
    case "error":
      return <XCircle size={19} className="shrink-0 text-accent-pink" aria-hidden="true" strokeWidth={2.5} />;
    default:
      return <CircleDashed size={19} className="shrink-0 text-slate-400" aria-hidden="true" strokeWidth={2.5} />;
  }
}

const STATUS_TEXT: Record<StageStatus, string> = {
  pending: "text-slate-400 font-bold",
  running: "text-accent-violet font-extrabold",
  done: "text-foreground font-bold",
  warning: "text-foreground font-bold",
  unavailable: "text-slate-400 font-bold",
  error: "text-accent-pink font-bold",
};

export function ProcessingPage() {
  const { t } = useTranslation();
  const { caseId } = useParams<{ caseId: string }>();
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let consecutiveErrors = 0;

    const poll = async () => {
      try {
        const data = await apiGet<AnalysisResponse>(`/api/cases/${caseId}/analysis`);
        if (cancelled) return;
        setAnalysis(data);
        setError(null);
        consecutiveErrors = 0;
        const busy =
          data.case_status === "processing" ||
          data.case_status === "draft" ||
          data.stages.length === 0 ||
          data.stages.some((s) => s.status === "pending" || s.status === "running");
        if (busy) timer = setTimeout(poll, POLL_MS);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load analysis.");
        consecutiveErrors += 1;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          if (!cancelled) setGaveUp(true);
          return;
        }
        timer = setTimeout(poll, POLL_MS * 2);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [caseId]);

  const finished =
    analysis !== null &&
    analysis.stages.length > 0 &&
    (analysis.case_status === "completed" || analysis.case_status === "failed") &&
    !analysis.stages.some((s) => s.status === "pending" || s.status === "running");

  const completedCount = analysis?.stages.filter((s) => s.status === "done" || s.status === "warning").length ?? 0;
  const totalCount = analysis?.stages.length || 11;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-accent-yellow border-2 border-foreground text-foreground shadow-hard-active">
              <Cpu size={14} strokeWidth={2.5} />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
              {finished ? "Screening Complete" : t("cases.processing_title")}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-black text-foreground">
            {finished ? "Multi-Modal Evidence Ready" : "Forensic Pipeline Running"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 ">
            {finished ? "All forensic models finished evaluating the submitted documents." : t("cases.processing_subtitle")}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-foreground ">{progressPercent}%</span>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Completed</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-4 w-full overflow-hidden rounded-full bg-white border-2 border-foreground shadow-hard">
        <div
          className="h-full bg-accent-mint border-r-2 border-foreground transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="card p-6 space-y-4 border-2 border-foreground shadow-hard bg-white rounded-2xl">
        {error && !gaveUp && (
          <p role="alert" className="rounded-xl bg-accent-pink p-4 text-xs font-bold text-white border-2 border-foreground shadow-hard">
            {error}
          </p>
        )}

        {gaveUp && (
          <div role="alert" className="rounded-xl bg-accent-pink p-4 text-xs text-white border-2 border-foreground shadow-hard space-y-2">
            <p className="font-bold">Lost connection to the backend pipeline.</p>
            <p>Polling stopped after repeated retries. Check if the server is still running.</p>
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-white border-2 border-foreground px-3 py-1.5 text-xs font-bold text-foreground hover:bg-accent-yellow shadow-hard-active"
              >
                Retry Polling
              </button>
              <Link
                to="/dashboard"
                className="rounded-lg bg-white border-2 border-foreground px-3 py-1.5 text-xs font-bold text-foreground hover:bg-slate-100 shadow-hard-active"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}

        {!analysis && !error && (
          <div className="flex items-center justify-center gap-3 py-12 text-xs font-bold text-slate-500">
            <Loader2 size={18} className="animate-spin text-accent-violet" aria-hidden="true" strokeWidth={2.5} />
            Initializing pipeline stages and loading files…
          </div>
        )}

        {analysis && (
          <ol className="divide-y-2 divide-foreground/10" aria-live="polite" aria-label="Analysis pipeline progress">
            {analysis.stages.map((stage) => (
              <li key={stage.stage_key} className="py-3.5 first:pt-0 last:pb-0 transition-colors">
                <div className="flex items-center gap-3">
                  <StageIcon status={stage.status} />
                  <span
                    className={`flex-1 text-xs ${STATUS_TEXT[stage.status]}`}
                  >
                    {stage.stage_label}
                  </span>
                  {stage.duration_ms !== null && stage.status === "done" && (
                    <span className="text-[11px] font-mono font-extrabold text-slate-400">{stage.duration_ms} ms</span>
                  )}
                </div>
                {stage.detail && (
                  <p
                    className={`ml-8 mt-1 text-[11px] font-bold leading-relaxed ${
                      stage.status === "error" ? "text-accent-pink" : "text-slate-500"
                    }`}
                  >
                    {stage.detail}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}

        {finished && caseId && (
          <div className="pt-5 border-t-2 border-foreground/10 animate-rise-in">
            <Link to={`/cases/${caseId}`} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-sm font-black border-2 border-foreground shadow-hard bg-accent-mint text-foreground hover:bg-accent-yellow hover:shadow-hard-hover active:shadow-hard-active">
              <span>Inspect Full Evidence &amp; Dossier</span>
              <ArrowRight size={18} aria-hidden="true" strokeWidth={2.5} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
