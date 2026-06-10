/** Resolve profile picture URL from user fields (uploaded file or legacy URL). */
export function getProfilePictureUrl(
  user?: {
    profile_picture_url?: string | null;
    avatar_url?: string | null;
  } | null
): string | null {
  const url = user?.profile_picture_url || user?.avatar_url;
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/media/')) return trimmed;
  return trimmed;
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
