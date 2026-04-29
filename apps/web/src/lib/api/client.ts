import axios from 'axios';

// Ensure the API URL is properly set for development
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to extract a readable error message from standardized backend responses
export const getErrorMessage = (error: any): string => {
  const errorData = error.response?.data?.error;
  
  if (errorData) {
    if (errorData.code === 'VALIDATION_ERROR' && Array.isArray(errorData.details)) {
      return errorData.details.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join(', ');
    }
    return errorData.message || 'An unexpected error occurred';
  }

  // Fallback for non-standard or direct FastAPI errors (e.g. before handler catches)
  const detail = error.response?.data?.detail;
  if (detail) {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join(', ');
    }
  }
  
  return error.message || 'An unexpected error occurred';
};

// Add a request interceptor to attach the JWT
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

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      if (!error.config.url.includes('/auth/refresh') && !error.config.url.includes('/auth/login')) {
         window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
