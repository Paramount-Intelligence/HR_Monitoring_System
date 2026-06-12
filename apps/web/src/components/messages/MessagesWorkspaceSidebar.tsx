'use client';

import { useState } from 'react';
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
  ChevronDown,
  ChevronRight,
  AtSign,
  FileText,
  Phone,
  GitBranch,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SidebarFilter,
  getConversationDisplayName,
  getConversationPreview,
  getDirectParticipant,
  formatMessageTime,
  matchesSearch,
  filterBySidebarFilter,
  getContextThreadLabel,
} from './messages-utils';

interface MessagesWorkspaceSidebarProps {
  conversations: Conversation[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sidebarFilter: SidebarFilter;
  onSidebarFilterChange: (filter: SidebarFilter) => void;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewMessage: () => void;
  currentUserId?: string;
  visible: boolean;
}

const PRIMARY_LINKS: { id: SidebarFilter; label: string; icon: typeof MessageSquare }[] = [
  { id: 'threads', label: 'Threads', icon: GitBranch },
  { id: 'mentions', label: 'Mentions', icon: AtSign },
  { id: 'drafts', label: 'Drafts', icon: Pencil },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'calls', label: 'Calls', icon: Phone },
];

function SectionHeader({
  title,
  collapsed,
  onToggle,
  count,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
    >
      {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      <span>{title}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="ml-auto text-[9px] font-semibold tabular-nums">{count}</span>
      )}
    </button>
  );
}

