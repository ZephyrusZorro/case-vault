import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red" | "navy";
  hint?: string;
  loading?: boolean;
}

const TONES: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  blue: "bg-white border-2 border-foreground text-foreground shadow-hard-active",
  green: "bg-accent-mint border-2 border-foreground text-slate-900 shadow-hard-active",
  amber: "bg-accent-yellow border-2 border-foreground text-slate-900 shadow-hard-active",
  red: "bg-accent-pink border-2 border-foreground text-slate-900 shadow-hard-active",
  navy: "bg-accent-violet border-2 border-foreground text-white shadow-hard-active",
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "navy",
  hint,
  loading = false,
}: MetricCardProps) {
  return (
    <div className="card flex items-center gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${TONES[tone]}`}
      >
        <Icon size={22} strokeWidth={2} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-foreground/70">
          {label}
        </p>
        {loading ? (
          <div
            className="mt-2 h-7 w-20 animate-pulse rounded bg-foreground/10"
            aria-hidden="true"
          />
        ) : (
          <p className="text-2xl font-extrabold leading-tight text-foreground">{value}</p>
        )}
        {hint && !loading && (
          <p className="mt-0.5 truncate text-[11px] text-foreground/50 font-medium">{hint}</p>
        )}
      </div>
    </div>
  );
}

/** Row placeholder for tables while data loads. */
export function SkeletonRows({ rows = 4, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <tbody aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="divide-x-0 border-b border-slate-100 ">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-4">
              <div
                className="h-3.5 animate-pulse rounded bg-foreground/10"
                style={{ width: `${55 + ((r * 13 + c * 7) % 35)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
