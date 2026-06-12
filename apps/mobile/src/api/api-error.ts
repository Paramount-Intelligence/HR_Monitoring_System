import axios, { AxiosError } from 'axios';

export type ApiErrorKind =
  | 'offline'
  | 'timeout'
  | 'server'
  | 'auth'
  | 'validation'
  | 'forbidden'
  | 'unknown';

export interface NormalizedApiError {
  kind: ApiErrorKind;
  message: string;
  status?: number;
  raw?: unknown;
}

export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') return true;
  if (error.message.toLowerCase().includes('network request failed')) return true;
  return !error.response && Boolean(error.request);
}

export function isTimeoutError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  return error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout');
}

export function isAuthError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export function isForbiddenError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

export function normalizeApiError(error: unknown, fallback = 'Unable to load data. Please try again.'): NormalizedApiError {
  if (isNetworkError(error)) {
    return { kind: 'offline', message: 'No internet connection.', raw: error };
  }
  if (isTimeoutError(error)) {
    return { kind: 'timeout', message: 'Request timed out. Please try again.', raw: error };
  }
  if (isAuthError(error)) {
    return { kind: 'auth', message: 'Your session expired. Please log in again.', status: 401, raw: error };
  }
  if (isForbiddenError(error)) {
    return {
      kind: 'forbidden',
      message: 'You do not have access to this section.',
      status: 403,
      raw: error,
    };
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | { detail?: string | { msg?: string }[]; error?: { message?: string } }
      | undefined;

    if (data?.error?.message) {
      return {
        kind: status && status >= 500 ? 'server' : 'validation',
        message: data.error.message,
        status,
        raw: error,
      };
    }
    if (typeof data?.detail === 'string') {
      return {
        kind: status && status >= 500 ? 'server' : 'validation',
        message: data.detail,
        status,
        raw: error,
      };
    }
    if (Array.isArray(data?.detail)) {
      return {
        kind: 'validation',
        message: data.detail.map((item) => item.msg ?? 'Validation error').join(' '),
        status,
        raw: error,
      };
    }
    if (status && status >= 500) {
      return { kind: 'server', message: fallback, status, raw: error };
    }
  }

  return { kind: 'unknown', message: fallback, raw: error };
}

export function getFriendlyErrorMessage(error: unknown, fallback?: string): string {
  return normalizeApiError(error, fallback).message;
}

/** @deprecated Use getFriendlyErrorMessage — kept for existing imports */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  return getFriendlyErrorMessage(error, fallback);
}

export function isRetrySafeGet(error: unknown): boolean {
  const normalized = normalizeApiError(error);
  return normalized.kind === 'offline' || normalized.kind === 'timeout' || normalized.kind === 'server';
}
