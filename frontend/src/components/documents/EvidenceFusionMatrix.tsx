import {
  CheckCircle2,
  AlertTriangle,
  QrCode,
  FileText,
  HelpCircle,
  Fingerprint,
  Scale,
} from "lucide-react";
import type { EvidenceFusionRow } from "../../types/api";

interface EvidenceFusionMatrixProps {
  rows: EvidenceFusionRow[];
}

export function EvidenceFusionMatrix({ rows }: EvidenceFusionMatrixProps) {
  if (!rows || rows.length === 0) {
    return (
      <div className="card p-8 text-center text-xs text-slate-400 ">
        No multi-source fields extracted for cross-source fusion yet.
      </div>
    );
  }

  const unanimousCount = rows.filter((r) => r.agreement_status === "unanimous").length;
  const conflictCount = rows.filter(
    (r) => r.agreement_status === "majority_conflict" || r.agreement_status === "mismatch"
  ).length;

  return (
    <div className="space-y-6">
      {/* Overview Banner (Module 4 & 6) */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-4 border-slate-200/90  bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/20   ">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
            <Scale size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground ">
              Confidence + Evidence Fusion (Workflow Modules 4 &amp; 6)
            </h4>
            <p className="mt-0.5 text-xs text-slate-600 ">
              Correlates printed OCR, QR code payloads, and passport MRZ data using majority-consensus voting.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50  px-3 py-1.5 ring-1 ring-inset ring-emerald-500/30">
            <span className="text-[11px] font-bold text-emerald-700  flex items-center gap-1.5">
              <CheckCircle2 size={13} /> {unanimousCount} Unanimous Agree
            </span>
          </div>
          {conflictCount > 0 && (
            <div className="rounded-lg bg-rose-50  px-3 py-1.5 ring-1 ring-inset ring-rose-500/30">
              <span className="text-[11px] font-bold text-rose-700  flex items-center gap-1.5">
                <AlertTriangle size={13} /> {conflictCount} Outlier / Disagreement
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Evidence Fusion Table */}
      <div className="card overflow-hidden border border-slate-200/90  shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/80  bg-slate-50/90  font-bold uppercase tracking-wider text-slate-500  text-[11px]">
              <tr>
                <th className="px-5 py-3.5 sm:w-48">Field</th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <FileText size={13} className="text-blue-500" />
                    <span>OCR (Printed Text)</span>
                  </div>
                </th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <QrCode size={13} className="text-purple-500" />
                    <span>Digital QR Code</span>
                  </div>
                </th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Fingerprint size={13} className="text-amber-500" />
                    <span>Passport MRZ</span>
                  </div>
                </th>
                <th className="px-5 py-3.5">Consensus &amp; Status</th>
                <th className="px-5 py-3.5 text-right">Caution Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 ">
              {rows.map((row) => {
                const isConflict =
                  row.agreement_status === "majority_conflict" || row.agreement_status === "mismatch";
                const isUnanimous = row.agreement_status === "unanimous";

                return (
                  <tr
                    key={row.field_name}
                    className={`transition-colors ${
                      isConflict
                        ? "bg-rose-50/40  hover:bg-rose-50/60 "
                        : "hover:bg-slate-50/60 "
                    }`}
                  >
                    {/* Field label */}
                    <td className="px-5 py-4 font-bold text-slate-900 ">
                      <div className="flex items-center gap-2">
                        {isConflict ? (
                          <AlertTriangle size={15} className="text-rose-500 shrink-0" />
                        ) : isUnanimous ? (
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                        ) : (
                          <HelpCircle size={15} className="text-slate-400 shrink-0" />
                        )}
                        <span>{row.label}</span>
                      </div>
                    </td>

                    {/* OCR Column */}
                    <td className="px-5 py-4">
                      {row.ocr_value ? (
                        <div>
                          <p className="font-semibold text-slate-800 ">
                            {row.ocr_value}
                          </p>
                          {row.ocr_confidence && (
                            <span className="mt-0.5 inline-block text-[10px] font-mono text-slate-400">
                              {Math.round(row.ocr_confidence)}% conf.
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not extracted</span>
                      )}
                    </td>

                    {/* QR Code Column */}
                    <td className="px-5 py-4">
                      {row.qr_value ? (
                        <div>
                          <p className="font-semibold text-slate-800 ">
                            {row.qr_value}
                          </p>
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 ">
                            <QrCode size={11} /> Cryptographic
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* MRZ Column */}
                    <td className="px-5 py-4">
                      {row.mrz_value ? (
                        <div>
                          <p className="font-semibold text-slate-800 ">
                            {row.mrz_value}
                          </p>
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 ">
                            <Fingerprint size={11} /> ICAO 9303
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Consensus Status */}
                    <td className="px-5 py-4">
                      {isUnanimous ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-500/20  ">
                          <CheckCircle2 size={13} /> Unanimous Consensus
                        </span>
                      ) : row.agreement_status === "majority_conflict" ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-extrabold text-rose-800 ring-1 ring-inset ring-rose-500/30  ">
                            <AlertTriangle size={13} /> Majority Conflict
                          </span>
                          <p className="mt-1 text-[11px] text-rose-600  font-medium">
                            {row.conflict_summary}
                          </p>
                        </div>
                      ) : row.agreement_status === "mismatch" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800  ">
                          <AlertTriangle size={13} /> Direct Mismatch
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 ">
                          Single source
                        </span>
                      )}
                    </td>

                    {/* Caution Level (Module 13: Confidence-Aware Risk) */}
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ring-inset ${
                          row.caution_level === "high"
                            ? "bg-rose-50 text-rose-700   ring-rose-500/30"
                            : row.caution_level === "elevated"
                            ? "bg-amber-50 text-amber-700   ring-amber-500/30"
                            : "bg-slate-100 text-slate-600   ring-slate-500/20"
                        }`}
                      >
                        {row.caution_level} caution
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Explainable footnote */}
        <div className="border-t border-slate-100  bg-slate-50/50  px-5 py-3 text-xs text-slate-500  flex items-center justify-between">
          <span>
            * Majority consensus voting isolates single-source digital or optical anomalies to prevent false alarms.
          </span>
          <span className="font-semibold text-foreground ">
            Confidence-Aware Risk Fusion Active
          </span>
        </div>
      </div>
    </div>
  );
}
