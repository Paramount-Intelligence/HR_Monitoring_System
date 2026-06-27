import apiClient from '@/lib/api/client';

export interface UserPresenceSummary {
  online_state: 'online' | 'offline';
  is_online: boolean;
  presence_status: 'active' | 'away';
  presence_updated_at?: string | null;
  last_seen_at?: string | null;
  platforms?: string[];
}

export const presenceApi = {
  getUsersPresence: async (userIds: string[]) => {
    if (!userIds.length) return { users: {} as Record<string, UserPresenceSummary> };
    const response = await apiClient.get<{ users: Record<string, UserPresenceSummary> }>(
      '/presence/users',
      { params: { ids: userIds.join(',') } },
    );
    return response.data;
  },
};
