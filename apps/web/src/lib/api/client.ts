import axios from 'axios';

// Always use Next.js local proxy from browser
export const API_URL = '/api/v1';

console.log('[API Client] Base URL:', API_URL);

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to extract a readable error message from standardized backend responses
export const getErrorMessage = (error: any): string => {
  const errorData = error.response?.data?.error;

  if (errorData) {
    if (errorData.code === 'VALIDATION_ERROR' && Array.isArray(errorData.details)) {
      return errorData.details
        .map((d: any) => `${d.loc[d.loc.length - 1] || d.loc.join('.')}: ${d.msg}`)
        .join(' | ');
    }

    return errorData.message || 'An unexpected error occurred';
  }

  const detail = error.response?.data?.detail;

  if (detail) {
    if (typeof detail === 'string') return detail;

    if (Array.isArray(detail)) {
      return detail
        .map((d: any) => {
          const fieldName = d.loc[d.loc.length - 1] || d.loc.join('.');
          return `${fieldName}: ${d.msg}`;
        })
        .join(' | ');
    }
  }

  return error.message || 'An unexpected error occurred';
};

// Add JWT token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Refresh token handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !originalRequest._retry
    ) {
      if (
        !originalRequest.url.includes('/auth/refresh') &&
        !originalRequest.url.includes('/auth/login')
      ) {
        originalRequest._retry = true;

        try {
          const refresh_token = localStorage.getItem('refresh_token');

          if (!refresh_token) {
            throw new Error('No refresh token');
          }

          const res = await axios.post(
            `${API_URL}/auth/refresh`,
            { refresh_token },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          const { access_token, refresh_token: new_refresh_token } = res.data;

          localStorage.setItem('access_token', access_token);

          if (new_refresh_token) {
            localStorage.setItem('refresh_token', new_refresh_token);
          }

          originalRequest.headers.Authorization = `Bearer ${access_token}`;

          return apiClient(originalRequest);
        } catch (refreshError) {
          window.dispatchEvent(new Event('auth:unauthorized'));
          return Promise.reject(refreshError);
        }
      }

      if (originalRequest.url.includes('/auth/refresh')) {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;