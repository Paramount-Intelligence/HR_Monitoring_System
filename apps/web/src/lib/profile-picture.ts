/** Backend origin derived from NEXT_PUBLIC_API_URL (never the bare frontend origin for /media paths). */
export function getBackendOrigin(): string {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    return apiUrl.replace(/\/api\/v1$/i, '') || apiUrl;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

/**
 * Resolve a relative media/API path or absolute URL to a browser-loadable URL.
 * Never prefixes /media/ paths with the frontend origin when a full API URL is configured.
 */
export function resolveMediaUrl(pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return undefined;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const origin = getBackendOrigin();
  if (!origin) return trimmed;

  if (trimmed.startsWith('/api/v1/') || trimmed.startsWith('/media/')) {
    return `${origin}${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    return `${origin}${trimmed}`;
  }

  return `${origin}/${trimmed.replace(/^\//, '')}`;
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

/** Resolve profile picture URL from user fields (uploaded file or legacy URL). */
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

export const PROFILE_PICTURE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PROFILE_PICTURE_MAX_MB = 5;
export const PROFILE_PICTURE_HELPER =
  `JPEG, PNG, or WebP up to ${PROFILE_PICTURE_MAX_MB} MB.`;

export function validateProfilePictureFile(file: File): string | null {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowed.includes(file.type)) {
    return 'Please select a JPEG, PNG, or WebP image.';
  }
  if (file.size > PROFILE_PICTURE_MAX_MB * 1024 * 1024) {
    return `Image must be ${PROFILE_PICTURE_MAX_MB} MB or smaller.`;
  }
  return null;
}
