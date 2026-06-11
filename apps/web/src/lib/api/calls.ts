import apiClient from '@/lib/api/client';

export interface CallRecordingParticipant {
  id: string;
  full_name: string;
  email: string;
  role?: string | null;
  profile_picture_url?: string | null;
}

export interface CallRecordingUser {
  id: string;
  full_name: string;
  email: string;
  profile_picture_url?: string | null;
}

export interface CallRecordingItem {
  id: string;
  call_id: string;
  conversation_id?: string | null;
  recorded_by: CallRecordingUser;
  participants: CallRecordingParticipant[];
  call_type?: string | null;
  recording_type: string;
  duration_seconds?: number | null;
  file_size_bytes: number;
  status: string;
  mime_type: string;
  file_name: string;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface CallRecordingListResponse {
  items: CallRecordingItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface CallRecordingStats {
  total_recordings: number;
  today_recordings: number;
  voice_recordings: number;
  video_recordings: number;
  failed_uploads: number;
  storage_used_bytes: number;
}

export interface CallRecordingFilters {
  search?: string;
  participant_user_id?: string;
  caller_id?: string;
  receiver_id?: string;
  conversation_id?: string;
  call_type?: string;
  recording_type?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export const callsApi = {
  uploadCallRecording: async (callId: string, formData: FormData) => {
    const { data } = await apiClient.post(`/calls/${callId}/recordings`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  adminListCallRecordings: async (filters: CallRecordingFilters = {}): Promise<CallRecordingListResponse> => {
    const { data } = await apiClient.get<CallRecordingListResponse>('/admin/call-recordings', {
      params: filters,
    });
    return data;
  },

  adminGetCallRecordingStats: async (): Promise<CallRecordingStats> => {
    const { data } = await apiClient.get<CallRecordingStats>('/admin/call-recordings/stats');
    return data;
  },

  adminGetCallRecording: async (recordingId: string): Promise<CallRecordingItem> => {
    const { data } = await apiClient.get<CallRecordingItem>(`/admin/call-recordings/${recordingId}`);
    return data;
  },

  adminFetchCallRecordingStreamUrl: async (recordingId: string): Promise<string> => {
    const response = await apiClient.get(`/admin/call-recordings/${recordingId}/stream`, {
      responseType: 'blob',
    });
    return window.URL.createObjectURL(response.data);
  },

  adminGetCallRecordingStreamUrl: (recordingId: string): string => {
    return `/api/v1/admin/call-recordings/${recordingId}/stream`;
  },

  adminDownloadCallRecording: async (recordingId: string, fileName: string) => {
    const response = await apiClient.get(`/admin/call-recordings/${recordingId}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  adminDeleteCallRecording: async (recordingId: string): Promise<CallRecordingItem> => {
    const { data } = await apiClient.delete<CallRecordingItem>(`/admin/call-recordings/${recordingId}`);
    return data;
  },
};
