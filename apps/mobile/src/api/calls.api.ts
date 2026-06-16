import { apiClient } from './client';
import type { CallSessionResponse, CallType } from '../types/calls';

export async function startCall(
  conversationId: string,
  callType: CallType
): Promise<CallSessionResponse> {
  const { data } = await apiClient.post<CallSessionResponse>(
    `/messages/conversations/${conversationId}/calls/start`,
    { call_type: callType }
  );
  return data;
}

export async function acceptCall(callId: string): Promise<CallSessionResponse> {
  const { data } = await apiClient.post<CallSessionResponse>(
    `/messages/calls/${callId}/accept`
  );
  return data;
}

export async function declineCall(callId: string): Promise<CallSessionResponse> {
  const { data } = await apiClient.post<CallSessionResponse>(
    `/messages/calls/${callId}/decline`
  );
  return data;
}

export async function endCall(callId: string): Promise<CallSessionResponse> {
  const { data } = await apiClient.post<CallSessionResponse>(
    `/messages/calls/${callId}/end`
  );
  return data;
}

export async function getIncomingCall(): Promise<CallSessionResponse | null> {
  const { data } = await apiClient.get<CallSessionResponse | null>(
    '/messages/calls/incoming'
  );
  return data;
}

export type CallSignalType = 'offer' | 'answer' | 'ice_candidate' | 'end';

export interface CallSignalResponse {
  id: string;
  call_session_id: string;
  sender_id: string;
  recipient_id: string;
  signal_type: CallSignalType | string;
  payload: unknown;
  created_at: string;
  consumed_at: string | null;
}

export async function sendCallSignal(
  callId: string,
  recipientId: string,
  signalType: CallSignalType,
  payload: unknown
): Promise<CallSignalResponse> {
  const { data } = await apiClient.post<CallSignalResponse>(
    `/messages/calls/${callId}/signal`,
    {
      recipient_id: recipientId,
      signal_type: signalType,
      payload,
    }
  );
  return data;
}

export async function getCallSignals(callId: string): Promise<CallSignalResponse[]> {
  const { data } = await apiClient.get<CallSignalResponse[]>(
    `/messages/calls/${callId}/signals`
  );
  return data;
}

export interface CallRecordingUploadResponse {
  id: string;
  call_session_id: string;
  status: string;
  message?: string;
}

export async function uploadCallRecording(
  callId: string,
  formData: FormData
): Promise<CallRecordingUploadResponse> {
  const { data } = await apiClient.post<CallRecordingUploadResponse>(
    `/calls/${callId}/recordings`,
    formData,
    {
      timeout: 120000,
    }
  );
  return data;
}