function ConversationRow({
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
  const isChannel = conv.type === 'channel';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-all group',
        isSelected
          ? 'bg-[var(--accent-primary)]/12 text-[var(--text-primary)] border border-[var(--accent-primary)]/25'
          : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-transparent'
      )}
    >
      {directUser ? (
        <UserProfilePicture
          user={directUser}
          name={directUser.full_name}
          size="sm"
          className="h-7 w-7 shrink-0 ring-1 ring-[var(--border-subtle)]"
        />
      ) : (
        <div
          className={cn(
            'h-7 w-7 rounded-md flex items-center justify-center shrink-0 text-[var(--accent-primary)]',
            isSelected ? 'bg-[var(--accent-primary)]/15' : 'bg-[var(--bg-subtle)]'
          )}
        >
          {isChannel ? <Hash className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-xs font-semibold truncate', isSelected && 'text-[var(--text-primary)]')}>
            {isChannel ? `# ${name}` : name}
          </span>
          {conv.updated_at && (
            <span className="text-[9px] text-[var(--text-muted)] shrink-0 tabular-nums">
              {formatMessageTime(conv.updated_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-[10px] truncate text-[var(--text-muted)]">{preview}</span>
          {(conv.unread_count ?? 0) > 0 && (
            <span className="h-4 min-w-4 px-1 rounded-full bg-[var(--accent-primary)] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
              {conv.unread_count}
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
  sidebarFilter,
  onSidebarFilterChange,
  selectedConversationId,
  onSelectConversation,
  onNewMessage,
  currentUserId,
  visible,
}: MessagesWorkspaceSidebarProps) {
  const [collapsed, setCollapsed] = useState({
    channels: false,
    dms: false,
    groups: false,
    context: false,
  });

  const filtered = conversations.filter(
    (c) =>
      matchesSearch(c, searchQuery, currentUserId) &&
      filterBySidebarFilter(c, sidebarFilter, currentUserId)
  );

  const channels = filtered.filter((c) => c.type === 'channel');
  const directMessages = filtered.filter((c) => c.type === 'direct');
  const groups = filtered.filter((c) => c.type === 'group');
  const contextThreads = filtered.filter((c) => c.type.endsWith('_thread'));

  const toggleSection = (key: keyof typeof collapsed) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!visible) return null;

  return (
    <aside className="flex flex-col h-full min-h-0 w-full lg:w-[280px] xl:w-[300px] shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-elevated)] dark:bg-[#0f172a]">
      {/* Workspace header */}
      <div className="shrink-0 px-3 pt-3 pb-2 border-b border-[var(--border-subtle)] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">PIMS</p>
            <h1 className="text-sm font-bold text-[var(--text-primary)] truncate">Messages</h1>
          </div>
          <Button size="sm" className="h-8 rounded-lg text-xs shrink-0" onClick={onNewMessage}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search messages, people, channels"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>
      </div>

      {/* Primary links */}
      <div className="shrink-0 px-2 py-2 border-b border-[var(--border-subtle)] space-y-0.5">
        <button
          type="button"
          onClick={() => onSidebarFilterChange('home')}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors',
            sidebarFilter === 'home'
              ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          All conversations
        </button>
        {PRIMARY_LINKS.map((link) => (
          <button
            key={link.id}
            type="button"
            onClick={() => onSidebarFilterChange(link.id)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors',
              sidebarFilter === link.id
                ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            )}
          >
            <link.icon className="h-3.5 w-3.5" />
            {link.label}
          </button>
        ))}
      </div>

      {/* Scrollable conversation sections */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-1 py-2">
        {loading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" />
            Loading…
          </div>
        ) : sidebarFilter === 'drafts' ? (
          <div className="px-3 py-8 text-center text-xs text-[var(--text-muted)]">
            No drafts saved yet.
          </div>
        ) : sidebarFilter === 'files' ? (
          <div className="px-3 py-8 text-center text-xs text-[var(--text-muted)]">
            Select a conversation to view shared files.
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-[var(--text-muted)]">
            No conversations found.
          </div>
        ) : (
          <>
            {channels.length > 0 && (
              <div className="mb-3">
                <SectionHeader
                  title="Channels"
                  collapsed={collapsed.channels}
                  onToggle={() => toggleSection('channels')}
                  count={channels.length}
                />
                {!collapsed.channels && (
                  <div className="space-y-0.5 mt-0.5">
                    {channels.map((conv) => (
                      <ConversationRow
                        key={conv.id}
                        conv={conv}
                        isSelected={selectedConversationId === conv.id}
                        onSelect={() => onSelectConversation(conv.id)}
                        currentUserId={currentUserId}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {directMessages.length > 0 && (
              <div className="mb-3">
                <SectionHeader
                  title="Direct Messages"
                  collapsed={collapsed.dms}
                  onToggle={() => toggleSection('dms')}
                  count={directMessages.length}
                />
                {!collapsed.dms && (
                  <div className="space-y-0.5 mt-0.5">
                    {directMessages.map((conv) => (
                      <ConversationRow
                        key={conv.id}
                        conv={conv}
                        isSelected={selectedConversationId === conv.id}
                        onSelect={() => onSelectConversation(conv.id)}
                        currentUserId={currentUserId}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {groups.length > 0 && (
              <div className="mb-3">
                <SectionHeader
                  title="Groups"
                  collapsed={collapsed.groups}
                  onToggle={() => toggleSection('groups')}
                  count={groups.length}
                />
                {!collapsed.groups && (
                  <div className="space-y-0.5 mt-0.5">
                    {groups.map((conv) => (
                      <ConversationRow
                        key={conv.id}
                        conv={conv}
                        isSelected={selectedConversationId === conv.id}
                        onSelect={() => onSelectConversation(conv.id)}
                        currentUserId={currentUserId}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {contextThreads.length > 0 && (
              <div className="mb-3">
                <SectionHeader
                  title="Context Threads"
                  collapsed={collapsed.context}
                  onToggle={() => toggleSection('context')}
                  count={contextThreads.length}
                />
                {!collapsed.context && (
                  <div className="space-y-0.5 mt-0.5">
                    {contextThreads.map((conv) => (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => onSelectConversation(conv.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-all',
                          selectedConversationId === conv.id
                            ? 'bg-[var(--accent-primary)]/12 border border-[var(--accent-primary)]/25'
                            : 'hover:bg-[var(--bg-subtle)] border border-transparent'
                        )}
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">
                            {getConversationDisplayName(conv, currentUserId)}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {getContextThreadLabel(conv.type)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}