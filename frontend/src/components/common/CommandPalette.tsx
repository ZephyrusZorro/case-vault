import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  LayoutDashboard,
  History,
  FileText,
  BarChart3,
  Users,
  Settings,
  Sun,
  Moon,
  Sparkles,
  ArrowRight,
  X,
  FileCheck2,
  Loader2,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { apiGet, apiPost } from "../../services/api";
import type { HistoryItem, CaseCreated } from "../../types/api";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<HistoryItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search cases when query is entered
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiGet<HistoryItem[]>(`/api/cases?search=${encodeURIComponent(query.trim())}&limit=5`);
        setSearchResults(data.slice(0, 5));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const defaultActions = [
    {
      id: "new-case",
      title: "Screen New Document",
      subtitle: "Create verification case and upload evidence",
      icon: Plus,
      action: () => {
        navigate("/screen/new");
        onClose();
      },
    },
    {
      id: "demo-case",
      title: "Load Demo Case",
      subtitle: "Launch instant synthetic 11-stage forensic screening",
      icon: Sparkles,
      action: async () => {
        setLoadingDemo(true);
        try {
          const res = await apiPost<CaseCreated>("/api/demo/signature-case");
          navigate(`/screen/processing/${res.id}`);
          onClose();
        } catch (e) {
          alert("Could not load demo case.");
        } finally {
          setLoadingDemo(false);
        }
      },
    },
    {
      id: "dashboard",
      title: "Go to Dashboard",
      subtitle: "Screening telemetry & recent operations overview",
      icon: LayoutDashboard,
      action: () => {
        navigate("/dashboard");
        onClose();
      },
    },
    {
      id: "history",
      title: "Screening History",
      subtitle: "Browse previously processed cases",
      icon: History,
      action: () => {
        navigate("/history");
        onClose();
      },
    },
    {
      id: "reports",
      title: "Verification Reports",
      subtitle: "Forensic dossiers and compliance records",
      icon: FileText,
      action: () => {
        navigate("/reports");
        onClose();
      },
    },
    {
      id: "analytics",
      title: "Forensic Analytics",
      subtitle: "Risk distribution, tampering trends, and KPI statistics",
      icon: BarChart3,
      action: () => {
        navigate("/analytics");
        onClose();
      },
    },
    {
      id: "users",
      title: "User Management",
      subtitle: "Authorized verifier directory and RBAC permissions",
      icon: Users,
      action: () => {
        navigate("/users");
        onClose();
      },
    },
    {
      id: "settings",
      title: "Platform Diagnostics",
      subtitle: "Pipeline module status and security calibration",
      icon: Settings,
      action: () => {
        navigate("/settings");
        onClose();
      },
    },
    {
      id: "theme-toggle",
      title: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      subtitle: `Current active theme: ${theme}`,
      icon: theme === "dark" ? Sun : Moon,
      action: () => {
        toggleTheme();
        onClose();
      },
    },
  ];

  const filteredActions = query.trim()
    ? defaultActions.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : defaultActions;

  const totalItems = searchResults.length + filteredActions.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex < searchResults.length) {
        const item = searchResults[selectedIndex];
        navigate(`/cases/${item.id}`);
        onClose();
      } else {
        const actionIdx = selectedIndex - searchResults.length;
        if (filteredActions[actionIdx]) {
          filteredActions[actionIdx].action();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 backdrop-blur-sm bg-foreground/40 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border-2 border-foreground bg-white shadow-hard animate-rise-in text-foreground"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input header */}
        <div className="flex items-center gap-3 border-b-2 border-foreground/10 px-4 py-3.5">
          <Search size={18} className="text-foreground shrink-0" strokeWidth={2.5} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search cases, applicants, reports..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm font-extrabold outline-none placeholder:text-slate-400 text-foreground"
          />
          {searching ? (
            <Loader2 size={16} className="animate-spin text-accent-violet shrink-0" strokeWidth={2.5} />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-slate-400 hover:text-foreground"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border-2 border-foreground bg-white px-1.5 py-0.5 text-[10px] font-mono font-extrabold text-foreground shadow-hard-active">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1 text-xs">
          {/* Direct Matching Cases */}
          {searchResults.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Matching Cases
              </div>
              {searchResults.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigate(`/cases/${item.id}`);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-all border-2 ${
                      isSelected
                        ? "bg-accent-violet text-white border-foreground shadow-hard-active"
                        : "text-foreground border-transparent hover:bg-accent-yellow hover:border-foreground hover:shadow-hard"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCheck2 size={16} className={isSelected ? "text-white" : "text-foreground"} strokeWidth={2.5} />
                      <div className="truncate">
                        <p className="font-extrabold text-xs">
                          #{item.case_number} · {item.person_name || item.case_name}
                        </p>
                        <p className={`text-[11px] truncate ${isSelected ? "text-white/90" : "text-slate-500 font-bold"}`}>
                          {item.case_name} · {item.document_count} documents
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={14} className={isSelected ? "text-white" : "text-foreground"} strokeWidth={2.5} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Actions & Navigation */}
          {filteredActions.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Quick Navigation &amp; Tools
              </div>
              {filteredActions.map((action, aIdx) => {
                const globalIdx = searchResults.length + aIdx;
                const isSelected = selectedIndex === globalIdx;
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.action}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    disabled={loadingDemo && action.id === "demo-case"}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-all border-2 ${
                      isSelected
                        ? "bg-accent-violet text-white border-foreground shadow-hard-active"
                        : "text-foreground border-transparent hover:bg-accent-yellow hover:border-foreground hover:shadow-hard"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isSelected ? "bg-white/20 text-white border-2 border-white/40" : "bg-white border-2 border-foreground text-foreground shadow-hard-active"}`}>
                        <Icon size={15} strokeWidth={2.5} />
                      </div>
                      <div className="truncate">
                        <p className="font-extrabold text-xs">{action.title}</p>
                        <p className={`text-[11px] truncate ${isSelected ? "text-white/90" : "text-slate-500 font-bold"}`}>
                          {action.subtitle}
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={14} className={isSelected ? "text-white" : "text-foreground"} strokeWidth={2.5} />
                  </button>
                );
              })}
            </div>
          )}

          {totalItems === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 ">
              No matching commands or cases found.
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t-2 border-foreground/10 bg-slate-50 px-4 py-2 text-[11px] font-bold text-slate-500">
          <div className="flex items-center gap-2">
            <span>Navigate:</span>
            <kbd className="rounded border-2 border-foreground bg-white px-1.5 font-mono font-extrabold text-foreground shadow-hard-active">↑</kbd>
            <kbd className="rounded border-2 border-foreground bg-white px-1.5 font-mono font-extrabold text-foreground shadow-hard-active">↓</kbd>
          </div>
          <div className="flex items-center gap-2">
            <span>Select:</span>
            <kbd className="rounded border-2 border-foreground bg-white px-1.5 font-mono font-extrabold text-foreground shadow-hard-active">ENTER</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
