import type { Conversation, Message } from '../types/messages';
import { formatTime } from './format';

export function getConversationDisplayName(
  conv: Conversation,
  currentUserId?: string
): string {
  if (conv.title?.trim()) return conv.title.trim();
  if (conv.type === 'direct') {
    const other = conv.participants.find((p) => p.user_id !== currentUserId);
    return other?.user.full_name || 'Direct Message';
  }
  if (conv.type === 'group') return 'Group Chat';
  if (conv.type === 'channel') return 'Channel';
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

export function getInitialsFromName(name?: string | null): string {
  if (!name?.trim()) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  return formatTime(dateStr);
}

export function formatMessageDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const dateKey = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  if (dateKey(date) === dateKey(today)) return 'Today';
  if (dateKey(date) === dateKey(yesterday)) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

export function shouldShowDateDivider(
  current: Message,
  previous?: Message
): boolean {
  if (!previous) return true;
  const currentDate = formatMessageDateDivider(current.created_at);
  const previousDate = formatMessageDateDivider(previous.created_at);
  return currentDate !== previousDate;
}

export function sortMessagesChronologically(messages: Message[]): Message[] {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function dedupeMessages(messages: Message[]): Message[] {
  const seen = new Set<string>();
  const result: Message[] = [];
  for (const message of messages) {
    const key = message.id || message.clientId;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(message);
  }
  return result;
}
