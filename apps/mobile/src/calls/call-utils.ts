import type { Conversation } from '../types/messages';
import type { CallStatus, CallType } from '../types/calls';

export function formatCallTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function getCallStatusLabel(
  status: CallStatus,
  durationSec: number,
  phase?: string
): string {
  if (status === 'connected') return formatCallTimer(durationSec);
  if (status === 'calling' || status === 'outgoing') return 'Calling…';
  if (status === 'ringing') return 'Ringing…';
  if (status === 'connecting') return 'Connecting…';
  if (status === 'reconnecting') return 'Reconnecting…';
  if (status === 'declined') return 'Call declined';
  if (status === 'missed') return 'No answer';
  if (status === 'failed') return 'Connection failed';
  if (status === 'ended' || phase === 'ended') return 'Call ended';
  if (status === 'incoming') return 'Incoming call';
  return 'Connecting…';
}

export function getIncomingCallLabel(callType: CallType): string {
  return callType === 'video' ? 'Incoming video call' : 'Incoming voice call';
}

export function getOutgoingCallTypeLabel(callType: CallType): string {
  return callType === 'video' ? 'Video call' : 'Voice call';
}

export function canStartCallInConversation(
  conversation: Conversation | null | undefined,
  currentUserId?: string
): boolean {
  if (!conversation || !currentUserId) return false;
  if (conversation.type !== 'direct') return false;
  const others = conversation.participants.filter((p) => p.user_id !== currentUserId);
  return others.length === 1;
}

export function getDirectChatParticipant(
  conversation: Conversation | null | undefined,
  currentUserId?: string
): { userId: string; name: string } | null {
  if (!conversation || !currentUserId) return null;
  const other = conversation.participants.find((p) => p.user_id !== currentUserId);
  if (!other) return null;
  return {
    userId: other.user_id,
    name: other.user.full_name || other.user.email || 'Direct Call',
  };
}

export function isCallSystemMessage(body: string, messageType?: string): boolean {
  if (messageType === 'system') return true;
  const normalized = body.toLowerCase();
  return (
    normalized.includes('call ended') ||
    normalized.includes('missed') && normalized.includes('call') ||
    normalized.includes('voice call') ||
    normalized.includes('video call')
  );
}

export function mapBackendCallStatus(status: string): CallStatus {
  switch (status) {
    case 'ringing':
      return 'ringing';
    case 'active':
      return 'connected';
    case 'declined':
      return 'declined';
    case 'missed':
      return 'missed';
    case 'ended':
      return 'ended';
    default:
      return 'connecting';
  }
}
