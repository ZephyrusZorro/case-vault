import { useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Shield, UserCheck, Key, Plus, CheckCircle2, XCircle, AlertCircle, Loader2, X, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useApi } from "../hooks/useApi";
import { apiPost, apiPatch } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: string;
  badge_number?: string | null;
  department?: string | null;
  is_active: boolean;
  created_at?: string | null;
  last_login?: string | null;
}

const ROLE_BADGES: Record<string, { label: string; tone: string }> = {
  admin: { label: "Administrator", tone: "bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  investigator: { label: "Investigator / Police Officer", tone: "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  reviewer: { label: "Reviewer / Supervisor", tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  legal_officer: { label: "Legal Officer", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  auditor: { label: "Compliance Auditor", tone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700" },
};

export function UsersPage() {
  const { t } = useTranslation();
  const { user: currentUser, isAdmin } = useAuth();
  const { data: users, loading, error, reload } = useApi<BackendUser[]>("/api/users");

  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("investigator");
  const [formBadge, setFormBadge] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setFormSubmitting(true);
    setFormError(null);

    try {
      await apiPost("/api/users", {
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword,
        role: formRole,
        badge_number: formBadge.trim() || undefined,
        department: formDepartment.trim() || undefined,
      });
      setModalOpen(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormBadge("");
      setFormDepartment("");
      reload();
    } catch (err: any) {
      setFormError(err?.message || "Failed to provision personnel account.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (u: BackendUser) => {
    if (!isAdmin || u.id === currentUser?.id) return;
    try {
      await apiPatch(`/api/users/${u.id}`, { is_active: !u.is_active });
      reload();
    } catch (err: any) {
      alert(err?.message || "Failed to update account status.");
    }
  };

  const activeCount = users?.filter((u) => u.is_active).length ?? 0;

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6 pb-12">
      <PageHeader
        title={t("users.title")}
        subtitle="Personnel credentials, RBAC security privileges, and audit clearances"
        actions={
          isAdmin ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="btn-primary flex items-center gap-1.5 text-xs shadow-glow-blue"
            >
              <Plus size={14} />
              <span>Provision Personnel</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
              Read-Only Directory
            </span>
          )
        }
      />

      {/* Role Summary Badges */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Accounts</p>
            <p className="text-xl font-extrabold text-foreground">{loading ? "..." : `${activeCount} Officers`}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
            <Shield size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role Policies</p>
            <p className="text-xl font-extrabold text-foreground">Backend RBAC Strict</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400">
            <Key size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role Enforcement</p>
            <p className="text-xl font-extrabold text-foreground">Admin-Assigned Only</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Authorized Personnel Directory
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            {users?.length ?? 0} Accounts Enrolled
          </span>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-500">
            <Loader2 size={16} className="animate-spin text-blue-500" />
            <span>Loading personnel directory...</span>
          </div>
        )}

        {error && (
          <div className="p-4 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/50">
            {error}
          </div>
        )}

        {!loading && !error && users && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Officer</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Assigned Role</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Badge / Department</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Last Login</th>
                  {isAdmin && <th className="px-4 py-3 text-right font-bold uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {users.map((u) => {
                  const roleConfig = ROLE_BADGES[u.role] || { label: u.role, tone: "bg-slate-100 text-slate-700" };
                  const isSelf = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isSelf && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${roleConfig.tone}`}>
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-foreground">
                          {u.badge_number || "—"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {u.department || "General Directorate"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={13} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                            <XCircle size={13} />
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                        {u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3.5 text-right">
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              className={`text-[11px] font-bold px-2 py-1 rounded transition-colors ${
                                u.is_active
                                  ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              }`}
                            >
                              {u.is_active ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision Personnel Modal (Admin Only) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="card w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Provision Personnel Account</h3>
                <p className="text-[11px] text-slate-400">Assign official credentials and RBAC security role</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 p-3 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name &amp; Designation
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Sub-Inspector Meena Rathore"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="m.rathore@ncrb.gov.in"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Security Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Security Role (Admin Authority)
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
                >
                  <option value="investigator">Investigator / Police Officer (Case management &amp; evidence registration)</option>
                  <option value="reviewer">Reviewer / Supervisor (Disposition review &amp; integrity verification)</option>
                  <option value="legal_officer">Legal Officer (Filings, chargesheets &amp; prosecution review)</option>
                  <option value="auditor">Auditor (Independent read-only audit log &amp; chain of custody)</option>
                  <option value="admin">Administrator (Full IT provisioning &amp; role management)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  *Roles are strictly enforced on all backend APIs and cannot be modified by the user.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Badge Number / ID
                  </label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="e.g. DL-5520"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department / Division
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="e.g. Women Safety Division"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn-primary flex items-center gap-1.5 text-xs shadow-glow-blue"
                >
                  {formSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
                  <span>Provision Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
