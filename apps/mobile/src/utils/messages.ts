import type { Message, MessageAttachment } from '../types/messages';
import { formatDurationSeconds, formatTime12h } from './date-time';

export { formatDurationSeconds };

export const VOICE_NOTE_MAX_SECONDS = 60;
export const VOICE_NOTE_MAX_BYTES = 2 * 1024 * 1024;
export const VOICE_NOTE_FILENAME_PREFIX = 'voice-note-';

const VOICE_NOTE_FILENAME_RE = /^voice-note-(\d+)\.(m4a|mp4|aac|mp3|wav|webm|ogg|caf|3gp)$/i;

export function buildVoiceNoteFilename(durationSeconds: number): string {
  const seconds = Math.max(1, Math.min(VOICE_NOTE_MAX_SECONDS, Math.round(durationSeconds)));
  return `${VOICE_NOTE_FILENAME_PREFIX}${seconds}.m4a`;
}

export function parseVoiceNoteDurationSeconds(attachment: MessageAttachment): number | null {
  const match = attachment.original_file_name.match(VOICE_NOTE_FILENAME_RE);
  if (match?.[1]) {
    const parsed = Number.parseInt(match[1], 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export function isAudioAttachment(attachment: MessageAttachment): boolean {
  const mime = attachment.mime_type?.toLowerCase() ?? '';
  if (mime.startsWith('audio/')) return true;
  const ext = attachment.original_file_name.split('.').pop()?.toLowerCase() ?? '';
  return ['m4a', 'mp4', 'aac', 'mp3', 'wav', 'webm', 'ogg', 'caf', '3gp'].includes(ext);
}

export function isVoiceNoteAttachment(attachment: MessageAttachment): boolean {
  if (!isAudioAttachment(attachment)) return false;
  if (attachment.original_file_name.toLowerCase().startsWith(VOICE_NOTE_FILENAME_PREFIX)) {
    return true;
  }
  return isAudioAttachment(attachment);
}

export function isVoiceNoteMessage(message: Message): boolean {
  if (message.is_deleted) return false;
  const attachments = message.attachments ?? [];
  return attachments.some((attachment) => isVoiceNoteAttachment(attachment));
}

export function getVoiceNoteAttachment(message: Message): MessageAttachment | null {
  const attachments = message.attachments ?? [];
  return attachments.find((attachment) => isVoiceNoteAttachment(attachment)) ?? null;
}

export function getVoiceNoteDuration(message: Message): number {
  if (message.clientVoiceDuration) return message.clientVoiceDuration;
  const attachment = getVoiceNoteAttachment(message);
  if (!attachment) return 0;
  return parseVoiceNoteDurationSeconds(attachment) ?? 0;
}

export function formatMessageTime(dateStr: string): string {
  return formatTime12h(dateStr);
}

export function getConversationDisplayName(
  conv: import('../types/messages').Conversation,
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

export function getConversationPreview(conv: import('../types/messages').Conversation): string {
  const body = conv.last_message?.body?.trim();
  if (!conv.last_message) return 'No messages yet';
  if (
    !body ||
    /sent an attachment/i.test(body) ||
    /voice message/i.test(body)
  ) {
    return 'Voice message';
  }
  if (conv.last_message?.sender_name) {
    return `${conv.last_message.sender_name}: ${body}`;
  }
  return body;
}

export function getDirectParticipant(
  conv: import('../types/messages').Conversation,
  currentUserId?: string
) {
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

export function matchesConversationSearch(
  conv: import('../types/messages').Conversation,
  query: string,
  currentUserId?: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = getConversationDisplayName(conv, currentUserId).toLowerCase();
  const preview = getConversationPreview(conv).toLowerCase();
  return name.includes(q) || preview.includes(q);
}

export function isCallPreviewMessage(body?: string | null): boolean {
  if (!body) return false;
  const lower = body.toLowerCase();
  return lower.includes('call') || lower.includes('video');
}
