import { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Clock, ShieldAlert, ShieldCheck, UserCheck, Loader2 } from "lucide-react";
import type { CaseDetail, CaseReviewRequest } from "../../types/api";

interface ReviewDispositionCardProps {
  caseData: CaseDetail;
  onReviewSubmitted?: () => void;
}

export function ReviewDispositionCard({ caseData, onReviewSubmitted }: ReviewDispositionCardProps) {
  const [decision, setDecision] = useState<"approved" | "rejected" | "needs_further_review">(
    (caseData.review_status as any) || "approved"
  );
  const [notes, setNotes] = useState(caseData.reviewer_notes || "");
  const [reviewerName, setReviewerName] = useState(caseData.reviewer_name || "Verification Officer");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(!caseData.review_status || caseData.review_status === "pending_review");

  const currentStatus = caseData.review_status || "pending_review";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload: CaseReviewRequest = {
      decision,
      notes: notes.trim(),
      reviewer_name: reviewerName.trim() || "Compliance Officer",
    };

    try {
      const res = await fetch(`/api/cases/${caseData.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Failed to submit review: ${res.status}`);
      }

      setSuccessMsg("Review decision recorded successfully in audit ledger.");
      setIsEditing(false);
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card p-6 border border-slate-200/90  space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100  pb-3">
        <div className="flex items-center gap-2">
          <UserCheck size={18} className="text-blue-600 " />
          <h3 className="text-sm font-bold text-slate-900 ">
            Human Verifier Disposition &amp; Audit Trail
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {currentStatus === "approved" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20  ">
              <ShieldCheck size={14} /> Officially Approved
            </span>
          ) : currentStatus === "rejected" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-rose-50 text-rose-700 ring-1 ring-rose-600/20  ">
              <ShieldAlert size={14} /> Application Rejected
            </span>
          ) : currentStatus === "needs_further_review" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-purple-50 text-purple-700 ring-1 ring-purple-600/20  ">
              <AlertCircle size={14} /> Escalated / Pending Info
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-600/20  ">
              <Clock size={14} /> Pending Officer Review
            </span>
          )}

          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="btn-secondary text-xs px-2.5 py-1"
            >
              Update Decision
            </button>
          )}
        </div>
      </div>

      {/* Review Details Display */}
      {!isEditing && caseData.reviewed_at && (
        <div className="rounded-xl bg-slate-50  p-4 border border-slate-100  space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between text-slate-500 ">
            <span>
              Reviewed by: <strong className="text-slate-800 ">{caseData.reviewer_name || "Verification Officer"}</strong>
            </span>
            <span>
              Decision Date: <strong className="text-slate-800 ">{new Date(caseData.reviewed_at).toLocaleString()}</strong>
            </span>
          </div>
          {caseData.reviewer_notes && (
            <div className="pt-2 border-t border-slate-200/60 ">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Officer Notes / Justification</p>
              <p className="mt-1 text-slate-700  leading-relaxed font-medium">
                {caseData.reviewer_notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Interactive Review Form */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600  mb-2">
              Select Final Compliance Decision
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDecision("approved")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  decision === "approved"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/30   "
                    : "border-slate-200  bg-white  text-slate-700  hover:border-slate-300"
                }`}
              >
                <CheckCircle2 size={16} className={decision === "approved" ? "text-emerald-600" : "text-slate-400"} />
                <span>Approve Identity</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision("rejected")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  decision === "rejected"
                    ? "border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-500/30   "
                    : "border-slate-200  bg-white  text-slate-700  hover:border-slate-300"
                }`}
              >
                <XCircle size={16} className={decision === "rejected" ? "text-rose-600" : "text-slate-400"} />
                <span>Reject / Flag Fraud</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision("needs_further_review")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  decision === "needs_further_review"
                    ? "border-purple-600 bg-purple-50 text-purple-800 ring-2 ring-purple-500/30   "
                    : "border-slate-200  bg-white  text-slate-700  hover:border-slate-300"
                }`}
              >
                <AlertCircle size={16} className={decision === "needs_further_review" ? "text-purple-600" : "text-slate-400"} />
                <span>Escalate / Request Info</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700  mb-1">
                Reviewer / Officer Name
              </label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="e.g. Officer R. Sharma (Fraud Analyst)"
                className="input-base text-xs w-full"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700  mb-1">
              Officer Rationale &amp; Audit Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain the technical basis for the decision (e.g., cross-document DOB confirmed, facial match verified above threshold, no forensic anomalies)..."
              rows={3}
              className="input-base text-xs w-full resize-y"
            />
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-rose-600  bg-rose-50  p-2.5 rounded-lg border border-rose-200 ">
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p className="text-xs font-bold text-emerald-600  bg-emerald-50  p-2.5 rounded-lg border border-emerald-200 ">
              {successMsg}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              <span>Commit Review Decision to Audit Trail</span>
            </button>
            {caseData.reviewed_at && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
