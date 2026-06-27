'use client';

import { UserAvatar, UserAvatarProps } from '@/components/user/UserAvatar';
import { getProfilePictureUrl } from '@/lib/profile-picture';
import { hydrateUserPresence, subscribePresence } from '@/lib/presence/presence-store';
import { resolveOnlineState } from '@/lib/presence/resolve-online';
import { resolvePresenceStatus } from '@/lib/presence/resolve-presence';
import type { PresenceStatus } from '@/lib/presence/types';
import { useEffect, useSyncExternalStore } from 'react';

export interface UserProfilePictureProps extends Omit<UserAvatarProps, 'avatarUrl' | 'presenceStatus' | 'isOnline' | 'onlineState'> {
  user?: {
    id?: string;
    full_name?: string;
    profile_picture_url?: string | null;
    avatar_url?: string | null;
    presence_status?: PresenceStatus;
    presence_updated_at?: string | null;
    last_seen_at?: string | null;
    online_state?: 'online' | 'offline';
    is_online?: boolean;
  } | null;
  userId?: string;
  profilePictureUrl?: string | null;
  showPresence?: boolean;
}

/** Display uploaded profile picture with initials fallback and live online indicator. */
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
    if (!id) return;
    hydrateUserPresence(id, {
      presence_status: user?.presence_status,
      presence_updated_at: user?.presence_updated_at,
      last_seen_at: user?.last_seen_at,
      online_state: user?.online_state,
      is_online: user?.is_online,
    });
  }, [
    id,
    user?.presence_status,
    user?.presence_updated_at,
    user?.last_seen_at,
    user?.online_state,
    user?.is_online,
  ]);

  const presenceStatus = useSyncExternalStore(
    subscribePresence,
    () =>
      resolvePresenceStatus(id, user?.presence_status) ??
      user?.presence_status ??
      undefined,
    () =>
      resolvePresenceStatus(id, user?.presence_status) ??
      user?.presence_status ??
      undefined,
  );

  const onlineState = useSyncExternalStore(
    subscribePresence,
    () =>
      resolveOnlineState(id, {
        online_state: user?.online_state,
        is_online: user?.is_online,
      }),
    () =>
      resolveOnlineState(id, {
        online_state: user?.online_state,
        is_online: user?.is_online,
      }),
  );

  return (
    <UserAvatar
      name={displayName}
      avatarUrl={url}
      alt={`${displayName} profile picture`}
      showOnlineIndicator={showPresence}
      isOnline={onlineState === 'online'}
      onlineState={onlineState}
      presenceStatus={presenceStatus}
      {...props}
    />
  );
}
