import apiClient from './client';

export interface UserMinimal {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  response_status: 'accepted' | 'declined' | 'pending';
  user: UserMinimal;
}

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  meeting_link: string | null;
  location: string | null;
  status: 'scheduled' | 'cancelled';
  organizer_id: string;
  organizer: UserMinimal;
  participants: MeetingParticipant[];
  created_at: string;
  updated_at: string;
}

export interface MeetingCreateInput {
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  meeting_link?: string;
  location?: string;
  participants: string[]; // UUID strings
}

export interface MeetingUpdateInput {
  title?: string;
  description?: string;
  start_at?: string;
  end_at?: string;
  meeting_link?: string;
  location?: string;
  participants?: string[];
}

export const meetingsApi = {
  getMeetings: async (scope?: 'all'): Promise<Meeting[]> => {
    const response = await apiClient.get<Meeting[]>('/meetings', {
      params: scope ? { scope } : {},
    });
    return response.data;
  },

  getUpcomingMeetings: async (): Promise<Meeting[]> => {
    const response = await apiClient.get<Meeting[]>('/meetings/upcoming');
    return response.data;
  },

  getTodayMeetings: async (scope?: 'all'): Promise<Meeting[]> => {
    const response = await apiClient.get<Meeting[]>('/meetings/today', {
      params: scope ? { scope } : {},
    });
    return response.data;
  },

  getMeeting: async (meetingId: string): Promise<Meeting> => {
    const response = await apiClient.get<Meeting>(`/meetings/${meetingId}`);
    return response.data;
  },

  createMeeting: async (payload: MeetingCreateInput): Promise<Meeting> => {
    const response = await apiClient.post<Meeting>('/meetings', payload);
    return response.data;
  },

  updateMeeting: async (meetingId: string, payload: MeetingUpdateInput): Promise<Meeting> => {
    const response = await apiClient.patch<Meeting>(`/meetings/${meetingId}`, payload);
    return response.data;
  },

  cancelMeeting: async (meetingId: string): Promise<Meeting> => {
    const response = await apiClient.post<Meeting>(`/meetings/${meetingId}/cancel`);
    return response.data;
  },

  respondMeeting: async (meetingId: string, responseStatus: 'accepted' | 'declined' | 'pending'): Promise<Meeting> => {
    const response = await apiClient.post<Meeting>(`/meetings/${meetingId}/respond`, {
      response_status: responseStatus,
    });
    return response.data;
  },
};
