import apiClient from './client';

export interface AuditLog {
  id: string;
  actor_user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  old_value: any;
  new_value: any;
  extra_metadata: any;
  created_at: string;
}

export const auditLogsApi = {
  getAuditLogs: async () => {
    const response = await apiClient.get<AuditLog[]>('/audit-logs');
    return response.data;
  }
};
