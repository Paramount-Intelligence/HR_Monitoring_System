import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { API_BASE_URL } from '../constants/env';

import {

  clearTokens,

  getAccessToken,

  getRefreshToken,

  saveAccessToken,

  saveTokens,

} from '../auth/token-service';

import type { RefreshResponse } from '../types/auth';

import {

  getFriendlyErrorMessage,

  isForbiddenError,

  isNetworkError,

  isTimeoutError,

} from './api-error';



export {

  getFriendlyErrorMessage,

  getErrorMessage,

  isForbiddenError,

  isNetworkError,

  isTimeoutError,

  isAuthError,

  normalizeApiError,

} from './api-error';



type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };



let refreshPromise: Promise<string | null> | null = null;

let unauthorizedHandler: (() => void) | null = null;



export function setUnauthorizedHandler(handler: () => void): void {

  unauthorizedHandler = handler;

}



export async function refreshAccessToken(): Promise<string | null> {

  if (refreshPromise) return refreshPromise;



  refreshPromise = (async () => {

    const refreshToken = await getRefreshToken();

    if (!refreshToken) return null;



    try {

      const { data } = await axios.post<RefreshResponse>(

        `${API_BASE_URL}/auth/refresh`,

        { refresh_token: refreshToken },

        { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }

      );



      if (data.refresh_token) {
        await saveTokens(data.access_token, data.refresh_token);
      } else {
        await saveAccessToken(data.access_token);
      }

      return data.access_token;

    } catch {

      await clearTokens();

      unauthorizedHandler?.();

      return null;

    } finally {

      refreshPromise = null;

    }

  })();



  return refreshPromise;

}



export const apiClient = axios.create({

  baseURL: API_BASE_URL,

  timeout: 30000,

  headers: {

    'Content-Type': 'application/json',

    Accept: 'application/json',

  },

});



apiClient.interceptors.request.use(async (config) => {

  const token = await getAccessToken();

  if (token) {

    config.headers.Authorization = `Bearer ${token}`;

  }

  if (config.data instanceof FormData) {
    config.headers.Accept = 'application/json';
    delete config.headers['Content-Type'];
    config.transformRequest = [(data) => data];
  }

  return config;

});



apiClient.interceptors.response.use(

  (response) => response,

  async (error: AxiosError) => {

    const originalRequest = error.config as RetriableConfig | undefined;

    if (!originalRequest || originalRequest._retry) {

      return Promise.reject(error);

    }



    const status = error.response?.status;

    const url = originalRequest.url ?? '';



    if (

      status === 401 &&

      !url.includes('/auth/login') &&

      !url.includes('/auth/refresh')

    ) {

      originalRequest._retry = true;

      const newToken = await refreshAccessToken();

      if (newToken) {

        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return apiClient(originalRequest);

      }

    }



    return Promise.reject(error);

  }

);


