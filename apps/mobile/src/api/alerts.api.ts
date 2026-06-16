import { apiClient } from './client';
import type { AlertApiRecord } from '../types/alert';

export async function getAlerts(): Promise<AlertApiRecord[]> {
  const { data } = await apiClient.get<AlertApiRecord[]>('/alerts');
  return data;
}

export async function resolveAlert(alertId: string): Promise<AlertApiRecord> {
  const { data } = await apiClient.patch<AlertApiRecord>(`/alerts/${alertId}/resolve`);
  return data;
}
