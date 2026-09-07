/**
 * Typed API Client for HashScope FastAPI Backend.
 */

import {
  AuditConfig,
  AuditStatusResponse,
  AuditReportResponse,
  BackendHealthResponse,
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
};
