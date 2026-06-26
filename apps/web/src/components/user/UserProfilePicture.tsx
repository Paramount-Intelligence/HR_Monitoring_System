'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { UserAvatar, UserAvatarProps } from '@/components/user/UserAvatar';
import { getProfilePictureUrl } from '@/lib/profile-picture';
import { hydrateUserPresence, subscribePresence } from '@/lib/presence/presence-store';
import { resolvePresenceStatus } from '@/lib/presence/resolve-presence';
import type { PresenceStatus } from '@/lib/presence/types';

export interface UserProfilePictureProps extends Omit<UserAvatarProps, 'avatarUrl' | 'presenceStatus'> {
  user?: {
    id?: string;
    full_name?: string;
    profile_picture_url?: string | null;
    avatar_url?: string | null;
    presence_status?: PresenceStatus;
    presence_updated_at?: string | null;
    last_seen_at?: string | null;
  } | null;
  userId?: string;
  profilePictureUrl?: string | null;
  showPresence?: boolean;
}

/** Display uploaded profile picture with initials fallback. */
export function UserProfilePicture({
  name,
  user,
  userId,
  profilePictureUrl,
  showPresence = false,
  ...props
}: UserProfilePictureProps) {
  const id = userId ?? user?.id;
  const displayName = name || user?.full_name || 'User';
  const url =
    profilePictureUrl ??
    getProfilePictureUrl(user) ??
    null;

  useEffect(() => {
    if (!id || !user?.presence_status) return;
    hydrateUserPresence(id, {
      presence_status: user.presence_status,
      presence_updated_at: user.presence_updated_at,
      last_seen_at: user.last_seen_at,
    });
  }, [id, user?.presence_status, user?.presence_updated_at, user?.last_seen_at]);

  const presence = useSyncExternalStore(
    subscribePresence,
    () => resolvePresenceStatus(id, user?.presence_status),
    () => resolvePresenceStatus(id, user?.presence_status),
  );

  return (
    <UserAvatar
      name={displayName}
      avatarUrl={url}
      alt={`${displayName} profile picture`}
      showPresence={showPresence && (presence === 'active' || presence === 'away')}
      presenceStatus={presence ?? undefined}
      {...props}
    />
  );
}
