import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  Shield,
  FileCheck,
  Scale,
  Send,
  RotateCcw,
  Archive,
  Lock,
  Loader2,
  History,
  Hash,
  UserCheck,
} from "lucide-react";
import { apiGet, apiPost } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import type { CaseDetail, WorkflowHistoryItem } from "../../types/api";

interface WorkflowPanelProps {
  caseData: CaseDetail;
  onWorkflowUpdated: () => void;
}

const STAGES = [
  { id: "open", label: "Registered / Open", icon: Clock },
  { id: "under_investigation", label: "Forensic Investigation", icon: Shield },
  { id: "pending_review", label: "Supervisor Review", icon: UserCheck },
  { id: "pending_legal_review", label: "Legal Compliance", icon: Scale },
  { id: "court_ready", label: "Court Ready (BSA 65B)", icon: FileCheck },
  { id: "closed", label: "Closed / Archived", icon: Archive },
];

export function WorkflowPanel({ caseData, onWorkflowUpdated }: WorkflowPanelProps) {
  const { user } = useAuth();
  const [history, setHistory] = useState<WorkflowHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const currentRole = user?.role || "investigator";
  const status = caseData.status;

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const data = await apiGet<WorkflowHistoryItem[]>(
        `/api/cases/${caseData.id}/workflow/history`
      );
      setHistory(data);
    } catch {
      // silently fail history fetch
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [caseData.id, caseData.status]);

  const getStageIndex = (st: string) => {
    if (st === "archived") return 5;
    const idx = STAGES.findIndex((s) => s.id === st);
    return idx >= 0 ? idx : 0;
  };

  const currentStageIdx = getStageIndex(status);

  // Determine permitted actions based on case status and user role
  const availableActions: {
    action: string;
    label: string;
    icon: any;
    tone: "primary" | "warning" | "danger" | "success";
    requiresRemarks?: boolean;
  }[] = [];

  const isAdmin = currentRole === "admin";
  const isInvestigator = currentRole === "investigator" || isAdmin;
  const isSupervisor = currentRole === "supervisor" || isAdmin;
  const isLegal = currentRole === "legal_officer" || isAdmin;

  if (["open", "under_investigation"].includes(status) && isInvestigator) {
    availableActions.push({
      action: "submit_for_review",
      label: "Submit to Supervisor for Review",
      icon: Send,
      tone: "primary",
    });
  }

  if (status === "pending_review" && isSupervisor) {
    availableActions.push({
      action: "supervisor_approve",
      label: "Approve & Forward to Legal Review",
      icon: CheckCircle2,
      tone: "success",
    });
    availableActions.push({
      action: "supervisor_reject",
      label: "Reject — Return to Investigator",
      icon: RotateCcw,
      tone: "warning",
      requiresRemarks: true,
    });
  }

  if (status === "pending_legal_review" && (isLegal || isSupervisor)) {
    availableActions.push({
      action: "legal_approve",
      label: "Legal Sign-off: Mark Court Ready",
      icon: FileCheck,
      tone: "success",
    });
    availableActions.push({
      action: "legal_reject",
      label: "Reject — Return to Supervisor",
      icon: RotateCcw,
      tone: "warning",
      requiresRemarks: true,
    });
  }

  if (["court_ready", "closed", "archived"].includes(status) && (isSupervisor || isAdmin)) {
    availableActions.push({
      action: "reopen",
      label: "Reopen Case for Investigation",
      icon: RotateCcw,
      tone: "warning",
      requiresRemarks: true,
    });
  }

  if (!["closed", "archived"].includes(status) && (isSupervisor || isLegal || isAdmin)) {
    availableActions.push({
      action: "close",
      label: "Close Investigation Dossier",
      icon: Lock,
      tone: "danger",
      requiresRemarks: true,
    });
  }

  const handleExecuteAction = async () => {
    if (!selectedAction) return;
    try {
      setActionPending(true);
      setErrorMsg(null);
      await apiPost(`/api/cases/${caseData.id}/workflow`, {
        action: selectedAction,
        remarks: remarks.trim() || undefined,
      });
      setRemarks("");
      setSelectedAction(null);
      onWorkflowUpdated();
      loadHistory();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to advance workflow.");
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-foreground bg-white p-5 shadow-hard space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-yellow border-2 border-foreground shadow-hard-active font-mono text-xs font-black">
              WF
            </span>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              NCRB Evidentiary Approval Chain
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Multi-tier statutory verification workflow under Bharatiya Sakshya Adhiniyam / Section 65B
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-foreground bg-slate-50 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-slate-100 transition-colors shadow-hard-active active:translate-y-0.5"
          >
            <History size={13} />
            <span>Workflow History ({history.length})</span>
          </button>
        </div>
      </div>

      {/* Stepper Pipeline */}
      <div className="relative">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {STAGES.map((st, i) => {
            const Icon = st.icon;
            const isPassed = i < currentStageIdx;
            const isCurrent = i === currentStageIdx;

            return (
              <div
                key={st.id}
                className={`relative flex flex-col justify-between rounded-xl border-2 p-3 transition-all ${
                  isCurrent
                    ? "border-foreground bg-accent-yellow shadow-hard font-black scale-[1.02] z-10"
                    : isPassed
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                      : "border-slate-200 bg-slate-50 text-slate-400 font-medium"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${isCurrent ? "text-foreground" : isPassed ? "text-emerald-700" : "text-slate-400"}`}>
                    Phase 0{i + 1}
                  </span>
                  {isPassed ? (
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                  ) : null}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <Icon size={14} className="shrink-0" />
                  <span className="text-xs leading-tight">{st.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Disposition & Action Tray */}
      <div className="rounded-xl border-2 border-slate-200 bg-slate-50/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Active Stage:
            </span>
            <span className="rounded-md border-2 border-foreground bg-white px-2.5 py-0.5 text-xs font-black uppercase text-foreground shadow-hard-active">
              {status.replace(/_/g, " ")}
            </span>
            {caseData.reviewer_name && (
              <span className="text-xs text-slate-600">
                • Last reviewed by <strong className="text-foreground">{caseData.reviewer_name}</strong>
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Your Role Clearance: <strong className="text-foreground capitalize">{currentRole.replace(/_/g, " ")}</strong>
          </div>
        </div>

        {caseData.reviewer_notes && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <span className="font-bold text-slate-900">Reviewer Notes: </span>
            {caseData.reviewer_notes}
          </div>
        )}

        {/* Action Trigger Buttons */}
        {availableActions.length > 0 ? (
          <div className="pt-2">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Statutory Next Steps Available:
            </p>
            <div className="flex flex-wrap gap-2">
              {availableActions.map((act) => {
                const ActIcon = act.icon;
                const isSelected = selectedAction === act.action;
                const btnTone =
                  act.tone === "success"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : act.tone === "warning"
                      ? "bg-amber-500 text-slate-950 hover:bg-amber-600"
                      : act.tone === "danger"
                        ? "bg-rose-600 text-white hover:bg-rose-700"
                        : "bg-blue-600 text-white hover:bg-blue-700";

                return (
                  <button
                    key={act.action}
                    type="button"
                    onClick={() => {
                      setSelectedAction(isSelected ? null : act.action);
                      setErrorMsg(null);
                    }}
                    className={`inline-flex items-center gap-2 rounded-xl border-2 border-foreground px-4 py-2 text-xs font-black shadow-hard-active transition-all active:translate-y-0.5 ${btnTone} ${
                      isSelected ? "ring-2 ring-offset-2 ring-foreground scale-105" : ""
                    }`}
                  >
                    <ActIcon size={14} />
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-white p-3 text-xs text-slate-500 border border-slate-200 flex items-center gap-2">
            <Clock size={14} className="text-slate-400 shrink-0" />
            <span>
              No pending approval actions required for role <strong className="text-foreground capitalize">{currentRole.replace(/_/g, " ")}</strong> at this stage. Case status is <strong>{status.replace(/_/g, " ")}</strong>.
            </span>
          </div>
        )}

        {/* Action Confirmation Modal / Drawer */}
        {selectedAction && (
          <div className="mt-3 rounded-xl border-2 border-foreground bg-white p-4 shadow-hard space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-black uppercase text-foreground flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600" />
                Confirm Transition: {availableActions.find((a) => a.action === selectedAction)?.label}
              </h4>
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                className="text-xs font-bold text-slate-400 hover:text-foreground"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Official Case Remarks / Justification Notes:
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Enter statutory remarks, legal reference, forensic observations, or reasons for decision..."
                className="w-full rounded-lg border-2 border-slate-300 p-2.5 text-xs text-foreground focus:border-foreground focus:outline-none"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                {errorMsg}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                className="btn-secondary text-xs"
              >
                Abort
              </button>
              <button
                type="button"
                disabled={actionPending}
                onClick={handleExecuteAction}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                {actionPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Anchoring to Audit Chain…</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Sign &amp; Advance Workflow</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History Drawer */}
      {showHistory && (
        <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-black uppercase text-foreground flex items-center gap-2">
              <History size={14} className="text-slate-500" />
              Cryptographic Workflow Transition Audit Trail
            </h4>
            <span className="text-[10px] font-mono text-slate-500">
              SHA-256 Chained Ledger
            </span>
          </div>

          {historyLoading ? (
            <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin text-blue-600" />
              <span>Verifying workflow blocks…</span>
            </div>
          ) : history.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              No workflow transitions recorded for this case yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-xs space-y-1.5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-700">
                        #{item.sequence}
                      </span>
                      <strong className="text-foreground">
                        {item.details?.label || item.action}
                      </strong>
                    </div>
                    <span className="text-slate-400 font-mono">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString("en-IN") : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <div>
                      <span>Officer: </span>
                      <strong className="text-slate-800">
                        {item.user_name || item.details?.officer || "Officer"}
                      </strong>
                      <span className="text-slate-500"> ({item.user_role || "investigator"})</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Hash size={10} />
                      <span>Block: {item.hash_prefix}…</span>
                    </div>
                  </div>

                  {item.details?.remarks && (
                    <p className="text-[11px] italic text-slate-600 bg-slate-50 p-2 rounded mt-1">
                      "{item.details.remarks}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
