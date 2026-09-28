import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight, ScanSearch, GitCompareArrows, FileSearch, Sparkles, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
export function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-cream text-foreground selection:bg-accent-yellow selection:text-foreground">
      {/* High-tech background glow orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-accent-pink/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[500px] rounded-full bg-accent-mint/20 blur-[100px]" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        {/* Badge */}
        <div className="animate-rise-in mb-6 inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-white shadow-hard px-3.5 py-1 text-xs font-bold text-foreground">
          <Sparkles size={14} className="text-accent-violet animate-pulse" strokeWidth={2.5} />
          <span>Next-Gen Multi-Modal Forensic Screening · SIH 2026</span>
        </div>

        {/* Logo mark */}
        <div className="animate-rise-in mb-8">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[20px] bg-accent-violet border-2 border-foreground shadow-hard">
            <ShieldCheck size={52} strokeWidth={2.5} className="text-white" aria-hidden="true" />
          </div>
        </div>

        <h1 className="animate-rise-in text-5xl sm:text-7xl font-black tracking-tight [animation-delay:100ms] text-foreground">
          {t("landing.hero_title").split(" ")[0]} <br className="sm:hidden" /> {t("landing.hero_title").split(" ").slice(1).join(" ")}
        </h1>
        <p className="animate-rise-in mt-3 text-lg sm:text-2xl font-black text-accent-violet [animation-delay:180ms] tracking-wide">
          {t("landing.hero_subtitle")}
        </p>
        <p className="animate-rise-in mx-auto mt-6 max-w-2xl text-sm sm:text-base font-bold leading-relaxed text-slate-500 [animation-delay:260ms]">
          Comprehensive 11-stage automated screening evaluating ICAO MRZ checksums, Error Level Analysis (ELA), visual tampering heatmaps, facial biometrics, and cross-document discrepancy detection.
        </p>

        {/* Workflow chips */}
        <div className="animate-rise-in mt-10 flex flex-wrap items-center justify-center gap-4 [animation-delay:340ms]">
          {[
            { icon: ScanSearch, label: "Extract & Deskew" },
            { icon: Layers, label: "Forensic Heatmaps" },
            { icon: GitCompareArrows, label: "Cross-Doc Consistency" },
            { icon: FileSearch, label: "Explainable Risk Scoring" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-xl border-2 border-foreground bg-white shadow-hard px-3.5 py-2 text-xs font-bold text-foreground transition-transform hover:-translate-y-1 hover:shadow-hard-hover">
              <Icon size={16} strokeWidth={2.5} className="text-accent-pink" aria-hidden="true" />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="btn-primary animate-rise-in mt-12 px-8 py-3.5 text-base font-black [animation-delay:420ms] flex items-center gap-2 border-2 border-foreground shadow-hard bg-accent-mint text-foreground hover:bg-accent-yellow hover:shadow-hard-hover active:shadow-hard-active"
        >
          <span>{t("landing.get_started")}</span>
          <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      <footer className="relative z-10 border-t-2 border-foreground/10 bg-cream/80 backdrop-blur-md px-6 py-4">
        <p className="text-center text-[11px] font-bold text-slate-500">
          Smart India Hackathon 2026 · Team HackHive · Production Prototype for Assisted Identity Verification
        </p>
      </footer>
    </div>
  );
}
