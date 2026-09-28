import { CheckCircle2, AlertTriangle, ShieldAlert, Clock, Loader2 } from "lucide-react";

export type BadgeKind =
  | "valid"
  | "under_review"
  | "high_risk"
  | "pending"
  | "processing";

const STYLES: Record<BadgeKind, string> = {
  valid:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20   ",
  under_review:
    "bg-amber-50 text-amber-700 ring-amber-600/25   ",
  high_risk:
    "bg-rose-50 text-rose-700 ring-rose-600/20   ",
  pending:
    "bg-slate-100 text-slate-600 ring-slate-500/20   ",
  processing:
    "bg-blue-50 text-blue-700 ring-blue-600/20   ",
};

const LABELS: Record<BadgeKind, string> = {
  valid: "Valid",
  under_review: "Review",
  high_risk: "High Risk",
  pending: "Pending",
  processing: "Processing",
};

const ICONS: Record<BadgeKind, typeof CheckCircle2> = {
  valid: CheckCircle2,
  under_review: AlertTriangle,
  high_risk: ShieldAlert,
  pending: Clock,
  processing: Loader2,
};

/** Status badge — never relies on color alone (icon + text included). */
export function StatusBadge({ status }: { status: BadgeKind }) {
  const Icon = ICONS[status] || Clock;
  const style = STYLES[status] || STYLES.pending;
  const label = LABELS[status] || "Pending";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset transition-colors duration-150 ${style}`}
    >
      <Icon size={12} aria-hidden="true" className={status === "processing" ? "animate-spin" : ""} />
      {label}
    </span>
  );
}

export function statusToBadge(status: string): BadgeKind {
  switch (status?.toLowerCase()) {
    case "valid":
    case "verification_passed":
      return "valid";
    case "under_review":
    case "review_recommended":
    case "review":
      return "under_review";
    case "high_risk":
    case "manual_review_required":
      return "high_risk";
    case "processing":
      return "processing";
    default:
      return "pending";
  }
}
