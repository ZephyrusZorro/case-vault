import { useState, useEffect } from "react";
import {
  X,
  Send,
  MessageSquare,
  Mail,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";
import { apiGet, apiPost } from "../../services/api";
import type {
  NotificationPreviewResponse,
  NotificationSendRequest,
  NotificationOut,
} from "../../types/api";

interface NotificationModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onSent?: (notification: NotificationOut) => void;
}

type ChannelType = "sms" | "whatsapp" | "email";

export function NotificationModal({
  caseId,
  isOpen,
  onClose,
  onSent,
}: NotificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<NotificationPreviewResponse | null>(null);
  const [channel, setChannel] = useState<ChannelType>("sms");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lastResult, setLastResult] = useState<NotificationOut | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSuccess(false);
      setError(null);
      setLastResult(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    apiGet<NotificationPreviewResponse>(`/api/cases/${caseId}/notifications/preview`)
      .then((data) => {
        if (!isMounted) return;
        setPreview(data);
        setSubject(data.suggested_subject);

        // Pick initial channel & recipient based on available info
        if (data.applicant_phone) {
          setChannel("sms");
          setRecipient(data.applicant_phone);
          setMessage(data.sms_preview);
        } else if (data.applicant_email) {
          setChannel("email");
          setRecipient(data.applicant_email);
          setMessage(data.email_preview);
        } else {
          setChannel("sms");
          setRecipient("");
          setMessage(data.sms_preview);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load notification preview.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [caseId, isOpen]);

  // When switching channels, update message template & recipient if appropriate
  const handleChannelChange = (newChannel: ChannelType) => {
    setChannel(newChannel);
    setError(null);
    if (!preview) return;

    if (newChannel === "sms") {
      setMessage(preview.sms_preview);
      if (preview.applicant_phone) setRecipient(preview.applicant_phone);
    } else if (newChannel === "whatsapp") {
      setMessage(preview.whatsapp_preview);
      if (preview.applicant_phone) setRecipient(preview.applicant_phone);
    } else if (newChannel === "email") {
      setMessage(preview.email_preview);
      if (preview.applicant_email) setRecipient(preview.applicant_email);
    }
  };

  const handleSend = async () => {
    if (!recipient.trim()) {
      setError("Please provide a recipient phone number or email.");
      return;
    }
    if (!message.trim()) {
      setError("Message body cannot be empty.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const payload: NotificationSendRequest = {
        channel,
        recipient: recipient.trim(),
        subject: channel === "email" ? subject : null,
        message: message.trim(),
        mismatch_fields: preview?.mismatches.map((m) => m.field_name) || [],
      };

      const result = await apiPost<NotificationOut>(
        `/api/cases/${caseId}/notifications/send`,
        payload
      );

      setLastResult(result);
      setSuccess(true);
      if (onSent) onSent(result);
      setTimeout(() => {
        onClose();
      }, 2200);
    } catch (err: any) {
      setError(err.message || "Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const isCurrentChannelLive =
    channel === "email"
      ? preview?.email_configured
      : channel === "sms"
      ? preview?.sms_configured
      : preview?.whatsapp_configured;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 id="modal-title" className="text-base font-bold text-foreground">
                Notify Applicant: Discrepancy Notice
              </h3>
              <p className="text-xs text-slate-500">
                {preview ? `Case #${preview.case_number} · ${preview.case_name}` : "Case Notification"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 size={28} className="animate-spin text-blue-600 mb-2" />
              <p className="text-sm font-medium">Generating discrepancy analysis & templates…</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Detected Mismatches Pill Header */}
              {preview && preview.mismatches.length > 0 && (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wide">
                    <AlertTriangle size={14} className="text-amber-600" />
                    Identified Discrepancies to Flag:
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {preview.mismatches.map((m) => (
                      <span
                        key={m.field_name}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-100/90 px-2 py-1 text-xs font-semibold text-amber-900"
                        title={m.explanation}
                      >
                        ⚠️ {m.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Channel Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Communication Channel
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChannelChange("sms")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                      channel === "sms"
                        ? "border-blue-600 bg-blue-50/60 text-blue-700 shadow-sm ring-1 ring-blue-600"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <Smartphone size={15} /> SMS Text
                    </div>
                    <span className={`text-[10px] ${preview?.sms_configured ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                      {preview?.sms_configured ? "● Live Gateway" : "○ Demo Simulator"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChannelChange("whatsapp")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                      channel === "whatsapp"
                        ? "border-emerald-600 bg-emerald-50/60 text-emerald-700 shadow-sm ring-1 ring-emerald-600"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <MessageSquare size={15} /> WhatsApp
                    </div>
                    <span className={`text-[10px] ${preview?.whatsapp_configured ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                      {preview?.whatsapp_configured ? "● Live Gateway" : "○ Demo Simulator"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChannelChange("email")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                      channel === "email"
                        ? "border-indigo-600 bg-indigo-50/60 text-indigo-700 shadow-sm ring-1 ring-indigo-600"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <Mail size={15} /> Email Notice
                    </div>
                    <span className={`text-[10px] ${preview?.email_configured ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                      {preview?.email_configured ? "● Live SMTP" : "○ Demo Simulator"}
                    </span>
                  </button>
                </div>

                {!isCurrentChannelLive && (
                  <p className="mt-2 text-[11px] text-amber-800 bg-amber-50/90 rounded-lg p-2.5 border border-amber-200/80 flex items-start gap-1.5">
                    <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      <strong>Simulator Mode active:</strong> To send real {channel.toUpperCase()} messages to inboxes/phones, configure credentials in your <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200 text-amber-900">.env</code> file. In simulator mode, delivery receipts are logged to the case audit trail for demonstration.
                    </span>
                  </p>
                )}
              </div>


              {/* Recipient Input */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Recipient {channel === "email" ? "Email Address" : "Phone / Mobile Number"}
                  </label>
                  {preview?.applicant_name && (
                    <span className="text-xs text-slate-400">
                      Applicant: <strong className="text-slate-600">{preview.applicant_name}</strong>
                    </span>
                  )}
                </div>
                <input
                  type={channel === "email" ? "email" : "text"}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={channel === "email" ? "e.g. applicant@example.com" : "e.g. +91 98765 43210"}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-foreground shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Subject (for Email) */}
              {channel === "email" && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-foreground shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Message Body */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Message Content (Auto-Generated & Editable)
                  </label>
                  <span className="text-xs text-slate-400">{message.length} characters</span>
                </div>
                <textarea
                  rows={channel === "email" ? 8 : 5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-foreground shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed font-sans min-h-[140px] resize-y"
                />
              </div>

              {/* Status / Errors / Success Alert */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div
                  className={`flex items-start gap-2.5 rounded-xl p-3.5 text-xs font-semibold animate-fade-in ${
                    lastResult?.status === "delivered"
                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                      : lastResult?.status === "failed"
                        ? "bg-red-50 text-red-900 border border-red-200"
                        : "bg-amber-50 text-amber-900 border border-amber-200"
                  }`}
                >
                  {lastResult?.status === "failed" ? (
                    <AlertTriangle
                      size={17}
                      className="shrink-0 mt-0.5 text-red-600"
                    />
                  ) : (
                    <CheckCircle2
                      size={17}
                      className={`shrink-0 mt-0.5 ${
                        lastResult?.status === "delivered" ? "text-emerald-600" : "text-amber-600"
                      }`}
                    />
                  )}
                  <div>
                    <div className="font-bold">
                      {lastResult?.status === "delivered"
                        ? `Live notice dispatched to ${lastResult.recipient}!`
                        : lastResult?.status === "failed"
                          ? `Delivery failed to ${lastResult?.recipient || "recipient"}`
                          : `Notice recorded in Case Audit Log (Simulation Mode)`}
                    </div>
                    <p className="mt-0.5 font-normal text-[11px] opacity-90">
                      {lastResult?.status === "delivered"
                        ? `Delivered via ${lastResult.provider_info?.provider || "Live Gateway"}`
                        : lastResult?.status === "failed"
                          ? (lastResult.provider_info?.note || lastResult.provider_info?.error || "SMTP/Provider delivery failed. Check your credentials in .env.")
                          : "Running in offline simulator mode — no real email/SMS was sent over the network. To deliver to a real inbox/phone, add SMTP or Twilio API keys to .env."}
                    </p>
                  </div>
                </div>
              )}

              {/* Offline / Live Gateway footnote */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Info size={13} className="shrink-0 text-blue-500" />
                <span>
                  Dispatches via configured gateway (Twilio / SMTP) or High-Fidelity Simulator with logged audit delivery receipts.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || sending || success}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white shadow-sm transition-all ${
              channel === "whatsapp"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : channel === "email"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-blue-600 hover:bg-blue-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {sending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Sending…
              </>
            ) : success ? (
              <>
                <CheckCircle2 size={16} /> Sent!
              </>
            ) : (
              <>
                <Send size={16} /> Send {channel.toUpperCase()} Alert
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
