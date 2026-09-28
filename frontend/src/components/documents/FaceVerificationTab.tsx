import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  Loader2,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import type {
  CaseFacesResponse,
  FaceComparisonPair,
  FaceCropInfo,
} from "../../types/api";

const STATUS_CONFIG: Record<
  CaseFacesResponse["overall_status"],
  { label: string; tone: string; icon: typeof ShieldCheck }
> = {
  match: {
    label: "Facial Match Verified",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20   ",
    icon: ShieldCheck,
  },
  borderline: {
    label: "Borderline Similarity — Review",
    tone: "bg-amber-50 text-amber-700 ring-amber-600/25   ",
    icon: ShieldAlert,
  },
  mismatch: {
    label: "Facial Photo Mismatch",
    tone: "bg-rose-50 text-rose-700 ring-rose-600/20   ",
    icon: ShieldAlert,
  },
  single_face: {
    label: "Single Face Extracted",
    tone: "bg-blue-50 text-blue-700 ring-blue-600/20   ",
    icon: ScanFace,
  },
  no_faces: {
    label: "No Faces Detected",
    tone: "bg-slate-100 text-slate-700 ring-slate-500/20   ",
    icon: HelpCircle,
  },
};

function MetricBar({
  label,
  value,
  percentage,
}: {
  label: string;
  value: string;
  percentage: number;
}) {
  const tone =
    percentage >= 70
      ? "bg-emerald-500"
      : percentage >= 50
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div>
      <div className="flex justify-between text-xs font-medium text-slate-700 ">
        <span>{label}</span>
        <span className="font-bold text-slate-900  font-mono">{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 ">
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone}`}
          style={{ width: `${Math.max(5, Math.min(100, percentage))}%` }}
        />
      </div>
    </div>
  );
}

function FaceCard({ face }: { face: FaceCropInfo }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="card overflow-hidden transition-all hover:shadow-card-hover border border-slate-200/90 ">
      <div className="flex flex-col sm:flex-row">
        {/* Face thumbnail */}
        <div className="relative flex aspect-square w-full items-center justify-center bg-slate-100  p-2 sm:w-36 sm:shrink-0">
          {!imgError ? (
            <img
              src={`/api/documents/${face.document_id}/face-crop`}
              alt={`Extracted face from ${face.file_name}`}
              onError={() => setImgError(true)}
              className="h-full w-full rounded-xl object-cover shadow-sm ring-1 ring-slate-200 "
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-slate-200  text-slate-400">
              <ScanFace size={32} />
              <span className="mt-1 text-[10px]">Photo Preview</span>
            </div>
          )}
          <span className="absolute bottom-3 right-3 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-white backdrop-blur">
            {face.bbox[2]}×{face.bbox[3]} px
          </span>
        </div>

        {/* Quality telemetry */}
        <div className="flex-1 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="truncate text-xs font-bold text-slate-900 ">
              {face.file_name}
            </h4>
            <span className="rounded-md bg-blue-50  px-2 py-0.5 text-[10px] font-bold text-blue-700  capitalize border border-blue-100 ">
              {face.detection_method.replace(/_/g, " ")}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-50  p-2.5 text-center text-xs border border-slate-100 ">
            <div className="min-w-0 px-1">
              <p className="text-[9px] font-bold uppercase text-slate-500  truncate" title="Sharpness">
                Sharpness
              </p>
              <p
                className={`mt-0.5 font-mono font-bold ${
                  face.sharpness >= 100
                    ? "text-emerald-600 "
                    : face.sharpness >= 40
                      ? "text-amber-600 "
                      : "text-rose-600 "
                }`}
              >
                {Math.round(face.sharpness)}
              </p>
            </div>
            <div className="min-w-0 px-1">
              <p className="text-[9px] font-bold uppercase text-slate-500  truncate" title="Brightness">
                Brightness
              </p>
              <p className="mt-0.5 font-mono font-bold text-slate-900 ">
                {Math.round(face.brightness)}
              </p>
            </div>
            <div className="min-w-0 px-1">
              <p className="text-[9px] font-bold uppercase text-slate-500  truncate" title="Contrast">
                Contrast
              </p>
              <p className="mt-0.5 font-mono font-bold text-slate-900 ">
                {Math.round(face.contrast)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 ">
            <span>Detection Confidence</span>
            <span className="font-mono font-bold text-slate-700 ">
              {Math.round(face.confidence * 100)}%
            </span>
          </div>

          {/* Anti-spoofing and Presentation Attack Assessment */}
          {face.anti_spoofing && (
            <div
              className={`rounded-xl p-2.5 text-[11px] border ${
                face.anti_spoofing.status === "genuine_photo"
                  ? "bg-emerald-50/70  border-emerald-200/80  text-emerald-800 "
                  : face.anti_spoofing.status === "potential_screen_replay" ||
                    face.anti_spoofing.status === "screen_or_glossy_replay"
                    ? "bg-rose-50/70  border-rose-200  text-rose-800 "
                    : "bg-amber-50/70  border-amber-200  text-amber-800 "
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="capitalize">
                  {face.anti_spoofing.status.replace(/_/g, " ")}
                </span>
                <span className="font-mono text-[10px]">
                  Risk: {face.anti_spoofing.risk_score}/100
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed opacity-90">
                {face.anti_spoofing.explanation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ComparisonCard({ pair }: { pair: FaceComparisonPair }) {
  const isMatch = pair.status === "match";
  const isBorderline = pair.status === "borderline";
  const isMismatch = pair.status === "mismatch";

  const scoreTone = isMatch
    ? "text-emerald-600 "
    : isBorderline
      ? "text-amber-600 "
      : "text-rose-600 ";

  const barTone = isMatch
    ? "from-emerald-500 to-teal-500"
    : isBorderline
      ? "from-amber-500 to-orange-500"
      : "from-rose-500 to-red-600";

  return (
    <section className="card overflow-hidden border border-slate-200/90 ">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5 ${
          isMismatch
            ? "border-rose-200  bg-rose-50/80 "
            : isBorderline
              ? "border-amber-200  bg-amber-50/80 "
              : "border-slate-100  bg-slate-50/80 "
        }`}
      >
        <div className="flex items-center gap-2">
          {isMismatch ? (
            <AlertTriangle size={18} className="text-rose-500 " aria-hidden="true" />
          ) : isBorderline ? (
            <ShieldAlert size={18} className="text-amber-500 " aria-hidden="true" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-500 " aria-hidden="true" />
          )}
          <span className="text-sm font-bold text-slate-900 ">
            {pair.doc_a_name} <span className="text-slate-400">↔</span> {pair.doc_b_name}
          </span>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
            isMatch
              ? "bg-emerald-100 text-emerald-800  "
              : isBorderline
                ? "bg-amber-100 text-amber-800  "
                : "bg-rose-100 text-rose-800  "
          }`}
        >
          {pair.status} · {pair.similarity_score}%
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[280px_1fr]">
        {/* Left: Side-by-side thumbnails and similarity score */}
        <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50/80  p-4 text-center ring-1 ring-slate-200/70 ">
          <div className="flex items-center gap-3">
            <img
              src={`/api/documents/${pair.doc_a_id}/face-crop`}
              alt={pair.doc_a_name}
              className="h-20 w-20 rounded-xl object-cover shadow ring-1 ring-slate-200 "
            />
            <div className="flex flex-col items-center">
              <span className={`text-2xl font-black font-mono leading-none ${scoreTone}`}>
                {pair.similarity_score}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ">
                Match
              </span>
            </div>
            <img
              src={`/api/documents/${pair.doc_b_id}/face-crop`}
              alt={pair.doc_b_name}
              className="h-20 w-20 rounded-xl object-cover shadow ring-1 ring-slate-200 "
            />
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 ">
            <div
              className={`h-full bg-gradient-to-r ${barTone} transition-all duration-700`}
              style={{ width: `${pair.similarity_score}%` }}
            />
          </div>

          <p className="mt-2 text-xs font-semibold text-slate-500 ">
            Biometric Fusion Index
          </p>
        </div>

        {/* Right: Explainable metrics */}
        <div className="flex flex-col justify-between space-y-4">
          <div>
            <h5 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 ">
              Explainable Biometric Telemetry
            </h5>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MetricBar
                label="Structural Similarity (SSIM)"
                value={`${Math.round(pair.metrics.ssim_score * 100)}%`}
                percentage={pair.metrics.ssim_score * 100}
              />
              <MetricBar
                label="Perceptual Structure (pHash)"
                value={`${Math.round(pair.metrics.phash_similarity * 100)}%`}
                percentage={pair.metrics.phash_similarity * 100}
              />
              <MetricBar
                label="Micro-Texture Correlation (LBP)"
                value={`${Math.round(pair.metrics.lbp_correlation * 100)}%`}
                percentage={pair.metrics.lbp_correlation * 100}
              />
              <MetricBar
                label="Chromatic &amp; Skin-Tone Alignment"
                value={`${Math.round(pair.metrics.color_correlation * 100)}%`}
                percentage={pair.metrics.color_correlation * 100}
              />
            </div>
          </div>

          {/* Explanation banner */}
          <div
            className={`rounded-xl p-3 text-xs leading-relaxed font-medium ${
              isMismatch
                ? "bg-rose-50  text-rose-900  border border-rose-200 "
                : isBorderline
                  ? "bg-amber-50  text-amber-900  border border-amber-200 "
                  : "bg-emerald-50  text-emerald-900  border border-emerald-200 "
            }`}
          >
            <p>{pair.explanation}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FaceVerificationTab({ caseId }: { caseId: string }) {
  const { data, loading, error } = useApi<CaseFacesResponse>(
    `/api/cases/${caseId}/faces`,
  );
  const [sliderPos, setSliderPos] = useState(50);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-xs font-medium text-slate-500 ">
        <Loader2 size={18} className="animate-spin text-blue-500" aria-hidden="true" />
        Extracting facial biometrics &amp; cross-comparing portrait crops…
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-rose-50  p-4 text-xs font-semibold text-rose-700  border border-rose-200 ">
        {error}
      </p>
    );
  }

  if (!data || data.faces.length === 0) {
    return (
      <div className="card p-10 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100  text-slate-400 ">
          <ScanFace size={28} />
        </div>
        <h4 className="text-sm font-bold text-slate-900 ">
          No Facial Portraits Detected
        </h4>
        <p className="mx-auto max-w-md text-xs text-slate-500 ">
          The submitted documents do not contain recognizable facial portrait regions, or image resolution was insufficient for automated crop.
        </p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[data.overall_status] ?? STATUS_CONFIG.no_faces;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Summary banner */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50  text-blue-600 ">
            <ScanFace size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 ">
              Facial Photo Biometrics &amp; Cross-Matching
            </h3>
            <p className="text-xs text-slate-500 ">
              Biometric portrait comparison across {data.faces.length} document
              {data.faces.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${statusConfig.tone}`}
        >
          <StatusIcon size={14} aria-hidden="true" />
          {statusConfig.label}
        </span>
      </div>

      {/* Extracted Face Gallery */}
      <div>
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-900 ">
          Extracted Facial Portraits ({data.faces.length})
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.faces.map((f) => (
            <FaceCard key={f.document_id} face={f} />
          ))}
        </div>
      </div>

      {/* Pairwise Comparisons */}
      {data.comparisons.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 ">
            Cross-Document Biometric Matches ({data.comparisons.length})
          </h4>
          {data.comparisons.map((pair) => (
            <ComparisonCard
              key={`${pair.doc_a_id}-${pair.doc_b_id}`}
              pair={pair}
            />
          ))}
        </div>
      )}

      {/* Interactive Inspection Tool (if 2 or more faces) */}
      {data.faces.length >= 2 && (
        <section className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100  pb-3">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-blue-600 " />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 ">
                Interactive Face Alignment Inspector
              </h4>
            </div>
            <span className="text-xs text-slate-400 ">
              Drag slider to inspect facial landmark geometry overlay
            </span>
          </div>

          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto]">
            {/* Split overlay viewer */}
            <div className="relative mx-auto h-56 w-56 overflow-hidden rounded-2xl bg-slate-950 shadow-md ring-2 ring-slate-300 ">
              {/* Document B (Background) */}
              <img
                src={`/api/documents/${data.faces[1].document_id}/face-crop`}
                alt="Doc B Face"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Document A (Clipped foreground) */}
              <div
                className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-white shadow-lg"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={`/api/documents/${data.faces[0].document_id}/face-crop`}
                  alt="Doc A Face"
                  className="h-56 w-56 max-w-none object-cover"
                />
              </div>
              {/* Badge */}
              <span className="absolute bottom-2 left-2 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur">
                {data.faces[0].file_name}
              </span>
              <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur">
                {data.faces[1].file_name}
              </span>
            </div>

            {/* Slider control */}
            <div className="space-y-3 md:w-72">
              <p className="text-xs font-bold text-slate-900 ">
                Overlay Blend Ratio: <span className="text-blue-600  font-mono">{sliderPos}%</span>
              </p>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="w-full accent-blue-600"
                aria-label="Facial overlay slider"
              />
              <div className="flex justify-between text-[10px] text-slate-400  font-medium">
                <span>100% {data.faces[0].file_name}</span>
                <span>100% {data.faces[1].file_name}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 ">
                Aligns and blends facial landmarks (eyes, nose, jawline) to reveal subtle manipulations or structural differences.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 rounded-xl bg-blue-50/70  p-3.5 border border-blue-100  text-blue-900 ">
        <Info size={16} className="mt-0.5 shrink-0 text-blue-600 " aria-hidden="true" />
        <p className="text-xs leading-relaxed">{data.disclaimer}</p>
      </div>
    </div>
  );
}
