import { apiClient } from './client';
import type { User } from '../types/user';

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/users/me');
  return data;
}
