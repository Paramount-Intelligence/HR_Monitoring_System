'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  fallbackClassName?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  default: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

export function UserAvatar({
  name,
  avatarUrl,
  alt,
  size = 'default',
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !imageFailed;
  const initials = getUserInitials(name);
  const imageAlt = alt || `${name} profile picture`;

  return (
    <Avatar
      size={size}
      className={cn(sizeClasses[size], className)}
    >
      {showImage && (
        <AvatarImage
          src={avatarUrl!}
          alt={imageAlt}
          onError={() => setImageFailed(true)}
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
  );
}
