import apiClient from './client';

export const analyticsApi = {
  getBestPerformers: async () => {
    const response = await apiClient.get<any[]>('/analytics/best-performers');
    return response.data;
  },
  getWorkloadBalance: async () => {
    const response = await apiClient.get<any[]>('/analytics/workload-balance');
    return response.data;
  },
  getBurnoutRisks: async () => {
    const response = await apiClient.get<any[]>('/analytics/burnout-risks');
    return response.data;
  }
};
