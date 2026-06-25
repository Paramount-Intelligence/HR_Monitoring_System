import type { Conversation, ConversationType, Message, MessageAttachment } from '@/lib/api/messages';
import { htmlToPlainText } from '@/lib/messages/message-sanitize';
import { isVoiceNoteMessage } from '@/lib/messages/voice-messages';
import { format, isValid, parseISO } from 'date-fns';

export type SidebarFilter = 'home' | 'threads' | 'mentions' | 'drafts' | 'files' | 'calls';
export type ChatListFilter = 'all' | 'unread' | 'favourites' | 'groups';
export type ConversationPanelTab = 'messages' | 'files' | 'calls' | 'details';

export const SLACK_GROUP_WINDOW_MS = 5 * 60 * 1000;

export interface SlackMessageRenderItem {
  message: Message;
  showAvatar: boolean;
  showHeader: boolean;
  isContinuation: boolean;
}

export interface ConversationLoadError {
  title: string;
  message: string;
  canRetry: boolean;
}

export function stripMessagePreviewText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.includes('<') && trimmed.includes('>')) {
    return htmlToPlainText(trimmed).replace(/\s+/g, ' ').trim();
  }
  return trimmed.replace(/\s+/g, ' ').trim();
}

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
  if (!conv.last_message) return 'No messages yet';
  const body = stripMessagePreviewText(conv.last_message.body || '');
  if (
    !body ||
    /sent an attachment/i.test(body) ||
    /voice message/i.test(body)
  ) {
    return 'Voice message';
  }
  if (conv.last_message.sender_name) {
    return `${conv.last_message.sender_name}: ${body}`;
  }
  return body;
}

export function getMessagePreviewText(message: Message): string {
  if (message.is_deleted) return 'This message was deleted.';
  if (isVoiceNoteMessage(message)) return 'Voice message';
  const body = stripMessagePreviewText(message.body || '');
  if (body) return body;
  if (message.body_html) {
    const fromHtml = stripMessagePreviewText(message.body_html);
    if (fromHtml) return fromHtml;
  }
  if (message.attachments?.length) return 'Attachment';
  return 'Message';
}

export function getDirectParticipant(conv: Conversation, currentUserId?: string) {
  if (conv.type !== 'direct') return null;
  return conv.participants.find((p) => p.user_id !== currentUserId)?.user ?? null;
}

export function formatConversationListTime(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return '';
    const today = new Date();
    if (format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return format(d, 'h:mm a');
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (format(d, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday';
    }
    return format(d, 'M/d/yy');
  } catch {
    return '';
  }
}

export function getConversationTypeBadge(type: ConversationType): string {
  if (type === 'direct') return 'DM';
  if (type === 'group') return 'Group';
  if (type === 'channel') return 'Channel';
  if (type.endsWith('_thread')) return type.split('_')[0].toUpperCase();
  return 'Chat';
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

export function getSlackMessageRenderItems(
  messages: Message[],
  windowMs: number = SLACK_GROUP_WINDOW_MS
): SlackMessageRenderItem[] {
  const items: SlackMessageRenderItem[] = [];
  let previous: Message | null = null;

  for (const message of messages) {
    if (message.message_type === 'system') {
      items.push({
        message,
        showAvatar: false,
        showHeader: false,
        isContinuation: false,
      });
      previous = null;
      continue;
    }

    const sameSender = Boolean(previous && previous.sender_id === message.sender_id);
    const elapsed = previous
      ? new Date(message.created_at).getTime() - new Date(previous.created_at).getTime()
      : Number.POSITIVE_INFINITY;
    const grouped = sameSender && elapsed <= windowMs;

    items.push({
      message,
      showAvatar: !grouped,
      showHeader: !grouped,
      isContinuation: grouped,
    });
    previous = message;
  }

  return items;
}

export function groupMessagesByDateWithSlack(
  messages: Message[],
  windowMs: number = SLACK_GROUP_WINDOW_MS
): { date: string; items: SlackMessageRenderItem[] }[] {
  return groupMessagesByDate(messages).map((group) => ({
    date: group.date,
    items: getSlackMessageRenderItems(group.items, windowMs),
  }));
}

export function getConversationLoadError(error: unknown): ConversationLoadError {
  const err = error as {
    response?: { status?: number; data?: { detail?: string; error?: { message?: string } } };
    message?: string;
  };
  const status = err.response?.status;
  const detail = err.response?.data?.detail;
  const apiMessage =
    (typeof detail === 'string' && detail) ||
    (typeof err.response?.data?.error?.message === 'string' && err.response.data.error.message) ||
    undefined;

  if (status === 403) {
    return {
      title: 'Access denied',
      message: apiMessage || 'You do not have access to this conversation.',
      canRetry: false,
    };
  }
  if (status === 404) {
    return {
      title: 'Conversation not found',
      message: apiMessage || 'Conversation not found.',
      canRetry: false,
    };
  }
  if (status === 500) {
    return {
      title: 'Could not load conversation',
      message: 'Could not load this conversation. Please try again.',
      canRetry: true,
    };
  }

  return {
    title: 'Could not load conversation',
    message: apiMessage || err.message || 'Could not load this conversation. Please try again.',
    canRetry: true,
  };
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
  const participantMatch = conv.participants.some(
    (p) =>
      p.user.full_name.toLowerCase().includes(q) ||
      (p.user.email || '').toLowerCase().includes(q)
  );
  return name.includes(q) || preview.includes(q) || participantMatch;
}

export function filterByChatListFilter(conv: Conversation, filter: ChatListFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'unread':
      return (conv.unread_count ?? 0) > 0;
    case 'favourites':
      return false;
    case 'groups':
      return conv.type === 'group' || conv.type === 'channel';
    default:
      return true;
  }
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
