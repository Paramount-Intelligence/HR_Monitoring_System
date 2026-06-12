export const CALL_EVENT_TYPES = new Set([
  'call_incoming',
  'incoming_call',
  'call_accepted',
  'call_declined',
  'call_cancelled',
  'call_ended',
  'call_missed',
  'call_failed',
  'call_ringing',
  'call_started',
  'call_timeout',
  'call_signal',
]);

export interface CallEventPayload {
  call_session_id: string;
  conversation_id: string;
  call_type: string;
  started_by_name?: string;
  status?: string;
}
