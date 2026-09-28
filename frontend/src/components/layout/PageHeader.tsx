import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Inbox size={22} className="text-slate-400" aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
