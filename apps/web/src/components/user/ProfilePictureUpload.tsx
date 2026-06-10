'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import {
  PROFILE_PICTURE_ACCEPT,
  PROFILE_PICTURE_HELPER,
  validateProfilePictureFile,
  getProfilePictureUrl,
} from '@/lib/profile-picture';
import { Upload, Trash2, Loader2 } from 'lucide-react';

interface ProfilePictureUploadProps {
  name: string;
  profilePictureUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  disabled?: boolean;
  previewSize?: 'default' | 'lg';
}

export function ProfilePictureUpload({
  name,
  profilePictureUrl,
  onUpload,
  onRemove,
  disabled,
  previewSize = 'lg',
}: ProfilePictureUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = previewUrl || profilePictureUrl || null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const validationError = validateProfilePictureFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      setUploading(true);
      await onUpload(file);
      setPreviewUrl(null);
    } catch (err: unknown) {
      setPreviewUrl(null);
      setError(err instanceof Error ? err.message : 'Failed to upload profile picture.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setError(null);
    try {
      setUploading(true);
      await onRemove();
      setPreviewUrl(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove profile picture.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <UserProfilePicture
          name={name}
          profilePictureUrl={displayUrl}
          size={previewSize}
          className={previewSize === 'lg' ? 'h-20 w-20 rounded-2xl text-xl' : undefined}
        />
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={PROFILE_PICTURE_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? 'Uploading...' : 'Upload Profile Picture'}
          </Button>
          {onRemove && (displayUrl || profilePictureUrl) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs font-bold text-[var(--status-danger-text)]"
              disabled={disabled || uploading}
              onClick={handleRemove}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
      <p className="text-[10px] text-[var(--text-muted)]">{PROFILE_PICTURE_HELPER}</p>
      {error && <p className="text-xs font-semibold text-[var(--status-danger-text)]">{error}</p>}
    </div>
  );
}

export { getProfilePictureUrl };
