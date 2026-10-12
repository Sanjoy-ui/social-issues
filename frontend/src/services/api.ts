import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore.js';

/**
 * Pre-configured Axios instance for frontend-backend communication.
 * `withCredentials: true` is crucial for sending & receiving httpOnly cookies across CORS origins.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token from Zustand store
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle 401 by attempting Refresh Token rotation
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loop on auth endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/v1/citizen/login') &&
      !originalRequest.url?.includes('/api/v1/citizen/register') &&
      !originalRequest.url?.includes('/api/v1/citizen/refresh') &&
      !originalRequest.url?.includes('/api/v1/university/login') &&
      !originalRequest.url?.includes('/api/v1/university/refresh') &&
      !originalRequest.url?.includes('/api/v1/industry/login') &&
      !originalRequest.url?.includes('/api/v1/industry/refresh') &&
      !originalRequest.url?.includes('/api/v1/govt/login') &&
      !originalRequest.url?.includes('/api/v1/govt/refresh') &&
      !originalRequest.url?.includes('/logout')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const currentRole = useAuthStore.getState().role || localStorage.getItem('civic_user_role');
        const refreshUrl =
          currentRole === 'CITIZEN'
            ? `${api.defaults.baseURL}/api/v1/citizen/refresh`
            : currentRole === 'GOVT'
            ? `${api.defaults.baseURL}/api/v1/govt/refresh`
            : currentRole === 'INDUSTRY'
            ? `${api.defaults.baseURL}/api/v1/industry/refresh`
            : `${api.defaults.baseURL}/api/v1/university/refresh`;

        const { data } = await axios.post(
          refreshUrl,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.accessToken;
        useAuthStore.getState().setAccessToken(newAccessToken);
        if (data.data?.citizen) {
          useAuthStore.getState().setAuth({
            role: 'CITIZEN',
            citizen: data.data.citizen,
            accessToken: newAccessToken,
          });
        }
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
