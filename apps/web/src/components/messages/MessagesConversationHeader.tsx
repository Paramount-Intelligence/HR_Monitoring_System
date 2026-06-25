'use client';

import { ArrowLeft, Hash, Phone, Search, Settings, Users, Video } from 'lucide-react';
import type { Conversation, ConversationParticipantRole } from '@/lib/api/messages';
import { Button } from '@/components/ui/button';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { cn } from '@/lib/utils';
import { getDirectParticipant } from './messages-utils';
import type { getCallButtonState } from '@/lib/calls/call-ui-utils';

type CallButtonState = ReturnType<typeof getCallButtonState>;

interface MessagesConversationHeaderProps {
  activeConv: Conversation;
  activeConvName: string;
  currentUserId?: string;
  myRole?: ConversationParticipantRole;
  isMobile: boolean;
  isGroupOrChannel: boolean;
  canIAddMembers: boolean;
  canIManageSettings: boolean;
  dmCallButtonState: CallButtonState;
  onBack: () => void;
  onStartCall: (mode: 'voice' | 'video') => void;
  onShowPremiumCall: () => void;
  onOpenManage: () => void;
  onOpenSettings: () => void;
  getCallButtonTitle: (mode: 'voice' | 'video', state: CallButtonState) => string;
  roleBadge: (role: ConversationParticipantRole) => { label: string; cls: string };
}

export function MessagesConversationHeader({
  activeConv,
  activeConvName,
  currentUserId,
  myRole,
  isMobile,
  isGroupOrChannel,
  canIAddMembers,
  canIManageSettings,
  dmCallButtonState,
  onBack,
  onStartCall,
  onShowPremiumCall,
  onOpenManage,
  onOpenSettings,
  getCallButtonTitle,
  roleBadge,
}: MessagesConversationHeaderProps) {
  const directUser = getDirectParticipant(activeConv, currentUserId);
  const subtitle =
    activeConv.type === 'direct'
      ? [directUser?.role, directUser?.designation].filter(Boolean).join(' · ') ||
        'Direct message'
      : `${activeConv.participants.length} participants`;

  return (
    <div className="shrink-0 h-16 px-3 sm:px-4 border-b border-[var(--border-subtle)] bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {isMobile && (
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-full text-[#54656f] hover:bg-[#e9edef] dark:hover:bg-[#374248] shrink-0"
            aria-label="Back to chats"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        {directUser ? (
          <UserProfilePicture
            user={directUser}
            name={directUser.full_name}
            size="lg"
            className="h-10 w-10 shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-[#dfe5e7] dark:bg-[#374248] flex items-center justify-center text-[#54656f] shrink-0">
            {activeConv.type === 'channel' ? (
              <Hash className="h-5 w-5" />
            ) : (
              <Users className="h-5 w-5" />
            )}
          </div>
        )}

        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
            {activeConvName}
          </h2>
          <p className="text-xs text-[#667781] dark:text-[#8696a0] truncate flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#25d366] shrink-0" />
            {subtitle}
            {myRole && (
              <span
                className={cn(
                  'px-1 py-0.5 rounded border text-[8px] font-bold uppercase shrink-0',
                  roleBadge(myRole).cls
                )}
              >
                {roleBadge(myRole).label}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {activeConv.type === 'direct' ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-[#54656f]"
              disabled={!dmCallButtonState.canCall}
              onClick={() => onStartCall('voice')}
              title={getCallButtonTitle('voice', dmCallButtonState)}
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-[#54656f]"
              disabled={!dmCallButtonState.canCall}
              onClick={() => onStartCall('video')}
              title={getCallButtonTitle('video', dmCallButtonState)}
            >
              <Video className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-[#54656f] opacity-70"
              onClick={onShowPremiumCall}
              title="Group voice call"
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-[#54656f] opacity-70"
              onClick={onShowPremiumCall}
              title="Group video call"
            >
              <Video className="h-4 w-4" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-[#54656f] hidden sm:flex"
          title="Search in conversation"
        >
          <Search className="h-4 w-4" />
        </Button>
        {isGroupOrChannel && canIAddMembers && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-full text-xs hidden md:flex"
            onClick={onOpenManage}
          >
            <Users className="h-3.5 w-3.5 mr-1" />
            Details
          </Button>
        )}
        {isGroupOrChannel && canIManageSettings && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-[#54656f]"
            onClick={onOpenSettings}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
