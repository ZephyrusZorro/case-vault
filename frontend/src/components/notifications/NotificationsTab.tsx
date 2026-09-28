import { useState, useEffect } from "react";
import {
  MessageSquare,
  Mail,
  Smartphone,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Edit2,
  Check,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { apiGet, apiPatch } from "../../services/api";
import { NotificationModal } from "./NotificationModal";
import type { CaseDetail, NotificationOut } from "../../types/api";

interface NotificationsTabProps {
  caseId: string;
  caseData?: CaseDetail;
  onRefreshCase?: () => void;
}

export function NotificationsTab({
  caseId,
  caseData,
  onRefreshCase,
}: NotificationsTabProps) {
  const [notifications, setNotifications] = useState<NotificationOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Edit contact inline state
  const [editingContact, setEditingContact] = useState(false);
  const [name, setName] = useState(caseData?.applicant_name || "");
  const [phone, setPhone] = useState(caseData?.applicant_phone || "");
  const [email, setEmail] = useState(caseData?.applicant_email || "");
  const [autoNotify, setAutoNotify] = useState(caseData?.auto_notify_on_mismatch || false);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    setName(caseData?.applicant_name || "");
    setPhone(caseData?.applicant_phone || "");
    setEmail(caseData?.applicant_email || "");
    setAutoNotify(caseData?.auto_notify_on_mismatch || false);
  }, [caseData]);

  const loadNotifications = () => {
    setLoading(true);
    setError(null);
    apiGet<NotificationOut[]>(`/api/cases/${caseId}/notifications`)
      .then((data) => setNotifications(data))
      .catch((err) => setError(err.message || "Failed to load notification history."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotifications();
  }, [caseId]);

  const handleSaveContact = async () => {
    setSavingContact(true);
    try {
      await apiPatch(`/api/cases/${caseId}/applicant-contact`, {
        applicant_name: name.trim() || null,
        applicant_phone: phone.trim() || null,
        applicant_email: email.trim() || null,
        auto_notify_on_mismatch: autoNotify,
      });
      setEditingContact(false);
      if (onRefreshCase) onRefreshCase();
    } catch (err: any) {
      alert("Failed to update contact info: " + err.message);
    } finally {
      setSavingContact(false);
    }
  };

  const channelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return <MessageSquare size={16} className="text-emerald-600" />;
      case "email":
        return <Mail size={16} className="text-indigo-600" />;
      default:
        return <Smartphone size={16} className="text-blue-600" />;
    }
  };

  const channelBadge = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "email":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner / Contact Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <User size={18} className="text-blue-600" />
              Applicant Contact & Notification Routing
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage the person's phone/email to automatically or manually deliver discrepancy alerts.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {!editingContact ? (
              <button
                type="button"
                onClick={() => setEditingContact(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Edit2 size={13} /> Edit Contact Info
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Send size={13} /> Compose Discrepancy Notice
            </button>
          </div>
        </div>

        {/* Contact info display or inline editor */}
        {editingContact ? (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 border border-blue-100 rounded-xl p-4 bg-blue-50/30">
            <div>
              <label className="text-xs font-bold text-slate-600">Applicant Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Phone / WhatsApp Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. applicant@example.com"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={autoNotify}
                  onChange={(e) => setAutoNotify(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Auto-dispatch discrepancy alert if verification flags conflicts or elevated risk
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingContact(false)}
                  disabled={savingContact}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <X size={13} /> Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveContact}
                  disabled={savingContact}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingContact ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Save Details
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Applicant Name</span>
              <p className="mt-1 text-sm font-bold text-foreground truncate">
                {caseData?.applicant_name || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Phone / WhatsApp</span>
              <p className="mt-1 text-sm font-semibold text-foreground truncate">
                {caseData?.applicant_phone || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Address</span>
              <p className="mt-1 text-sm font-semibold text-foreground truncate">
                {caseData?.applicant_email || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Auto-Notify Mismatch</span>
              <p className="mt-1">
                {caseData?.auto_notify_on_mismatch ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={12} /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    Manual only
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dispatched Notification History */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Clock size={17} className="text-slate-400" />
            <h4 className="text-sm font-bold text-foreground">
              Notification Audit Trail ({notifications.length})
            </h4>
          </div>
          <button
            type="button"
            onClick={loadNotifications}
            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
            title="Refresh history"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin text-blue-600" /> Loading notification logs…
          </div>
        ) : error ? (
          <div className="my-4 rounded-xl bg-red-50 p-4 text-xs text-red-700">
            {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
              <MessageSquare size={22} />
            </div>
            <p className="text-sm font-bold text-foreground">No discrepancy notices sent yet</p>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              If an identity mismatch, face conflict, or tampering is detected, you can notify the person directly via SMS, WhatsApp, or Email to request clarification or replacement documents.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Send size={13} /> Compose Discrepancy Notice
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 transition-all hover:bg-slate-50 hover:border-slate-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold uppercase ${channelBadge(
                        n.channel
                      )}`}
                    >
                      {channelIcon(n.channel)}
                      {n.channel}
                    </span>

                    <span className="text-xs font-semibold text-foreground">
                      To: <strong className="text-blue-700">{n.recipient}</strong>
                    </span>

                    <span className="text-slate-300">·</span>

                    <span className="text-[11px] text-slate-400">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                      {n.trigger_type}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        n.status === "delivered"
                          ? "bg-emerald-50 text-emerald-700"
                          : n.status === "failed"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {n.status === "failed" ? (
                        <AlertTriangle size={12} />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}
                      {n.status === "simulated"
                        ? "Simulated Delivery"
                        : n.status === "failed"
                          ? "Delivery Failed"
                          : n.status}
                    </span>
                  </div>
                </div>

                {n.status === "failed" && n.provider_info?.note && (
                  <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                    <span className="font-bold">Error:</span> {n.provider_info.note}
                  </div>
                )}

                {n.subject && (
                  <p className="mt-2.5 text-xs font-bold text-foreground">
                    Subject: {n.subject}
                  </p>
                )}

                <div className="mt-2 rounded-lg bg-white p-3 border border-slate-200/80 text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {n.message}
                </div>

                {n.mismatch_fields && n.mismatch_fields.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Flagged Items:
                    </span>
                    {n.mismatch_fields.map((f) => (
                      <span
                        key={f}
                        className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
                      >
                        {f.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <NotificationModal
        caseId={caseId}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSent={(newNotif) => {
          setNotifications((prev) => [newNotif, ...prev]);
        }}
      />
    </div>
  );
}
