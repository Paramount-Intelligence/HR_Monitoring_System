import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { isDebugApi } from '@/lib/debug';
import { getApiBaseUrl, isApiConfigured } from '@/lib/config';
import {
  canFetchProtectedData,
  enqueueTokenRefresh,
  isAuthEndpoint,
  isSessionExpired,
  markSessionExpired,
} from '@/lib/auth/session';

// Browser API base — from NEXT_PUBLIC_API_URL (required in production builds).
export const API_URL = getApiBaseUrl();

if (isDebugApi()) {
  console.log('[API Client] Base URL:', API_URL);
} else if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  console.info('[CONFIG] API base URL configured:', isApiConfigured());
}

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to extract a readable error message from standardized backend responses
export const getErrorMessage = (error: unknown): string => {
  const err = error as AxiosError & { code?: string; message?: string };

  if (!err.response) {
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
      return 'Unable to reach the API server. Verify NEXT_PUBLIC_API_URL and CORS settings, then try again.';
    }
    if (err.code === 'ERR_SESSION_EXPIRED') {
      return 'Your session has expired. Please sign in again.';
    }
    if (err.code === 'ERR_NOT_AUTHENTICATED') {
      return 'Please sign in to continue.';
    }
  }

  const status = err.response?.status;
  const errorData = err.response?.data?.error as { code?: string; message?: string; details?: unknown[] } | undefined;

  if (status === 403) {
    return (typeof errorData?.message === 'string' && errorData.message) || 'You do not have permission to update this item.';
  }
  if (status === 401) {
    return (typeof errorData?.message === 'string' && errorData.message) || 'Your session has expired. Please sign in again.';
  }
  if (status === 404) {
    return (typeof errorData?.message === 'string' && errorData.message) || 'This item was not found or has been archived.';
  }
  if (status === 409) {
    return (typeof errorData?.message === 'string' && errorData.message) || 'This action conflicts with the current state.';
  }

  if (errorData) {
    if (errorData.code === 'VALIDATION_ERROR' && Array.isArray(errorData.details)) {
      return errorData.details
        .map((d: { loc?: string[]; msg?: string }) => {
          const loc = d.loc ?? [];
          return `${loc[loc.length - 1] || loc.join('.')}: ${d.msg}`;
        })
        .join(' | ');
    }

    if (typeof errorData.message === 'string' && errorData.message) {
      return errorData.message;
    }
  }

  const detail = err.response?.data?.detail;

  if (detail) {
    if (typeof detail === 'string') return detail;

    if (Array.isArray(detail)) {
      return detail
        .map((d: { loc?: string[]; msg?: string }) => {
          const loc = d.loc ?? [];
          const fieldName = loc[loc.length - 1] || loc.join('.');
          return `${fieldName}: ${d.msg}`;
        })
        .join(' | ');
    }
  }

  if (status === 422) {
    return 'Validation failed. Please check the form fields and try again.';
  }
  if (status === 500) {
    return 'An unexpected internal server error occurred. Please try again or contact support.';
  }

  return err.message || 'An unexpected error occurred';
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const url = config.url ?? '';

      if (isSessionExpired() && !isAuthEndpoint(url)) {
        return Promise.reject(
          new AxiosError('Session expired', 'ERR_SESSION_EXPIRED', config)
        );
      }

      if (!isAuthEndpoint(url) && !canFetchProtectedData()) {
        return Promise.reject(
          new AxiosError('Not authenticated', 'ERR_NOT_AUTHENTICATED', config)
        );
      }

      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    if (config.data instanceof FormData) {
      if (config.headers && 'Content-Type' in config.headers) {
        delete config.headers['Content-Type'];
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = originalRequest?.url ?? '';

    if (url.includes('/auth/refresh') && error.response?.status === 401) {
      markSessionExpired('refresh 401');
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(url)
    ) {
      if (isSessionExpired()) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      const accessToken = await enqueueTokenRefresh();
      if (!accessToken) {
        return Promise.reject(error);
      }

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
