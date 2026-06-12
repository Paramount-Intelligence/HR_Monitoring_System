import type { Conversation, ConversationType, Message, MessageAttachment } from '@/lib/api/messages';
import { format, isValid, parseISO } from 'date-fns';

export type SidebarFilter = 'home' | 'threads' | 'mentions' | 'drafts' | 'files' | 'calls';
export type ConversationPanelTab = 'messages' | 'files' | 'calls' | 'details';

export function getConversationDisplayName(
  conv: Conversation,
  currentUserId?: string
): string {
  if (conv.title?.trim()) return conv.title.trim();
  if (conv.type === 'direct') {
    const other = conv.participants.find((p) => p.user_id !== currentUserId);
    return other?.user.full_name || 'Direct Message';
  }
  return 'Conversation';
}

export function getConversationPreview(conv: Conversation): string {
  const body = conv.last_message?.body?.trim();
  if (!body) return 'No messages yet';
  if (conv.last_message?.sender_name) {
    return `${conv.last_message.sender_name}: ${body}`;
  }
  return body;
}

export function getDirectParticipant(conv: Conversation, currentUserId?: string) {
  if (conv.type !== 'direct') return null;
  return conv.participants.find((p) => p.user_id !== currentUserId)?.user ?? null;
}

export function formatMessageTime(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return '—';
    return format(d, 'h:mm a');
  } catch {
    return '—';
  }
}

export function formatMessageDateDivider(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return '—';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return 'Today';
    if (format(d, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) return 'Yesterday';
    return format(d, 'MMMM d, yyyy');
  } catch {
    return '—';
  }
}

export function groupMessagesByDate(messages: Message[]): { date: string; items: Message[] }[] {
  const groups: { date: string; items: Message[] }[] = [];
  let currentDate = '';
  messages.forEach((msg) => {
    const divider = formatMessageDateDivider(msg.created_at);
    if (divider !== currentDate) {
      currentDate = divider;
      groups.push({ date: divider, items: [msg] });
    } else {
      groups[groups.length - 1].items.push(msg);
    }
  });
  return groups;
}

export function collectAttachments(messages: Message[]): MessageAttachment[] {
  const files: MessageAttachment[] = [];
  messages.forEach((m) => {
    if (m.attachments?.length) files.push(...m.attachments);
  });
  return files;
}

export function collectCallEvents(messages: Message[]): Message[] {
  return messages.filter(
    (m) =>
      m.message_type === 'system' &&
      /call|ringing|missed|declined|ended|voice|video/i.test(m.body || '')
  );
}

export function getContextThreadLabel(type: ConversationType): string {
  switch (type) {
    case 'task_thread':
      return 'Task';
    case 'project_thread':
      return 'Project';
    case 'support_thread':
      return 'Support';
    case 'meeting_thread':
      return 'Meeting';
    case 'eod_thread':
      return 'EOD';
    case 'approval_thread':
      return 'Approval';
    default:
      return 'Context';
  }
}

export function matchesSearch(conv: Conversation, query: string, currentUserId?: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  const name = getConversationDisplayName(conv, currentUserId).toLowerCase();
  const preview = getConversationPreview(conv).toLowerCase();
  return name.includes(q) || preview.includes(q);
}

export function filterBySidebarFilter(
  conv: Conversation,
  filter: SidebarFilter,
  currentUserId?: string
): boolean {
  switch (filter) {
    case 'home':
      return true;
    case 'threads':
      return conv.type.endsWith('_thread');
    case 'mentions':
      return (conv.unread_count ?? 0) > 0;
    case 'drafts':
      return false;
    case 'files':
      return false;
    case 'calls':
      return conv.type === 'direct' || conv.type === 'group';
    default:
      return true;
  }
}
