import { apiClient } from './client';
import type { LoginRequest, LoginResponse } from '../types/auth';

export async function loginRequest(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function logoutRequest(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // Logout locally even if backend call fails
  }
}
