import apiClient from './client';


export interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  recipient_user_id: string;
  related_entity_type: string;
  related_entity_id: string;
  email_status: string;
  status: 'OPEN' | 'RESOLVED';
  title: string;
  message: string;
  created_at: string;
  resolved_at: string | null;
}

export const alertsApi = {
  getAlerts: async () => {
    const response = await apiClient.get<Alert[]>('/alerts');
    return response.data;
  },

  resolveAlert: async (id: string) => {
    const response = await apiClient.patch<Alert>(`/alerts/${id}/resolve`);
    return response.data;
  }
};
