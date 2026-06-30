'use client';

import { useRef, useState } from 'react';
import type { Conversation } from '@/lib/api/messages';
import { messagesApi } from '@/lib/api/messages';
import { getErrorMessage } from '@/lib/api/client';
import { ConversationAvatar } from '@/components/messages/ConversationAvatar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ConversationDetailsAvatarProps {
  conversation: Conversation;
  conversationName: string;
  currentUserId?: string;
  onUpdated: (conversation: Conversation) => void;
}

export function ConversationDetailsAvatar({
  conversation,
  conversationName,
  currentUserId,
  onUpdated,
}: ConversationDetailsAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  if (conversation.type === 'direct') {
    return null;
  }

  const canUpdate = conversation.can_update_avatar === true;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Image must be 2 MB or smaller.');
      return;
    }

    try {
      setIsUploading(true);
      const result = await messagesApi.uploadConversationAvatar(conversation.id, file);
      onUpdated({
        ...conversation,
        avatar_url: result.avatar_url,
      });
      toast.success('Group photo updated');
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove this group photo?')) return;
    try {
      setIsRemoving(true);
      await messagesApi.removeConversationAvatar(conversation.id);
      onUpdated({
        ...conversation,
        avatar_url: null,
      });
      toast.success('Group photo removed');
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to remove photo');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Group Avatar</p>
      <div className="flex items-center gap-4">
        <ConversationAvatar conversation={conversation} currentUserId={currentUserId} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{conversationName}</p>
          <p className="text-xs text-[var(--text-secondary)] capitalize">{conversation.type}</p>
        </div>
      </div>
      {canUpdate ? (
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void handleFileChange(e)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={isUploading || isRemoving}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Change Photo
          </Button>
          {conversation.avatar_url ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-rose-600"
              disabled={isUploading || isRemoving}
              onClick={() => void handleRemove()}
            >
              {isRemoving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Remove
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
