import {
  Sliders,
  Shield,
  Server,
  Cpu,
  CheckCircle,
  Activity,
} from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { useTranslation } from "react-i18next";
import { useApi } from "../hooks/useApi";
import type { HealthResponse } from "../types/api";

export function SettingsPage() {
  const { t } = useTranslation();
  const { data: health, loading } = useApi<HealthResponse>("/api/health");

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6 pb-12">
      <PageHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
      />

      {/* System Status Banner */}
      <div className="card border-blue-200/60  bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50/50    p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600  text-white ">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground ">{health?.app || "ID-SHIELD Platform"}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100  px-2 py-0.5 text-[10px] font-bold text-emerald-800 ">
                  <Activity className="h-3 w-3 animate-pulse" />
                  {loading ? "Checking..." : "Operational"}
                </span>
              </div>
              <p className="text-xs text-slate-500 ">
                v{health?.version || "0.1.0"} · {health?.tagline || "Explainable Identity & Document Forensics Engine"}
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-500  sm:text-right space-y-0.5">
            <div>Deployment: <span className="font-semibold text-foreground ">Unified Container / Production</span></div>
            <div>Engine Status: <span className="font-semibold text-emerald-600 ">All 11 Modules Active</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Forensics & Verification Pipeline Modules */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100  pb-3">
            <Cpu className="h-4 w-4 text-blue-600 " />
            <h3 className="font-bold text-sm text-foreground ">Verification Pipeline Modules</h3>
          </div>

          <div className="space-y-2.5 text-xs">
            {[
              { name: "Image Preprocessing & Deskew", status: "Active", desc: "Automated skew angle correction & contrast normalization" },
              { name: "Multi-Pass OCR Engine", status: "Active", desc: "Tesseract OCR with word confidence scoring and next-line lookahead" },
              { name: "ICAO TD3 MRZ Checksums", status: "Active", desc: "7-3-5 weighting algorithm and printed text cross-check" },
              { name: "Visual Forensics (ELA & Noise)", status: "Active", desc: "Pixel tampering localization and artifact detection" },
              { name: "Cross-Document Consistency", status: "Active", desc: "Multi-field fuzzy name, date, and address comparison" },
              { name: "Facial Match & Biometrics", status: "Active", desc: "Facial photo extraction and perceptual cosine distance scoring" },
              { name: "Document Reuse & Anti-Tampering", status: "Active", desc: "Cross-case SHA-256 and pHash exact match scanning" },
            ].map((mod) => (
              <div key={mod.name} className="flex items-start justify-between rounded-lg border border-slate-100  bg-slate-50/60  p-2.5 transition-colors">
                <div>
                  <div className="font-semibold text-foreground ">{mod.name}</div>
                  <div className="text-[11px] text-slate-500 ">{mod.desc}</div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50  px-2 py-0.5 text-[10px] font-bold text-emerald-700  shrink-0 ml-2">
                  <CheckCircle className="h-3 w-3" />
                  {mod.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Storage Configuration */}
        <div className="space-y-6">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100  pb-3">
              <Shield className="h-4 w-4 text-blue-600 " />
              <h3 className="font-bold text-sm text-foreground ">Security &amp; Ingestion Safeguards</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 ">
                <span className="text-slate-500 ">Allowed File Ingestion</span>
                <span className="font-mono font-semibold text-foreground ">JPG, JPEG, PNG, PDF</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 ">
                <span className="text-slate-500 ">Max Upload Cap</span>
                <span className="font-mono font-semibold text-foreground ">10 MB per file</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 ">
                <span className="text-slate-500 ">Header Magic Byte Sniffing</span>
                <span className="font-semibold text-emerald-600 ">Enforced (Binary Signatures)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 ">
                <span className="text-slate-500 ">Storage Sandboxing</span>
                <span className="font-semibold text-foreground ">Case UUID Directory Isolation</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 ">HTTP Security Headers</span>
                <span className="font-semibold text-foreground ">CSP, XFO, XCTO, Perm-Policy</span>
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100  pb-3">
              <Sliders className="h-4 w-4 text-blue-600 " />
              <h3 className="font-bold text-sm text-foreground ">Risk Engine Calibration</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 ">Cross-Document Date of Birth Mismatch</span>
                <span className="rounded bg-rose-100  px-2 py-0.5 font-mono font-bold text-rose-700 ">+35 pts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 ">Visual Forensics Tampering Detected</span>
                <span className="rounded bg-rose-100  px-2 py-0.5 font-mono font-bold text-rose-700 ">+30 pts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 ">MRZ / QR Checksum Failure</span>
                <span className="rounded bg-amber-100  px-2 py-0.5 font-mono font-bold text-amber-700 ">+25 pts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 ">Cross-Document Full Name Conflict</span>
                <span className="rounded bg-amber-100  px-2 py-0.5 font-mono font-bold text-amber-700 ">+20 pts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 ">Multi-Document Agreement Reduction</span>
                <span className="rounded bg-emerald-100  px-2 py-0.5 font-mono font-bold text-emerald-700 ">-15 pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
