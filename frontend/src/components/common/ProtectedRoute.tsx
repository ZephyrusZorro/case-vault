import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#070B14]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Validating security credentials &amp; RBAC privileges...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user.role || "").toLowerCase();
    const isAllowed = userRole === "admin" || allowedRoles.map((r) => r.toLowerCase()).includes(userRole);

    if (!isAllowed) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 animate-fade-in text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-navy-900 dark:text-white">
            Restricted Access Zone
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
            Your assigned personnel role (<span className="font-bold text-navy-900 dark:text-white uppercase">{user.role}</span>) does not possess clearance for this module. Required roles: <span className="font-semibold">{allowedRoles.join(", ")}</span>.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="btn-secondary inline-flex items-center gap-1.5 text-xs"
            >
              <ArrowLeft size={14} />
              <span>Return to Previous Screen</span>
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
