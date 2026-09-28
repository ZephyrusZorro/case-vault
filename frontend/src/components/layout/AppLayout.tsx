import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ApiStatus } from "./ApiStatus";
import { MobileDrawer } from "./MobileDrawer";
import { CalendarDays, Menu, ShieldCheck, Search, Command, Sun, Moon, Bell, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import { CommandPalette } from "../common/CommandPalette";
import { VoiceAssistantWidget } from "../common/VoiceAssistantWidget";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Identity screening operations & risk telemetry",
  },
  "/screen/new": {
    title: "Screen Documents",
    subtitle: "Create a case and upload identity evidence",
  },
  "/history": {
    title: "Screening History",
    subtitle: "Previously processed verification cases",
  },
  "/reports": {
    title: "Verification Reports",
    subtitle: "Compliance dossiers and audit logs",
  },
  "/analytics": {
    title: "Forensic Analytics",
    subtitle: "Tampering trends and risk factor distribution",
  },
  "/users": {
    title: "User Management",
    subtitle: "Verifier accounts and security roles",
  },
  "/settings": {
    title: "Platform Diagnostics",
    subtitle: "Pipeline calibration & forensic engine status",
  },
};

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AppLayout() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.dir();
  }, [i18n, i18n.language]);

  const base = "/" + location.pathname.split("/").filter(Boolean)[0];
  const meta =
    PAGE_META[base] ??
    (location.pathname.startsWith("/cases")
      ? { title: "Case Dossier", subtitle: "Forensic evidence and multi-modal analysis workspace" }
      : location.pathname.startsWith("/screen/processing")
        ? { title: "Document Pipeline", subtitle: "Live 11-stage forensic screening progress" }
        : { title: "ID-SHIELD", subtitle: "Identity & Document Forensics" });

  // Global keyboard shortcut for Command Palette (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-cream text-foreground transition-colors duration-200">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          {t("layout.skip_content")}
        </a>
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b-2 border-foreground bg-white px-4 sm:px-6 transition-colors duration-200">
          <div className="flex min-w-0 items-center gap-3">
            {/* Mobile menu */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg p-2 text-foreground transition-colors hover:bg-slate-100 md:hidden"
            >
              <Menu size={22} aria-hidden="true" strokeWidth={2.5} />
            </button>
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent-violet border-2 border-foreground shadow-hard">
                <ShieldCheck size={18} className="text-white" aria-hidden="true" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-extrabold tracking-wide text-foreground">ID-SHIELD</span>
            </div>
            <div className="hidden min-w-0 md:block">
              <h1 className="truncate text-base font-extrabold leading-tight text-foreground">
                {t(meta.title) !== meta.title ? t(meta.title) : meta.title}
              </h1>
              <p className="truncate text-xs text-slate-500 font-bold">{t(meta.subtitle) !== meta.subtitle ? t(meta.subtitle) : meta.subtitle}</p>
            </div>
          </div>

          {/* Center / Right: Quick Search Button & Actions */}
          <div className="flex shrink-0 items-center gap-2.5">
            {/* Command Palette Trigger Button */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-full border-2 border-foreground bg-white px-4 py-1.5 text-xs text-foreground transition-all hover:bg-accent-yellow hover:shadow-hard font-bold"
              title="Search commands and cases (Ctrl + K)"
            >
              <Search size={14} className="text-foreground" strokeWidth={2.5} />
              <span>{t("layout.quick_search")}</span>
              <kbd className="inline-flex items-center gap-0.5 rounded border-2 border-foreground bg-white px-1.5 py-0.5 text-[10px] font-mono font-extrabold text-foreground ml-2">
                <Command size={10} strokeWidth={2.5} /> K
              </kbd>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle theme"
              className="group relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-foreground bg-white text-foreground transition-all duration-200 hover:bg-accent-yellow hover:text-foreground hover:shadow-hard"
            >
              {theme === "dark" ? (
                <Sun size={17} className="transition-transform duration-300 group-hover:rotate-45" strokeWidth={2.5} aria-hidden="true" />
              ) : (
                <Moon size={17} className="transition-transform duration-300 group-hover:rotate-12" strokeWidth={2.5} aria-hidden="true" />
              )}
            </button>

            {/* Language Switcher */}
            <div className="relative hidden sm:flex items-center justify-center rounded-full border-2 border-foreground bg-white text-foreground transition-all duration-200 hover:bg-accent-mint hover:text-slate-900 hover:shadow-hard group">
              <Globe size={17} className="absolute left-2 pointer-events-none text-inherit" strokeWidth={2.5} aria-hidden="true" />
              <select
                value={i18n.language.substring(0, 2)}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="appearance-none bg-transparent pl-8 pr-3 h-9 text-xs font-bold focus:outline-none cursor-pointer"
                title="Change Language"
              >
                <option value="en">EN</option>
                <option value="hi">HI</option>
                <option value="ar">AR</option>
                <option value="fr">FR</option>
              </select>
            </div>

            {/* Notifications Button */}
            <button
              type="button"
              title="Notifications"
              aria-label="Notifications"
              className="group relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-foreground bg-white text-foreground transition-all duration-200 hover:bg-accent-pink hover:text-foreground hover:shadow-hard"
            >
              <Bell size={17} className="transition-transform duration-300 group-hover:rotate-12" strokeWidth={2.5} aria-hidden="true" />
              {/* Notification Badge */}
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-foreground bg-accent-yellow text-[8px] font-black text-foreground">
                3
              </span>
            </button>

            {/* Date Pill */}
            <div className="hidden items-center gap-2 rounded-full border-2 border-foreground bg-white px-4 py-1.5 lg:flex font-bold">
              <CalendarDays size={14} className="text-foreground" aria-hidden="true" strokeWidth={2.5} />
              <span className="text-xs text-foreground">
                {formatDate(new Date())}
              </span>
            </div>

            <ApiStatus />
          </div>
        </header>

        <main
          id="main-content"
          className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6"
        >
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>

        <footer className="shrink-0 border-t-2 border-foreground bg-white px-4 py-3 sm:px-6 transition-colors duration-200">
          <p className="text-center text-[11px] leading-relaxed text-slate-500 font-bold">
            {t("layout.footer")}
          </p>
        </footer>
      </div>

      <VoiceAssistantWidget />
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
