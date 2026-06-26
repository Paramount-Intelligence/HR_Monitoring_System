'use client';

import { cn } from '@/lib/utils';
import type { Conversation } from '@/lib/api/messages';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import {
  Search,
  Plus,
  Hash,
  Users,
  MessageSquare,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type ChatListFilter,
  getConversationDisplayName,
  getConversationPreview,
  getConversationTypeBadge,
  getDirectParticipant,
  formatConversationListTime,
  matchesSearch,
  filterByChatListFilter,
} from './messages-utils';

interface MessagesWorkspaceSidebarProps {
  conversations: Conversation[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  chatListFilter: ChatListFilter;
  onChatListFilterChange: (filter: ChatListFilter) => void;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewMessage: () => void;
  onOpenSettings: () => void;
  currentUserId?: string;
  visible: boolean;
}

const FILTER_CHIPS: { id: ChatListFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'favourites', label: 'Favourites' },
  { id: 'groups', label: 'Groups' },
];

function ConversationListItem({
  conv,
  isSelected,
  onSelect,
  currentUserId,
}: {
  conv: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  currentUserId?: string;
}) {
  const name = getConversationDisplayName(conv, currentUserId);
  const preview = getConversationPreview(conv);
  const directUser = getDirectParticipant(conv, currentUserId);
  const typeBadge = getConversationTypeBadge(conv.type);
  const showTypeBadge = conv.type !== 'direct';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-3 min-h-[72px] text-left transition-colors border-b border-[var(--border-subtle)]/60',
        isSelected
          ? 'bg-[#f0f2f5] dark:bg-[#2a3942]'
          : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
      )}
    >
      <div className="relative shrink-0">
        {directUser ? (
          <UserProfilePicture
            user={directUser}
            userId={directUser.id}
            name={directUser.full_name}
            size="lg"
            className="h-12 w-12"
            showPresence
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-[#dfe5e7] dark:bg-[#374248] flex items-center justify-center text-[#54656f] dark:text-[#aebac1]">
            {conv.type === 'channel' ? (
              <Hash className="h-5 w-5" />
            ) : (
              <Users className="h-5 w-5" />
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
            {name}
          </span>
          {conv.updated_at && (
            <span
              className={cn(
                'text-[11px] shrink-0 tabular-nums',
                (conv.unread_count ?? 0) > 0
                  ? 'text-[#25d366] font-semibold'
                  : 'text-[#667781] dark:text-[#8696a0]'
              )}
            >
              {formatConversationListTime(conv.updated_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {showTypeBadge && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[#e9edef] dark:bg-[#374248] text-[#54656f] dark:text-[#aebac1]">
                {typeBadge}
              </span>
            )}
            <span className="text-[13px] truncate text-[#667781] dark:text-[#8696a0]">
              {preview}
            </span>
          </div>
          {(conv.unread_count ?? 0) > 0 && (
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#25d366] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
              {conv.unread_count! > 99 ? '99+' : conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function MessagesWorkspaceSidebar({
  conversations,
  loading,
  searchQuery,
  onSearchChange,
  chatListFilter,
  onChatListFilterChange,
  selectedConversationId,
  onSelectConversation,
  onNewMessage,
  onOpenSettings,
  currentUserId,
  visible,
}: MessagesWorkspaceSidebarProps) {
  const filtered = conversations
    .filter(
      (c) =>
        matchesSearch(c, searchQuery, currentUserId) &&
        filterByChatListFilter(c, chatListFilter)
    )
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  if (!visible) return null;

  return (
    <aside className="flex flex-col h-full min-h-0 w-full lg:w-[360px] shrink-0 border-r border-[var(--border-subtle)] bg-white dark:bg-[#111b21]">
      <div className="shrink-0 px-4 pt-4 pb-3 bg-[#f0f2f5] dark:bg-[#202c33]">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h1 className="text-xl font-semibold text-[#111b21] dark:text-[#e9edef]">Chats</h1>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-[#54656f] hover:bg-[#e9edef] dark:hover:bg-[#374248]"
              onClick={onNewMessage}
              title="New chat"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-[#54656f] hover:bg-[#e9edef] dark:hover:bg-[#374248]"
              title="More options"
              onClick={onOpenSettings}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667781]" />
          <input
            type="text"
            placeholder="Search or start a new chat"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg bg-white dark:bg-[#2a3942] border-0 focus:outline-none focus:ring-1 focus:ring-[#25d366]/40 text-[#111b21] dark:text-[#e9edef] placeholder:text-[#667781]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onChatListFilterChange(chip.id)}
              className={cn(
                'shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                chatListFilter === chip.id
                  ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] border-[#25d366]/30'
                  : 'bg-white dark:bg-[#2a3942] text-[#54656f] dark:text-[#aebac1] border-[#e9edef] dark:border-[#374248] hover:bg-[#f5f6f6]'
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-white dark:bg-[#111b21]">
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-sm text-[#667781]">
            <Loader2 className="h-5 w-5 animate-spin text-[#25d366]" />
            Loading chats…
          </div>
        ) : chatListFilter === 'favourites' ? (
          <div className="px-4 py-12 text-center text-sm text-[#667781]">
            No favourites yet.
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[#667781]">
            {searchQuery.trim() ? 'No conversations match your search' : 'No conversations found'}
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationListItem
              key={conv.id}
              conv={conv}
              isSelected={selectedConversationId === conv.id}
              onSelect={() => onSelectConversation(conv.id)}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>
    </aside>
  );
}
