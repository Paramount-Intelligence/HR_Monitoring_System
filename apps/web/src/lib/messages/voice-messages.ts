import apiClient from '@/lib/api/client';
import type { Message, MessageAttachment } from '@/lib/api/messages';

export const VOICE_NOTE_MAX_SECONDS = 60;
export const VOICE_NOTE_MAX_BYTES = 2 * 1024 * 1024;
export const VOICE_NOTE_FILENAME_PREFIX = 'voice-note-';

const VOICE_NOTE_FILENAME_RE =
  /^voice-note-(\d+)\.(m4a|mp4|aac|mp3|wav|webm|ogg|caf|3gp)$/i;

const AUDIO_EXTENSIONS = new Set([
  'm4a',
  'mp4',
  'aac',
  'mp3',
  'wav',
  'webm',
  'ogg',
  'caf',
  '3gp',
]);

const RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
];

export function formatDurationSeconds(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export function isMediaRecorderSupported(): boolean {
  return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';
}

export function pickRecorderMimeType(): { mimeType: string; extension: string } {
  if (!isMediaRecorderSupported()) {
    return { mimeType: 'audio/webm', extension: 'webm' };
  }
  for (const mimeType of RECORDER_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      if (mimeType.includes('ogg')) return { mimeType, extension: 'ogg' };
      if (mimeType.includes('mp4')) return { mimeType, extension: 'm4a' };
      return { mimeType, extension: 'webm' };
    }
  }
  return { mimeType: 'audio/webm', extension: 'webm' };
}

export function buildVoiceNoteFilename(durationSeconds: number, extension = 'webm'): string {
  const seconds = Math.max(
    1,
    Math.min(VOICE_NOTE_MAX_SECONDS, Math.round(durationSeconds))
  );
  return `${VOICE_NOTE_FILENAME_PREFIX}${seconds}.${extension}`;
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
  return AUDIO_EXTENSIONS.has(ext);
}

export function isVoiceNoteAttachment(attachment: MessageAttachment): boolean {
  if (!isAudioAttachment(attachment)) return false;
  if (
    attachment.original_file_name
      .toLowerCase()
      .startsWith(VOICE_NOTE_FILENAME_PREFIX)
  ) {
    return true;
  }
  return isAudioAttachment(attachment);
}

export function isVoiceNoteMessage(message: Message): boolean {
  if (message.is_deleted) return false;
  return (message.attachments ?? []).some((attachment) =>
    isVoiceNoteAttachment(attachment)
  );
}

export function getVoiceNoteAttachment(
  message: Message
): MessageAttachment | null {
  return (
    (message.attachments ?? []).find((attachment) =>
      isVoiceNoteAttachment(attachment)
    ) ?? null
  );
}

export function getVoiceNoteDuration(message: Message): number {
  const attachment = getVoiceNoteAttachment(message);
  if (!attachment) return 0;
  return parseVoiceNoteDurationSeconds(attachment) ?? 0;
}

export function getVoiceNotePreviewText(message: Message): string {
  return 'Voice message';
}

export async function fetchAuthenticatedAttachmentBlob(
  downloadUrl: string
): Promise<Blob> {
  const relativeUrl = downloadUrl.startsWith('/api/v1')
    ? downloadUrl.slice('/api/v1'.length)
    : downloadUrl;
  const response = await apiClient.get(relativeUrl, { responseType: 'blob' });
  return response.data;
}
