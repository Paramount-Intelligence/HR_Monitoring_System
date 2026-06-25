import type { AxiosError } from 'axios';

export type ProfileErrorPresentation = {
  title: string;
  message: string;
  kind: 'network' | 'unauthorized' | 'forbidden' | 'not_found' | 'server' | 'unknown';
};

export function classifyProfileLoadError(error: unknown): ProfileErrorPresentation {
  const err = error as AxiosError & { code?: string; message?: string };

  if (!err.response) {
    if (
      err.code === 'ERR_NETWORK' ||
      err.message === 'Network Error' ||
      err.message?.includes('Unable to reach the API')
    ) {
      return {
        kind: 'network',
        title: 'Unable to Load Profile',
        message:
          'Unable to reach the API server. Verify NEXT_PUBLIC_API_URL and CORS settings, then try again.',
      };
    }
    if (err.code === 'ERR_NOT_AUTHENTICATED') {
      return {
        kind: 'unauthorized',
        title: 'Sign In Required',
        message: 'Please sign in to view this profile.',
      };
    }
    if (err.code === 'ERR_SESSION_EXPIRED') {
      return {
        kind: 'unauthorized',
        title: 'Session Expired',
        message: 'Your session has expired. Please sign in again.',
      };
    }
  }

  const status = err.response?.status;
  const apiMessage =
    (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message ||
    (typeof err.response?.data === 'object' &&
    err.response?.data &&
    'detail' in (err.response.data as object) &&
    typeof (err.response.data as { detail?: unknown }).detail === 'string'
      ? String((err.response.data as { detail: string }).detail)
      : undefined);

  if (status === 401) {
    return {
      kind: 'unauthorized',
      title: 'Session Expired',
      message: apiMessage || 'Your session has expired. Please sign in again.',
    };
  }
  if (status === 403) {
    return {
      kind: 'forbidden',
      title: 'Access Denied',
      message: apiMessage || 'You do not have permission to view this profile.',
    };
  }
  if (status === 404) {
    return {
      kind: 'not_found',
      title: 'Profile Not Found',
      message: apiMessage || 'The requested user profile does not exist or has been archived.',
    };
  }
  if (status && status >= 500) {
    return {
      kind: 'server',
      title: 'Server Error',
      message:
        apiMessage ||
        'The server could not load this profile right now. Please try again in a moment.',
    };
  }

  return {
    kind: 'unknown',
    title: 'Unable to Load Profile',
    message: apiMessage || err.message || 'Failed to load employee profile.',
  };
}
