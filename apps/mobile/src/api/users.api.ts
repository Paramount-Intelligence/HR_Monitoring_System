import { apiClient } from './client';
import type { User } from '../types/user';
import type { UsersListParams } from '../types/manage';

export async function getUsers(params?: UsersListParams): Promise<User[]> {
  const { data } = await apiClient.get<User[]>('/users', { params });
  return data;
}

export async function getUser(userId: string): Promise<User> {
  const { data } = await apiClient.get<User>(`/users/${userId}`);
  return data;
}

export async function searchUsers(query: string, limit = 20): Promise<User[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { data } = await apiClient.get<User[]>('/users', {
    params: { search: trimmed, limit, status: 'active' },
  });
  return data;
}

export async function getTeamMembers(params?: UsersListParams): Promise<User[]> {
  const { data } = await apiClient.get<User[]>('/users', { params });
  return data;
}
