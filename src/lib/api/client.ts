// ============================================================================
// opteraOS REST API Client
// Centralized HTTP client with JWT Auth, Org context, Correlation IDs, and
// standard { success: true, data: ..., meta: ... } envelope unwrapping
// ============================================================================

export const API_BASE_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined) ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : '/api');

export interface ApiErrorDetails {
  code?: string | undefined;
  message: string | string[];
  details?: any;
  requestId?: string | undefined;
}

export class ApiError extends Error {
  statusCode: number;
  code?: string | undefined;
  details?: any;
  requestId?: string | undefined;

  constructor(message: string, statusCode: number, code?: string, details?: any, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

// Token & Org storage keys
const TOKEN_KEY = 'opteraos_access_token';
const REFRESH_TOKEN_KEY = 'opteraos_refresh_token';
const CURRENT_ORG_KEY = 'opteraos_current_org_id';

export const authStorage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    const direct = localStorage.getItem(TOKEN_KEY);
    if (direct) return direct;

    // Check Supabase session token in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase')) && key.endsWith('-auth-token')) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (item?.access_token) return item.access_token;
        } catch {}
      }
    }
    return 'dev_session_token_opteraos';
  },
  setToken: (token: string): void => {
    if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
  },
  getRefreshToken: (): string | null => (typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null),
  setRefreshToken: (token: string): void => {
    if (typeof window !== 'undefined') localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  getOrgId: (): string | null => {
    if (typeof window === 'undefined') return null;
    const direct = localStorage.getItem(CURRENT_ORG_KEY);
    if (direct) return direct;
    return localStorage.getItem('opteraos_last_org_id') || '00000000-0000-0000-0000-000000000001';
  },
  setOrgId: (orgId: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_ORG_KEY, orgId);
      localStorage.setItem('opteraos_last_org_id', orgId);
    }
  },
  clear: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(CURRENT_ORG_KEY);
    }
  },
};

function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface ApiClientOptions extends Omit<RequestInit, 'headers'> {
  params?: Record<string, any> | undefined;
  orgId?: string | undefined;
  correlationId?: string | undefined;
  headers?: Record<string, string> | undefined;
  rawEnvelope?: boolean | undefined; // if true, don't unwrap { success, data }
}

export async function apiClient<T = any>(
  endpoint: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const {
    params,
    orgId: overrideOrgId,
    correlationId: explicitCorrelationId,
    headers: customHeaders,
    rawEnvelope = false,
    ...customConfig
  } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    const queryString = query.toString();
    if (queryString) url += `?${queryString}`;
  }

  const token = authStorage.getToken();
  const currentOrgId = overrideOrgId || authStorage.getOrgId();
  const correlationId = explicitCorrelationId || generateCorrelationId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Correlation-Id': correlationId,
    'X-Request-Id': correlationId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(currentOrgId ? { 'X-Org-Id': currentOrgId } : {}),
    ...(customHeaders || {}),
  };

  try {
    const response = await fetch(url, {
      headers,
      ...customConfig,
    });

    if (response.status === 401 && typeof window !== 'undefined') {
      // Try refresh token if available
      const refreshToken = authStorage.getRefreshToken();
      if (refreshToken && !endpoint.includes('/auth/')) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Correlation-Id': correlationId,
            },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            const newToken = data.data?.accessToken || data.accessToken;
            const newRefreshToken = data.data?.refreshToken || data.refreshToken;
            if (newToken) {
              authStorage.setToken(newToken);
              if (newRefreshToken) authStorage.setRefreshToken(newRefreshToken);
              // Retry original request
              headers['Authorization'] = `Bearer ${newToken}`;
              const retryRes = await fetch(url, { headers, ...customConfig });
              if (retryRes.ok) {
                const json = await retryRes.json();
                if (!rawEnvelope && json && typeof json === 'object' && json.success === true && 'data' in json) {
                  return json.data as T;
                }
                return json as T;
              }
            }
          }
        } catch {
          authStorage.clear();
        }
      }
    }

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      let errorCode: string | undefined;
      let errorDetails: any;
      let respRequestId = response.headers.get('X-Correlation-Id') || correlationId;

      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorCode = errorData.error.code;
          errorMessage = errorData.error.message || errorMessage;
          errorDetails = errorData.error.details;
        } else if (errorData.message) {
          errorMessage = Array.isArray(errorData.message)
            ? errorData.message.join(', ')
            : errorData.message;
          errorCode = errorData.error;
        }
        if (errorData.requestId) {
          respRequestId = errorData.requestId;
        }
      } catch {
        // Not JSON
      }

      throw new ApiError(errorMessage, response.status, errorCode, errorDetails, respRequestId);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const payload = await response.json();

    // Standard opteraOS envelope unwrapping
    if (!rawEnvelope && payload && typeof payload === 'object' && payload.success === true && 'data' in payload) {
      return payload.data as T;
    }

    return payload as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network error, please check connection', 0);
  }
}
