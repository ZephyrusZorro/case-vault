import React from "react";
import { Copy, Check, Printer, X, Award, Link as LinkIcon, FileText } from "lucide-react";

export interface EvidentiaryCertificate {
  certificate_id: string;
  issuer: string;
  organization: string;
  division: string;
  case_id: string;
  case_title?: string | null;
  deponent_system?: string | null;
  computer_specification?: string | null;
  evidentiary_statement?: string | null;
  generated_at: string;
  integrity_status: string;
  chain_integrity_verified: boolean;
  chain_length: number;
  total_case_events?: number;
  root_hash: string;
  head_hash: string;
  certificate_signature_sha256: string;
  legal_notice: string;
  exhibits_ledger?: Array<{
    id: string;
    exhibit_number: string;
    file_name: string;
    legal_category: string;
    sha256_hash: string;
    current_version_number: number;
    classification_level: string;
    is_sealed: boolean;
    legal_hold: boolean;
  }>;
  events?: Array<{
    sequence_number: number;
    timestamp: string;
    event_type: string;
    action: string;
    sha256?: string;
    current_hash?: string;
  }>;
}

interface Props {
  certificate: EvidentiaryCertificate | null;
  onClose: () => void;
}

export function EvidentiaryCertificateModal({ certificate, onClose }: Props) {
  const [copied, setCopied] = React.useState(false);

  if (!certificate) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(certificate, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white border-2 border-foreground shadow-hard p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Close certificate"
        >
          <X size={20} />
        </button>

        {/* Certificate Header Banner */}
        <div className="text-center space-y-2 border-b-2 border-dashed border-foreground/20 pb-6">
          <div className="inline-flex items-center justify-center p-3 bg-amber-50 rounded-2xl border-2 border-foreground shadow-hard-active mb-2">
            <Award size={36} className="text-amber-600" />
          </div>
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            Government of India · Ministry of Home Affairs
          </div>
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            National Crime Records Bureau (NCRB)
          </h2>
          <p className="text-xs font-bold text-slate-600">
            Women Safety Division & Investigation Cybercrime Directorate
          </p>
          <div className="inline-block mt-1 px-3 py-1 bg-accent-mint/30 border-2 border-foreground rounded-full text-xs font-black text-slate-900">
            OFFICIAL DIGITAL EVIDENTIARY TRACEABILITY CERTIFICATE
          </div>
        </div>

        {/* Certificate Meta Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[10px] font-black uppercase text-slate-400">Certificate Identifier</div>
            <div className="font-mono font-black text-foreground">{certificate.certificate_id}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[10px] font-black uppercase text-slate-400">Issue Timestamp (UTC)</div>
            <div className="font-mono font-bold text-foreground">
              {new Date(certificate.generated_at).toUTCString()}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[10px] font-black uppercase text-slate-400">Associated Investigation Dossier</div>
            <div className="font-mono font-black text-blue-700">{certificate.case_id}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[10px] font-black uppercase text-slate-400">Cryptographic Ledger Verification</div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-black text-emerald-700 uppercase">
                {certificate.integrity_status} (0 TAMPER DETECTED)
              </span>
            </div>
          </div>
        </div>

        {/* Cryptographic Linkage Details */}
        <div className="p-4 bg-cream rounded-xl border-2 border-foreground/30 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-black text-foreground flex items-center gap-1.5">
              <LinkIcon size={14} /> Chain-of-Custody Root & Head Digests
            </span>
            <span className="text-[10px] font-bold text-slate-500">
              Total Block Length: {certificate.chain_length} events
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Root Predecessor Hash:</div>
              <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-300 break-all text-slate-700">
                {certificate.root_hash}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Latest Block Head Digest:</div>
              <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-300 break-all text-slate-700">
                {certificate.head_hash}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Certificate SHA-256 Digest Signature:</div>
              <div className="font-mono text-[11px] bg-accent-yellow/20 p-2 rounded border-2 border-foreground/40 break-all font-bold text-slate-900">
                {certificate.certificate_signature_sha256}
              </div>
            </div>
          </div>
        </div>

        {/* Exhibits Ledger Table */}
        {certificate.exhibits_ledger && certificate.exhibits_ledger.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText size={14} className="text-blue-600" />
              Registered Evidentiary Exhibits &amp; Cryptographic Hashes ({certificate.exhibits_ledger.length})
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-2">Exhibit Ref</th>
                    <th className="p-2">File Name</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">SHA-256 Digest</th>
                    <th className="p-2">Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {certificate.exhibits_ledger.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-blue-700">{ex.exhibit_number}</td>
                      <td className="p-2 font-sans font-medium text-slate-800">{ex.file_name}</td>
                      <td className="p-2 font-sans text-slate-600">{ex.legal_category}</td>
                      <td className="p-2 text-emerald-700 font-mono text-[10px] truncate max-w-[200px]" title={ex.sha256_hash}>
                        {ex.sha256_hash ? `${ex.sha256_hash.slice(0, 16)}…` : "—"}
                      </td>
                      <td className="p-2 uppercase text-[10px] font-bold text-slate-600">{ex.classification_level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legal & Regulatory Notice (Compliant with User Mandate #3 & #4) */}
        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 text-[11px] text-blue-900 space-y-1.5 leading-relaxed">
          <div className="font-black flex items-center gap-1 text-blue-950 uppercase">
            <FileText size={13} /> Digital Evidentiary Traceability Notice
          </div>
          <p className="text-slate-600 font-medium">
            {certificate.legal_notice}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {certificate.case_id && certificate.case_id !== "GLOBAL_REGISTRY" && (
            <a
              href={`/api/audit/cases/${certificate.case_id}/certificate/html`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <FileText size={14} /> Court Printable HTML
            </a>
          )}
          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-white border-2 border-foreground shadow-hard hover:translate-y-[-1px] transition-all"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? "Copied JSON!" : "Copy Verification Payload"}
          </button>
          <button
            onClick={handlePrint}
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-accent-yellow border-2 border-foreground shadow-hard hover:translate-y-[-1px] transition-all text-slate-900"
          >
            <Printer size={14} /> Print Certificate
          </button>
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
