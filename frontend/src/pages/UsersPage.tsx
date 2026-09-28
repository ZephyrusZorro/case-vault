import { PageHeader } from "../components/layout/PageHeader";
import { Shield, UserCheck, Key, Plus, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface VerifierUser {
  id: string;
  name: string;
  email: string;
  role: "Lead Forensic Officer" | "Compliance Auditor" | "Level 2 Analyst" | "System Admin";
  casesProcessed: number;
  status: "Active" | "Standby";
  lastActive: string;
}

const DEMO_USERS: VerifierUser[] = [
  {
    id: "usr-01",
    name: "Arjun Verifier",
    email: "arjun.verifier@idshield.gov",
    role: "Lead Forensic Officer",
    casesProcessed: 142,
    status: "Active",
    lastActive: "Just now",
  },
  {
    id: "usr-02",
    name: "Priya Sundaram",
    email: "priya.s@idshield.gov",
    role: "Compliance Auditor",
    casesProcessed: 89,
    status: "Active",
    lastActive: "15m ago",
  },
  {
    id: "usr-03",
    name: "Vikram Malhotra",
    email: "vikram.m@idshield.gov",
    role: "Level 2 Analyst",
    casesProcessed: 64,
    status: "Active",
    lastActive: "1h ago",
  },
  {
    id: "usr-04",
    name: "System Administrator",
    email: "admin@idshield.gov",
    role: "System Admin",
    casesProcessed: 210,
    status: "Active",
    lastActive: "Yesterday",
  },
];
export function UsersPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6 pb-12">
      <PageHeader
        title={t("users.title")}
        subtitle={t("users.subtitle")}
        actions={
          <button
            type="button"
            className="btn-primary  flex items-center gap-1.5 text-xs"
          >
            <Plus size={14} />
            <span>{t("users.add_user")}</span>
          </button>
        }
      />

      {/* Role Summary Badges */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50  text-blue-600 ">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 ">{t("users.active_verifiers")}</p>
            <p className="text-xl font-extrabold text-foreground ">4 {t("users.officers")}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50  text-emerald-600 ">
            <Shield size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 ">{t("users.role_policies")}</p>
            <p className="text-xl font-extrabold text-foreground ">{t("users.rbac_strict")}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50  text-purple-600 ">
            <Key size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 ">{t("users.audit_logging")}</p>
            <p className="text-xl font-extrabold text-foreground ">{t("users.immutable_ledger")}</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100  px-5 py-4 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground ">
            {t("users.directory")}
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">4 {t("users.accounts_registered")}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-slate-100  bg-slate-50/70  text-slate-500 ">
              <tr>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">{t("users.th_officer")}</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">{t("users.th_role")}</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">{t("users.th_dossiers")}</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">{t("users.th_security")}</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">{t("users.th_last_active")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 ">
              {DEMO_USERS.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70  transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-foreground ">{u.name}</div>
                    <div className="text-[11px] text-slate-400  font-mono">{u.email}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50  px-2 py-0.5 text-[11px] font-semibold text-blue-700  border border-blue-100 ">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-700 ">
                    {u.casesProcessed} {t("users.cases")}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 ">
                      <CheckCircle2 size={13} />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400  text-[11px]">
                    {u.lastActive}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
