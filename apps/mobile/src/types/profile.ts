export interface ProfileUpdatePayload {
  full_name: string;
  phone?: string | null;
}

export interface ProfilePictureAsset {
  uri: string;
  fileName: string;
  mimeType: string;
}

export const PROFILE_PICTURE_MAX_MB = 5;
export const PROFILE_PICTURE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;
