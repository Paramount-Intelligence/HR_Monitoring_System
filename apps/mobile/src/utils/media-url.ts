import { API_BASE_URL } from '../constants/env';

const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/i, '');

export function getBackendOrigin(): string {
  return BACKEND_ORIGIN;
}

export function resolveMediaUrl(pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return undefined;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return undefined;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file:')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('/api/v1/') || trimmed.startsWith('/media/') || trimmed.startsWith('/')) {
    return `${BACKEND_ORIGIN}${trimmed}`;
  }

  return `${BACKEND_ORIGIN}/${trimmed.replace(/^\//, '')}`;
}

function appendCacheBust(url: string, cacheBust?: string | number | null): string {
  if (cacheBust == null || cacheBust === '') return url;
  const version =
    typeof cacheBust === 'number'
      ? cacheBust
      : Number.isNaN(Date.parse(String(cacheBust)))
        ? String(cacheBust)
        : new Date(String(cacheBust)).getTime();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${version}`;
}

export function getProfilePictureUrl(
  user?: {
    profile_picture_url?: string | null;
    avatar_url?: string | null;
    profile_picture_updated_at?: string | null;
    avatar_updated_at?: string | null;
  } | null,
  options?: { cacheBust?: string | number | null }
): string | undefined {
  const raw = user?.profile_picture_url || user?.avatar_url;
  const resolved = resolveMediaUrl(raw);
  if (!resolved) return undefined;

  const bust =
    options?.cacheBust ??
    user?.profile_picture_updated_at ??
    user?.avatar_updated_at ??
    null;

  return appendCacheBust(resolved, bust);
}
