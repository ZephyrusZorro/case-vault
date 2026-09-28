import { NavLink } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NAV_MAIN, NAV_SECONDARY, type NavItem } from "./navItems";

function NavButton({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const Icon = item.icon;

  const keyMap: Record<string, string> = {
    "Dashboard": "dashboard",
    "Screen Documents": "screen_documents",
    "Screening History": "screening_history",
    "Reports": "reports",
    "Analytics": "analytics",
    "User Management": "user_management",
    "Settings": "settings"
  };

  return (
    <NavLink
      to={item.to}
      title={item.label}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-150 lg:justify-start justify-center border-2 ${
          isActive
            ? "border-foreground bg-accent-mint text-slate-900 shadow-hard-active translate-x-1"
            : "border-transparent text-slate-500 hover:border-foreground hover:bg-white hover:text-foreground hover:shadow-hard"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={17}
            strokeWidth={2.5}
            aria-hidden="true"
            className={`shrink-0 transition-transform duration-150 group-hover:scale-110 ${
              isActive ? "text-slate-900" : "text-slate-400 group-hover:text-foreground"
            }`}
          />
          <span className="hidden lg:inline">{t(`sidebar.${keyMap[item.label]}`)}</span>
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="hidden h-screen w-16 shrink-0 flex-col border-r-2 border-foreground bg-cream md:flex lg:w-60 transition-all duration-200 z-10">
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 pb-4 pt-5 lg:px-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-accent-violet border-2 border-foreground shadow-hard">
          <ShieldCheck size={22} strokeWidth={2.5} className="text-white" aria-hidden="true" />
        </div>
        <div className="hidden min-w-0 lg:block">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black tracking-wider text-foreground">
              ID-SHIELD
            </span>
            <span className="rounded bg-accent-yellow px-1.5 py-0.5 text-[9px] font-black text-slate-900 border-2 border-foreground shadow-hard-active">
              v0.1
            </span>
          </div>
          <p className="text-[10px] font-extrabold tracking-tight text-slate-500">
            {t("sidebar.forensics_intelligence")}
          </p>
        </div>
      </div>

      <div className="mx-3 border-t-2 border-foreground/10 lg:mx-4" />

      {/* Navigation */}
      <nav
        aria-label="Primary"
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3 lg:px-3"
      >
        <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hidden lg:block">
          {t("sidebar.core_operations")}
        </div>
        {NAV_MAIN.map((item) => (
          <NavButton key={item.to} item={item} />
        ))}

        <div className="my-2 border-t-2 border-foreground/10" />

        <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hidden lg:block">
          {t("sidebar.platform_diagnostics")}
        </div>
        {NAV_SECONDARY.map((item) => (
          <NavButton key={item.to} item={item} />
        ))}
      </nav>

      {/* Footer / Verifier Profile */}
      <div className="border-t-2 border-foreground/10 p-2 lg:p-3">
        <div className="flex items-center justify-center gap-2.5 rounded-xl bg-white border-2 border-foreground shadow-hard p-1.5 lg:justify-start">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-accent-pink border-2 border-foreground text-xs font-black text-white shadow-hard-active">
            AV
          </div>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-xs font-black text-foreground">
              A. Verifier
            </p>
            <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-accent-mint border border-foreground animate-pulse" />
              Officer · Level 3
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
