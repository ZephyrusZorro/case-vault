export interface HealthResponse {
  status: string;
  app: string;
  version: string;
  tagline: string;
  time: string;
}

export interface DashboardSummary {
  total_screened: number;
  valid: number;
  under_review: number;
  high_risk: number;
  average_risk_score: number | null;
  workflow_counts?: Record<string, number>;
  priority_counts?: Record<string, number>;
  legal_hold_count?: number;
  total_exhibits?: number;
  audit_events_count?: number;
}

export type ScreeningStatus =
  | "valid"
  | "under_review"
  | "high_risk"
  | "pending"
  | "processing";

export interface RecentScreeningItem {
  case_id: string;
  case_number: number;
  case_name: string;
  document_type: string | null;
  person_name: string | null;
  risk_score: number | null;
  status: ScreeningStatus;
  created_at: string;
}

export interface RecentScreeningsResponse {
  items: RecentScreeningItem[];
}

export interface DocumentItem {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  document_type: string | null;
  type_confidence: number | null;
  document_type_label?: string | null;
  processing_status: string;
  has_preview: boolean;
  current_version_number?: number;
  exhibit_number?: string | null;
  legal_category?: string | null;
  classification_level?: string;
  is_sealed?: boolean;
  sealed_reason?: string | null;
  sealed_by?: string | null;
  sealed_at?: string | null;
  legal_hold?: boolean;
  legal_hold_reason?: string | null;
  legal_hold_applied_by?: string | null;
  legal_hold_applied_at?: string | null;
  retention_period_years?: number | null;
  sha256_hash?: string | null;
  version_count?: number;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  case_id: string;
  version_number: number;
  file_name: string;
  file_size: number;
  mime_type: string;
  sha256_hash: string;
  previous_version_hash: string | null;
  version_tag: string;
  change_summary: string | null;
  uploaded_by_id: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface DocumentChainVerification {
  document_id: string;
  is_valid: boolean;
  version_count: number;
  chain: DocumentVersion[];
  errors: string[];
  verified_at: string;
}

export interface CaseDetail {
  id: string;
  case_number: number;
  case_id?: string;
  case_name: string;
  title?: string;
  case_type?: string;
  description?: string | null;
  department?: string;
  priority?: "low" | "medium" | "high" | "critical" | string;
  assigned_investigators?: string[];
  status: string;
  overall_risk: number | null;
  recommendation: string | null;
  applicant_name?: string | null;
  applicant_phone?: string | null;
  applicant_email?: string | null;
  auto_notify_on_mismatch?: boolean;
  review_status?: "pending_review" | "approved" | "rejected" | "needs_further_review" | null;
  reviewer_name?: string | null;
  reviewer_notes?: string | null;
  reviewed_at?: string | null;
  legal_hold?: boolean;
  legal_hold_reason?: string | null;
  legal_hold_applied_by?: string | null;
  legal_hold_applied_at?: string | null;
  classification_level?: string;
  created_at: string;
  updated_at?: string;
  evidence_count?: number;
  audit_event_count?: number;
  documents: DocumentItem[];
}

export interface CaseReviewRequest {
  decision: "approved" | "rejected" | "needs_further_review";
  notes?: string;
  reviewer_name?: string;
}

export interface HistoryItem {
  id: string;
  case_number: number;
  case_id?: string;
  case_name: string;
  title?: string;
  case_type?: string;
  department?: string;
  priority?: "low" | "medium" | "high" | "critical" | string;
  assigned_investigators?: string[];
  status: string;
  overall_risk: number | null;
  recommendation: string | null;
  person_name: string | null;
  document_count: number;
  created_at: string;
  updated_at?: string;
}

export interface ScreeningSummaryItem {
  module: string;
  outcome: string;
  detail: string;
}

export interface KeyFinding {
  level: "error" | "warning" | "info" | "success";
  text: string;
}

export interface ReportDocument {
  document_id: string;
  file_name: string;
  document_type: string | null;
  type_confidence: number | null;
  ocr_engine: string | null;
  ocr_mean_confidence: number | null;
  fields: { label: string; value: string; confidence: number | null }[];
  validation_overall: string | null;
}

export interface CaseReportResponse {
  case_id: string;
  case_number: number;
  case_name: string;
  formatted_case_id?: string | null;
  title?: string | null;
  case_type?: string | null;
  department?: string | null;
  priority?: string | null;
  status?: string | null;
  assigned_investigators?: string[];
  generated_at: string;
  disclaimer: string;
  overall_risk: number | null;
  band: string | null;
  recommendation: string | null;
  screening_summary: ScreeningSummaryItem[];
  key_findings: KeyFinding[];
  factors: RiskFactorItem[];
  documents: ReportDocument[];
}

export interface RiskFactorItem {
  factor: string;
  score: number;
  direction: "increase" | "decrease";
  explanation: string;
}

export interface RiskReport {
  case_id: string;
  score: number | null;
  band: string | null;
  recommendation: string | null;
  factors: RiskFactorItem[];
}

export interface CaseCreated {
  id: string;
  case_number: number;
  case_id?: string;
  case_name: string;
  title?: string;
  case_type?: string;
  department?: string;
  priority?: string;
  assigned_investigators?: string[];
  status: string;
  applicant_name?: string | null;
  applicant_phone?: string | null;
  applicant_email?: string | null;
  auto_notify_on_mismatch?: boolean;
}

export interface UploadResult {
  case_id: string;
  uploaded: DocumentItem[];
  failed: { file_name: string; error: string }[];
}

export type StageStatus =
  | "pending"
  | "running"
  | "done"
  | "warning"
  | "unavailable"
  | "error";

export interface AnalysisStageItem {
  stage_key: string;
  stage_label: string;
  status: StageStatus;
  detail: string | null;
  duration_ms: number | null;
  order_index: number;
}

export interface AnalysisResponse {
  case_id: string;
  case_status: string;
  stages: AnalysisStageItem[];
}

export interface ExtractedFieldItem {
  field_name: string;
  raw_value: string;
  normalized_value: string | null;
  confidence: number | null;
  source_region: { x: number; y: number; w: number; h: number } | null;
}

export interface DocumentDetail extends Omit<DocumentItem, "type_confidence"> {
  case_id: string;
  type_confidence: number | null;
  ocr_engine: string | null;
  ocr_mean_confidence: number | null;
  file_hash_prefix: string | null;
  uploaded_at: string;
  fields: ExtractedFieldItem[];
}

export type CheckStatus = "pass" | "fail" | "warning" | "unavailable";

export interface ValidationItem {
  check_type: string;
  status: CheckStatus;
  message: string;
  evidence?: Record<string, unknown> | null;
}

export type OverallValidation = "valid" | "review_required" | "unable_to_verify";

export interface DocumentValidationReport {
  document_id: string;
  file_name: string;
  document_type: string | null;
  overall_status: OverallValidation;
  items: ValidationItem[];
}

export interface CaseValidationsResponse {
  case_id: string;
  documents: DocumentValidationReport[];
}

export interface ComparisonValue {
  document_id: string;
  file_name: string;
  raw_value: string;
  normalized_value: string | null;
  confidence: number | null;
  agrees: boolean;
}

export type ComparisonStatus = "consistent" | "mismatch" | "single_source";

export interface RuleEvaluationItem {
  rule_id: string;
  rule_name: string;
  category: "identity" | "chronological" | "cross_document" | "structural";
  status: "pass" | "warning" | "fail" | "not_applicable";
  severity: "info" | "low" | "medium" | "high";
  confidence: number;
  explanation: string;
  evidence?: Record<string, unknown> | null;
}

export interface ComparisonFieldRow {
  field_name: string;
  label: string;
  status: ComparisonStatus;
  severity: "high" | "medium" | null;
  explanation: string | null;
  similarity?: number | null;
  values: ComparisonValue[];
}

export interface OtherDocValue {
  doc_id: string;
  doc_name: string;
  doc_type?: string | null;
  value: string;
}

export interface EvidenceFusionRow {
  field_name: string;
  label: string;
  ocr_value?: string | null;
  ocr_confidence?: number | null;
  qr_value?: string | null;
  qr_confidence?: number | null;
  mrz_value?: string | null;
  mrz_confidence?: number | null;
  other_docs: OtherDocValue[];
  consensus_value?: string | null;
  agreement_status: "unanimous" | "majority_conflict" | "mismatch" | "single_source";
  conflict_summary?: string | null;
  caution_level: "normal" | "elevated" | "high";
}

export interface GraphNode {
  id: string;
  label: string;
  type: "person" | "document" | "field";
  status: "verified" | "mismatch" | "warning" | "neutral";
  value?: string | null;
  confidence?: number | null;
  details?: Record<string, any> | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string | null;
  status: "agree" | "conflict" | "neutral";
}

export interface EvidenceGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CaseComparisonResponse {
  case_id: string;
  fields: ComparisonFieldRow[];
  rules_evaluated?: RuleEvaluationItem[];
  overall_name_similarity?: number | null;
  fusion_matrix?: EvidenceFusionRow[];
  evidence_graph?: EvidenceGraphData | null;
}


export interface ForensicItem {
  region: string;
  finding_type: string;
  severity: "low" | "medium" | "high";
  score: number;
  bbox: [number, number, number, number];
  explanation: string;
}

export interface DocumentForensicsReport {
  document_id: string;
  file_name: string;
  document_type: string | null;
  overall_suspicion: "low" | "medium" | "high";
  suspicion_score: number;
  findings: ForensicItem[];
}

export interface CaseForensicsResponse {
  case_id: string;
  disclaimer: string;
  documents: DocumentForensicsReport[];
}

export interface AntiSpoofingInfo {
  status: "genuine_photo" | "potential_screen_replay" | "screen_or_glossy_replay" | "low_quality_capture";
  risk_score: number;
  moire_intensity: number;
  glare_ratio: number;
  explanation: string;
}

export interface FaceCropInfo {
  document_id: string;
  file_name: string;
  bbox: [number, number, number, number];
  normalized_bbox: [number, number, number, number];
  confidence: number;
  detection_method: string;
  sharpness: number;
  brightness: number;
  contrast: number;
  has_crop: boolean;
  anti_spoofing?: AntiSpoofingInfo | null;
}

export interface FaceMetrics {
  ssim_score: number;
  phash_similarity: number;
  lbp_correlation: number;
  color_correlation: number;
}

export interface FaceComparisonPair {
  doc_a_id: string;
  doc_a_name: string;
  doc_b_id: string;
  doc_b_name: string;
  similarity_score: number;
  status: "match" | "borderline" | "mismatch";
  severity: "info" | "medium" | "high";
  explanation: string;
  metrics: FaceMetrics;
}

export interface CaseFacesResponse {
  case_id: string;
  disclaimer: string;
  faces: FaceCropInfo[];
  comparisons: FaceComparisonPair[];
  overall_status: "match" | "borderline" | "mismatch" | "single_face" | "no_faces";
}

// ---------------- Analytics & Intelligence ----------------

export interface AnalyticsKpis {
  total_cases: number;
  valid_count: number;
  review_count: number;
  high_risk_count: number;
  pass_rate: number;
  review_rate: number;
  high_risk_rate: number;
  average_risk_score: number;
  avg_processing_time_ms: number;
  total_documents_analyzed: number;
  face_verifications_count: number;
  face_mismatch_rate: number;
}

export interface VolumeTrendPoint {
  date: string;
  valid: number;
  under_review: number;
  high_risk: number;
  total: number;
}

export interface RiskDistributionBucket {
  tier: string;
  range_label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface MismatchFieldStat {
  field_name: string;
  label: string;
  count: number;
  percentage: number;
  severity_breakdown: Record<string, number>;
}

export interface DocumentTypeStat {
  document_type: string;
  label: string;
  count: number;
  percentage: number;
  pass_rate: number;
  avg_confidence: number;
}

export interface ForensicSignalStat {
  signal_key: string;
  label: string;
  category: "tampering" | "biometric" | "validation" | "security_feature";
  detected_count: number;
  rate_percent: number;
  avg_severity_score: number;
}

export interface StageLatencyStat {
  stage_key: string;
  stage_label: string;
  avg_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
}

export interface IntelligenceInsight {
  id: string;
  type: "risk_alert" | "trend" | "performance" | "quality";
  title: string;
  description: string;
  metric: string;
  importance: "high" | "medium" | "info";
}

export interface AnalyticsResponse {
  time_range: "7d" | "30d" | "90d" | "all";
  kpis: AnalyticsKpis;
  volume_trends: VolumeTrendPoint[];
  risk_distribution: RiskDistributionBucket[];
  mismatch_fields: MismatchFieldStat[];
  document_types: DocumentTypeStat[];
  forensic_signals: ForensicSignalStat[];
  stage_latencies: StageLatencyStat[];
  insights: IntelligenceInsight[];
  is_synthetic_baseline: boolean;
}

export interface DiscrepancyItem {
  field_name: string;
  label: string;
  severity: "info" | "low" | "medium" | "high";
  explanation: string;
  documents_involved: string[];
}

export interface NotificationPreviewResponse {
  case_id: string;
  case_number: number;
  case_name: string;
  applicant_name: string | null;
  applicant_phone: string | null;
  applicant_email: string | null;
  mismatches: DiscrepancyItem[];
  has_discrepancies: boolean;
  suggested_subject: string;
  sms_preview: string;
  whatsapp_preview: string;
  email_preview: string;
  email_configured?: boolean;
  sms_configured?: boolean;
  whatsapp_configured?: boolean;
}

export interface NotificationSendRequest {
  channel: "sms" | "whatsapp" | "email" | "webhook";
  recipient: string;
  subject?: string | null;
  message: string;
  mismatch_fields?: string[];
}

export interface NotificationOut {
  id: string;
  case_id: string;
  recipient: string;
  channel: "sms" | "whatsapp" | "email" | "webhook";
  subject?: string | null;
  message: string;
  mismatch_fields: string[];
  status: "sent" | "delivered" | "simulated" | "failed";
  trigger_type: "manual" | "automatic";
  created_at: string;
  provider_info?: Record<string, any> | null;
}

export interface VoiceBriefResponse {
  case_id: string;
  case_number: number;
  applicant_name: string;
  spoken_text: string;
  summary_bullets: string[];
  risk_level: string;
  recommendation: string;
  has_warnings: boolean;
  risk_score?: number | null;
}

export interface VoiceQueryRequest {
  query: string;
  current_path?: string | null;
}

export interface VoiceQueryResponse {
  answer: string;
  action?: string | null;
  category?: string | null;
}

export interface SearchResultItem {
  entity_type: "case" | "document" | "audit_event";
  id: string;
  title: string;
  subtitle?: string | null;
  case_id?: string | null;
  case_title?: string | null;
  match_field: string;
  match_snippet?: string | null;
  classification_level: string;
  is_sealed: boolean;
  legal_hold: boolean;
  status?: string | null;
  priority?: string | null;
  timestamp?: string | null;
  metadata: Record<string, any>;
}

export interface SearchResultsResponse {
  query: string;
  total_hits: number;
  cases_count: number;
  documents_count: number;
  audit_count: number;
  results: SearchResultItem[];
  took_ms: number;
}

export interface PIIEntity {
  entity_type: string;
  text: string;
  masked_value: string;
  start_char?: number | null;
  end_char?: number | null;
  confidence: number;
  bbox?: number[] | null;
  recommendation?: string;
}

export interface PIIScanResponse {
  document_id: string | null;
  file_name: string | null;
  entities_found: PIIEntity[];
  total_pii_count: number;
  categories: string[];
  has_victim_pii: boolean;
  has_aadhaar_pii: boolean;
  has_financial_pii: boolean;
  privacy_risk_level: "none" | "low" | "medium" | "high" | "critical";
  legal_statute_note: string;
}

export interface RedactionItem {
  entity_type: string;
  text_to_redact?: string | null;
  bbox?: number[] | null;
  label?: string | null;
}

export interface RedactDocumentRequest {
  redactions: RedactionItem[];
  reason: string;
  court_order_ref?: string | null;
  apply_watermark?: boolean;
  mask_style?: string;
  custom_victim_names?: string[];
}

export interface RedactedVersionOut {
  version_id: string;
  document_id: string;
  version_number: number;
  version_tag: string;
  file_name: string;
  sha256_hash: string;
  previous_version_hash: string | null;
  change_summary: string | null;
  uploaded_by_name: string | null;
  created_at: string;
  file_url: string;
}

export interface RedactDocumentResponse {
  success: boolean;
  message: string;
  document_id: string;
  version_id: string;
  version_number: number;
  version_tag: string;
  file_name: string;
  sha256_hash: string;
  previous_version_hash: string | null;
  items_redacted_count: number;
  change_summary: string;
  audit_event_id?: string | null;
  created_at: string;
  evidentiary_integrity_note: string;
}

export interface WorkflowHistoryItem {
  id: string;
  sequence: number;
  event_type: string;
  action: string;
  timestamp: string | null;
  user_name: string | null;
  user_role: string | null;
  details: Record<string, any>;
  hash_prefix: string;
}

export interface WorkflowActionPayload {
  action: string;
  remarks?: string;
}



