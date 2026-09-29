import type { ReactNode } from "react";
import { X, FileText, Search } from "lucide-react";

export function fmtDate(value?: string | null, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", options ?? { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
export function fmtSize(bytes?: number | null): string {
  if (!bytes) return "0 B";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
export function label(value: string): string { return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase()); }
export function initials(value: string): string { return value.split(" ").filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join(""); }

export function Badge({ value, tone }: { value: string; tone?: "green" | "amber" | "red" | "blue" | "neutral" }) {
  const resolved = tone ?? ({ active: "green", approved: "green", verified: "green", closed: "blue", under_review: "amber", pending: "amber", restricted: "red", confidential: "amber", archived: "neutral", rejected: "red" } as Record<string, "green" | "amber" | "red" | "blue" | "neutral">)[value] ?? "neutral";
  return <span className={`badge badge-${resolved}`}><span className="badge-dot" />{label(value)}</span>;
}

export function Modal({ title, eyebrow, onClose, children, wide = false }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      {children}
    </div>
  </div>;
}

export function Empty({ title, description, action, icon = "file" }: { title: string; description: string; action?: ReactNode; icon?: "file" | "search" }) {
  return <div className="empty-state"><div className="empty-icon">{icon === "search" ? <Search size={24} /> : <FileText size={24} />}</div><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="heading-action">{action}</div>}</div>;
}

export function Loading({ label: text = "Loading workspace…" }: { label?: string }) { return <div className="loading"><span className="spinner" />{text}</div>; }
