'use client';

import { UserAvatar, UserAvatarProps } from '@/components/user/UserAvatar';
import { getProfilePictureUrl } from '@/lib/profile-picture';

export interface UserProfilePictureProps extends Omit<UserAvatarProps, 'avatarUrl'> {
  user?: {
    full_name?: string;
    profile_picture_url?: string | null;
    avatar_url?: string | null;
  } | null;
  profilePictureUrl?: string | null;
}

/** Display uploaded profile picture with initials fallback. */
export function UserProfilePicture({
  name,
  user,
  profilePictureUrl,
  ...props
}: UserProfilePictureProps) {
  const displayName = name || user?.full_name || 'User';
  const url =
    profilePictureUrl ??
    getProfilePictureUrl(user) ??
    null;

  return (
    <UserAvatar
      name={displayName}
      avatarUrl={url}
      alt={`${displayName} profile picture`}
      {...props}
    />
  );
}
