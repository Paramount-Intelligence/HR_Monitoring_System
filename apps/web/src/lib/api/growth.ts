import apiClient from './client';

export interface Goal {
  id: string;
  title: string;
  description: string;
  target_date: string;
  status: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
}

export interface Note {
  id: string;
  content: string;
  created_at: string;
}

export interface GrowthRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  achievement_date: string;
}

export const growthApi = {
  getGoals: async () => {
    const response = await apiClient.get<Goal[]>('/growth/goals');
    return response.data;
  },
  createGoal: async (data: any) => {
    const response = await apiClient.post<Goal>('/growth/goals', data);
    return response.data;
  },
  getAchievements: async () => {
    const response = await apiClient.get<Achievement[]>('/growth/achievements');
    return response.data;
  },
  getNotes: async () => {
    const response = await apiClient.get<Note[]>('/growth/notes');
    return response.data;
  },
  createNote: async (content: string) => {
    const response = await apiClient.post<Note>('/growth/notes', { 
      content,
      note_date: new Date().toISOString().split('T')[0]
    });
    return response.data;
  },
  getTeamGrowth: async () => {
    const response = await apiClient.get<GrowthRecord[]>('/growth/team');
    return response.data;
  }
};

