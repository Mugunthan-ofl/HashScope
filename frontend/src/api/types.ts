/**
 * TypeScript Interfaces for HashScope API data models.
 */

export interface AuditConfig {
  algorithm: 'md5' | 'sha1' | 'sha256' | 'ntlm' | 'bcrypt';
  engine: 'hashcat' | 'john';
  passwords: string[];
  wordlist_name: string;
  context_words: string[];
  min_password_length: number;
}

export interface AuditStatusResponse {
  audit_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_percent: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface SummaryStats {
  total_hashes: number;
  cracked_count: number;
  cracked_percentage: number;
  cracked_under_60s_percentage: number;
  avg_crack_time_seconds: number;
  median_crack_time_seconds: number;
  strength_distribution: Record<string, { count: number; percentage: number }>;
  most_common_policy_violation?: string;
}

export interface Recommendation {
  priority: number;
  title: string;
  reason: string;
  action: string;
}

export interface HashRecordItem {
  label: string;
  plaintext: string;
  hash_value: string;
  algorithm: string;
}

export interface PolicyViolationItem {
  rule_name: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface PolicyResultSection {
  is_compliant: boolean;
  violations: PolicyViolationItem[];
  passed_rules: string[];
  metadata: Record<string, unknown>;
}

export interface PolicyReportItem {
  label: string;
  overall_compliant: boolean;
  baseline: PolicyResultSection;
  advanced: PolicyResultSection;
  breach: PolicyResultSection;
}

export interface AuditReportResponse {
  audit_id: string;
  status: string;
  created_at: string;
  completed_at?: string;
  summary: SummaryStats;
  recommendations: Recommendation[];
  hash_records: HashRecordItem[];
  policy_reports: PolicyReportItem[];
  metadata: Record<string, unknown>;
}

export interface BackendHealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface EngineCheckItem {
  engine: string;
  status: 'found' | 'not_found';
  binary_path?: string | null;
  version?: string | null;
  checked_paths: string[];
}

export interface EngineCheckResponse {
  hashcat: EngineCheckItem;
  john: EngineCheckItem;
}

export interface EngineConfigPayload {
  hashcat_binary_path?: string;
  john_binary_path?: string;
}

