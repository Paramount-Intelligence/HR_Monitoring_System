export type CallType = 'voice' | 'video';

export type RecordingType = 'audio' | 'video';

export type RecordingStatus =
  | 'idle'
  | 'preparing'
  | 'recording'
  | 'stopping'
  | 'uploading'
  | 'uploaded'
  | 'failed'
  | 'unsupported';

export type CallStatus =
  | 'idle'
  | 'incoming'
  | 'outgoing'
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'declined'
  | 'missed'
  | 'failed';

export type CallPhase = 'idle' | 'incoming' | 'outgoing' | 'active' | 'ended';

/** Backend call session shape from API */
export interface CallSessionResponse {
  id: string;
  conversation_id: string;
  started_by_id: string;
  call_type: CallType;
  status: string;
  started_at: string | null;
  accepted_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface CallSession {
  callId: string;
  conversationId: string;
  callType: CallType;
  status: CallStatus;
  callerId: string;
  receiverId: string | null;
  participantName: string;
  callerName: string;
  startedAt: string | null;
  connectedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  isRecordingNoticeVisible: boolean;
  errorMessage: string | null;
  isCaller: boolean;
}
