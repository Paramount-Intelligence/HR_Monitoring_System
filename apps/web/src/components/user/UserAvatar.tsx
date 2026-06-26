'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { isDebugApi } from '@/lib/debug';
import {
  isAvatarUrlFailed,
  markAvatarUrlFailed,
} from '@/lib/profile-picture';
import type { PresenceStatus } from '@/lib/presence/types';

export function getUserInitials(name: string): string {
  if (!name?.trim()) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl';
  className?: string;
  fallbackClassName?: string;
  presenceStatus?: PresenceStatus;
  showPresence?: boolean;
}

const sizeClasses = {
  xs: 'h-5 w-5 text-[8px]',
  sm: 'h-6 w-6 text-[10px]',
  default: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-base',
};

const dotSizeClasses = {
  xs: 'h-1.5 w-1.5 border',
  sm: 'h-2 w-2 border',
  default: 'h-2.5 w-2.5 border-2',
  lg: 'h-3 w-3 border-2',
  xl: 'h-3.5 w-3.5 border-2',
};

export function UserAvatar({
  name,
  avatarUrl,
  alt,
  size = 'default',
  className,
  fallbackClassName,
  presenceStatus,
  showPresence = false,
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(
    () => Boolean(avatarUrl) && isAvatarUrlFailed(avatarUrl!)
  );
  const showImage = Boolean(avatarUrl) && !imageFailed;
  const initials = getUserInitials(name);
  const imageAlt = alt || `${name} profile picture`;
  const presenceLabel =
    presenceStatus === 'away'
      ? `${name} is away`
      : presenceStatus === 'active'
        ? `${name} is active`
        : undefined;

  useEffect(() => {
    if (!avatarUrl) {
      setImageFailed(false);
      return;
    }
    setImageFailed(isAvatarUrlFailed(avatarUrl));
  }, [avatarUrl]);

  return (
    <span className="relative inline-flex shrink-0" aria-label={showPresence ? presenceLabel : undefined}>
      <Avatar size={size === 'xs' || size === 'xl' ? 'default' : size === 'lg' ? 'lg' : size} className={cn(sizeClasses[size], className)}>
        {showImage && (
          <AvatarImage
            src={avatarUrl!}
            alt={imageAlt}
            onError={() => {
              if (avatarUrl) {
                markAvatarUrlFailed(avatarUrl);
              }
              setImageFailed(true);
              if (isDebugApi()) {
                console.warn('[UserAvatar] Profile image unavailable');
              }
            }}
          />
        )}
        <AvatarFallback
          className={cn(
            'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--text-secondary)] font-black text-white',
            fallbackClassName
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {showPresence && presenceStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-[var(--bg-elevated)]',
            dotSizeClasses[size],
            presenceStatus === 'away' ? 'bg-amber-400' : 'bg-emerald-500'
          )}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
