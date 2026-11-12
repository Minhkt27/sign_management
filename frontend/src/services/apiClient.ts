import axios, { InternalAxiosRequestConfig } from 'axios';
import { authStore, resolveHospitalId, isPublicRoute } from '../app/store/authStore';

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const baseHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: baseHeaders,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = authStore.getToken();
    // Trang công khai gọi server như khách: khi có token, server tin viện của tài khoản và bỏ qua
    // viện trong QR. Dữ liệu ở các trang này vốn ai cũng xem được, không cần đăng nhập.
    if (token && config.headers && !isPublicRoute()) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const hospitalId = resolveHospitalId();
    if (hospitalId != null) {
      config.params = { ...config.params, hospitalId };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processPendingQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequest;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = authStore.getRefreshToken();

      if (!refreshToken) {
        if (!isPublicRoute()) {
          authStore.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        );
        const newToken: string = data.token;
        authStore.setToken(newToken);
        if (data.refreshToken) {
          authStore.setRefreshToken(data.refreshToken);
        }
        processPendingQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processPendingQueue(refreshError, null);
        if (!isPublicRoute()) {
          authStore.logout();
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
