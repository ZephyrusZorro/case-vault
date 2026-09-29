# Forensic Analysis

> Legacy ID-SHIELD identity prototype reference. These analysis endpoints are not mounted in CaseVault.

**What it is:** a transparent, model-free pipeline that surfaces *indicators of
potential manipulation* with pixel-precise locations. It is **not** proof of
forgery, and every UI surface repeats that.

## Pipeline

```
original file (never the preprocessed derivative)
  ├─ Detector A: chromatic-noise uniformity   (primary, sensitive)
  └─ Detector B: error-level analysis (ELA)   (conservative, severity-capped)
        → 16×16 block maps → floor threshold → dilate → connected clusters
        → region labeling (per-type layout maps) → score + explanation
```

### Detector A — chromatic-noise uniformity

Scans/renders are chromatically uniform: near-neutral pixels have ~zero
channel deviation everywhere. A patch pasted through an independent
JPEG/noise cycle breaks this uniformity locally.

- Metric: per-block mean of `(|R−G| + |G−B|)` over **near-neutral pixels only**
  (colored design elements are masked out).
- Floor: `13.0` (calibrated on the synthetic corpus; see `forensic_service.py`).
- Score: `min(1, value / 30)` → severity bands low/<0.33 ≤ medium/<0.66 ≤ high.
- Structural zones (QR code area, MRZ band) are capped at **low** so legitimate
  dense textures (QR modules) are not dramatized.

### Detector B — conservative ELA

JPEG re-encode difference map, block-means, adaptive floor
(`p99.5 × 1.15`, min 8). Findings overlapping a chroma finding are dropped
(IoU ≥ 0.3). Severity is capped by design — photographic grain must not look
like evidence of tampering.

## Region maps

Per document type, fractional boxes label each cluster: `photo zone`,
`text band`, `QR zone`, `MRZ band`, `header band`; unknown layouts fall back to
quadrant names (`upper right region`). Maps live in
`forensic_service.REGION_MAPS` and are additive per template.

## Output contract

`ForensicFinding` rows: `region, finding_type, severity(low|medium|high),
score(0..1), bbox[x,y,w,h], explanation`. The API aggregates a per-document
`suspicion_score` (0–100) and overall label; the Forensics tab draws the bboxes
over the preview scaled by percentage coordinates.

## Known limitations

- Flat scans defeat average-perceptual hashing (see duplicate service note).
- Strong recompression of an entire image can mask localized edits.
- Clean documents with dense colored design elements may produce weak ELA
  responses; chroma masking removes most of these.
- Detection quality was calibrated against the bundled synthetic generator
  (`demo/generate_docs.tamper_strip`) which produces *genuinely* manipulated
  pixels (q45 JPEG round-trip + σ14 noise under re-typed text). It is not a
  benchmark of real-world forgery variety.
