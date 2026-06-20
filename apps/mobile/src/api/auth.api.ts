import { apiClient } from './client';
import { getRefreshToken } from '../auth/token-service';
import type {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  WsTicketResponse,
} from '../types/auth';

export async function loginRequest(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function forgotPasswordRequest(
  payload: ForgotPasswordRequest
): Promise<ForgotPasswordResponse> {
  const { data } = await apiClient.post<ForgotPasswordResponse>(
    '/auth/forgot-password',
    payload
  );
  return data;
}

/** Issue a short-lived single-use WebSocket ticket. Never persist or log the ticket. */
export async function fetchWsTicket(): Promise<string | null> {
  try {
    const { data } = await apiClient.post<WsTicketResponse>('/auth/ws-ticket');
    return data.ticket ?? null;
  } catch {
    return null;
  }
}

export async function logoutRequest(): Promise<void> {
  try {
    const refreshToken = await getRefreshToken();
    await apiClient.post('/auth/logout', refreshToken ? { refresh_token: refreshToken } : {});
  } catch {
    // Logout locally even if backend call fails
  }
}
