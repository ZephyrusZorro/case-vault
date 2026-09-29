import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, Lock, Mail, AlertCircle, Loader2, KeyRound, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface DemoAccount {
  label: string;
  role: string;
  email: string;
  pass: string;
  badge: string;
  dept: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "Administrator",
    role: "admin",
    email: "admin@ncrb.gov.in",
    pass: "Admin@12345",
    badge: "NCRB-ADMIN-01",
    dept: "Central IT & User Administration",
  },
  {
    label: "Investigator / Police Officer",
    role: "investigator",
    email: "investigator@ncrb.gov.in",
    pass: "Investigator@12345",
    badge: "DL-8842",
    dept: "Women Safety Division",
  },
  {
    label: "Reviewer / Supervisor",
    role: "reviewer",
    email: "supervisor@ncrb.gov.in",
    pass: "Supervisor@12345",
    badge: "DL-4019",
    dept: "Supervisory & Review Oversight Wing",
  },
  {
    label: "Legal Officer",
    role: "legal_officer",
    email: "legal@ncrb.gov.in",
    pass: "Legal@12345",
    badge: "BAR-DL-9921",
    dept: "Prosecution & Legal Directorate",
  },
  {
    label: "Auditor",
    role: "auditor",
    email: "auditor@ncrb.gov.in",
    pass: "Auditor@12345",
    badge: "AUD-108",
    dept: "Compliance & Audit Division",
  },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email address and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMessage(err?.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemo = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setErrorMessage(null);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-[#070B14] px-4 py-12 transition-colors duration-200">
      {/* Background radial gradient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-blue-600/10 dark:bg-blue-600/15 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[500px] rounded-full bg-indigo-600/10 dark:bg-indigo-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Emblem & Portal Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 shadow-glow-blue border border-blue-400/30">
            <ShieldCheck size={34} className="text-white" strokeWidth={2.3} />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Building2 size={13} />
            <span>Ministry of Home Affairs · NCRB</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Secure Digital DMS
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Legal &amp; Investigation Document Management System with Tamper-Evident Chain of Custody
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md p-6 sm:p-8 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 p-3.5 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 animate-fade-in"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />
                <p className="leading-snug">{errorMessage}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Official Personnel Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@ncrb.gov.in"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Security Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-xs font-bold shadow-glow-blue disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying Credentials &amp; Role...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={15} />
                    <span>Authenticate &amp; Access System</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 pt-1">
              Authorized personnel only. Access privileges are managed via RBAC by the Central Directorate.
            </p>
          </form>
        </div>

        {/* Demo Accounts Helper Card */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/40 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Demo Credentials (Pre-fill)
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
              Backend-Enforced RBAC
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug">
            Click any account to pre-fill credentials. The role is strictly retrieved from the database upon login.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleSelectDemo(acc)}
                className={`text-left p-2 rounded-lg border transition-all text-xs ${
                  email === acc.email
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/50 shadow-sm"
                    : "border-slate-200/70 dark:border-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">{acc.label}</span>
                  <span className="text-[9px] font-mono font-bold text-slate-400">{acc.badge}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{acc.email}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
