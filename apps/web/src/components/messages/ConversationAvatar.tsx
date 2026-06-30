'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Hash, ListTodo, MessageSquare, Users } from 'lucide-react';
import type { Conversation, ConversationParticipant, ConversationType } from '@/lib/api/messages';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { getDirectParticipant } from '@/components/messages/messages-utils';
import { cn } from '@/lib/utils';

interface ConversationAvatarProps {
  conversation: Conversation;
  currentUserId?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

function initialsFromTitle(title: string | null | undefined): string {
  const value = (title || '').trim();
  if (!value) return '?';
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function fallbackIcon(type: ConversationType) {
  switch (type) {
    case 'channel':
      return <Hash className="h-5 w-5" />;
    case 'task':
      return <ListTodo className="h-5 w-5" />;
    case 'project':
      return <MessageSquare className="h-5 w-5" />;
    default:
      return <Users className="h-5 w-5" />;
  }
}

export function ConversationAvatar({
  conversation,
  currentUserId,
  size = 'md',
  className,
}: ConversationAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const directUser = getDirectParticipant(conversation, currentUserId) as
    | ConversationParticipant['user']
    | undefined;

  if (conversation.type === 'direct' && directUser) {
    return (
      <UserProfilePicture
        user={directUser}
        userId={directUser.id}
        name={directUser.full_name}
        size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'}
        className={cn(SIZE_CLASSES[size], className)}
      />
    );
  }

  const avatarUrl = conversation.avatar_url;
  const showImage = Boolean(avatarUrl) && !imageFailed;

  return (
    <div
      className={cn(
        'rounded-full bg-[#dfe5e7] dark:bg-[#374248] flex items-center justify-center text-[#54656f] dark:text-[#aebac1] overflow-hidden shrink-0',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {showImage ? (
        <Image
          src={avatarUrl!}
          alt={conversation.title || 'Conversation'}
          width={48}
          height={48}
          className="h-full w-full object-cover"
          unoptimized
          onError={() => setImageFailed(true)}
        />
      ) : conversation.title ? (
        <span className="font-semibold">{initialsFromTitle(conversation.title)}</span>
      ) : (
        fallbackIcon(conversation.type)
      )}
    </div>
  );
}
