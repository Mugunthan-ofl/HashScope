/**
 * Typed API Client for HashScope FastAPI Backend.
 */

import {
  AuditConfig,
  AuditStatusResponse,
  AuditReportResponse,
  BackendHealthResponse,
  EngineCheckResponse,
  EngineConfigPayload,
} from './types';

const DEFAULT_BASE_URL = 'http://localhost:8000';

export function getApiBaseUrl(): string {
  return localStorage.getItem('hashscope_api_url') || DEFAULT_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  localStorage.setItem('hashscope_api_url', url);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const url = `${baseUrl}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    throw new Error(
      `Unable to reach backend server at ${baseUrl}. Ensure FastAPI is running.`
    );
  }

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // Use fallback errorMsg
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const auditApi = {
  /**
   * Health check
   */
  async checkHealth(): Promise<BackendHealthResponse> {
    return request<BackendHealthResponse>('/health');
  },

  /**
   * Check installation status of cracking engine CLI binaries
   */
  async checkEngines(): Promise<EngineCheckResponse> {
    return request<EngineCheckResponse>('/api/v1/audit/engines/check');
  },

  /**
   * Fetch current custom binary paths config
   */
  async getEngineConfig(): Promise<EngineConfigPayload> {
    return request<EngineConfigPayload>('/api/v1/audit/engines/config');
  },

  /**
   * Update custom binary paths config in backend config.yaml and re-run check
   */
  async updateEngineConfig(payload: EngineConfigPayload): Promise<EngineCheckResponse> {
    return request<EngineCheckResponse>('/api/v1/audit/engines/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Trigger new audit job
   */
  async createAudit(config: AuditConfig): Promise<AuditStatusResponse> {
    return request<AuditStatusResponse>('/api/v1/audit', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  /**
   * Poll audit status
   */
  async getAuditStatus(auditId: string): Promise<AuditStatusResponse> {
    return request<AuditStatusResponse>(`/api/v1/audit/${auditId}/status`);
  },

  /**
   * Fetch full audit report
   */
  async getAuditReport(auditId: string): Promise<AuditReportResponse> {
    return request<AuditReportResponse>(`/api/v1/audit/${auditId}`);
  },

  /**
   * Fetch available dictionary wordlists
   */
  async getWordlists(): Promise<string[]> {
    return request<string[]>('/api/v1/audit/wordlists');
  },

  /**
   * Get direct download export URL for an audit report
   */
  getExportUrl(auditId: string, format: string = 'html'): string {
    const baseUrl = getApiBaseUrl().replace(/\/$/, '');
    return `${baseUrl}/api/v1/audit/${auditId}/export?format=${format}`;
  },
};

