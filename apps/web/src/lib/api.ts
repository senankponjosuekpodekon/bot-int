import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

type AuthResponse = {
  access_token: string;
  refresh_token: string;
  userId: string;
  tenantId: string;
};

/* eslint-disable no-unused-vars */
declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    _retry?: boolean;
  }
  interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean;
    _retry?: boolean;
  }
}
/* eslint-enable no-unused-vars */

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
});

const isBrowser = typeof window !== 'undefined';
const getStoredToken = (key: string) => {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setAuthHeader = (config: InternalAxiosRequestConfig, token: string) => {
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }

  if (config.headers instanceof AxiosHeaders) {
    config.headers.set('Authorization', `Bearer ${token}`);
  } else {
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
};

api.interceptors.request.use((config) => {
  const token = getStoredToken('access_token');
  if (token) {
    setAuthHeader(config as InternalAxiosRequestConfig, token);
  }
  return config;
});

export const authApi = {
  register: (data: { companyName: string; name: string; email: string; password: string }) =>
    api.post('/auth/register', data, { skipAuthRefresh: true }).then((r) => r.data as AuthResponse),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data, { skipAuthRefresh: true }).then((r) => r.data as AuthResponse),
  refresh: (refreshToken: string) =>
    api
      .post(
        '/auth/refresh',
        { refreshToken },
        { skipAuthRefresh: true },
      )
      .then((r) => r.data as AuthResponse),
  logout: (refreshToken: string) =>
    api
      .post(
        '/auth/logout',
        { refreshToken },
        { skipAuthRefresh: true },
      )
      .then((r) => r.data),
};

let refreshPromise: Promise<AuthResponse | null> | null = null;

const refreshSession = async (): Promise<AuthResponse | null> => {
  if (!isBrowser) return null;
  if (!refreshPromise) {
    const refreshToken = getStoredToken('refresh_token');
    if (!refreshToken) {
      useAuthStore.getState().logout();
      return null;
    }

    refreshPromise = authApi
      .refresh(refreshToken)
      .then((data) => {
        useAuthStore.getState().setAuth({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          userId: data.userId,
          tenantId: data.tenantId,
        });
        return data;
      })
      .catch((error) => {
        useAuthStore.getState().logout();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.skipAuthRefresh
    ) {
      originalRequest._retry = true;
      try {
        const refreshed = await refreshSession();
        if (refreshed?.access_token) {
          setAuthHeader(originalRequest, refreshed.access_token);
          return api(originalRequest);
        }
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;

export const agentsApi = {
  list: () => api.get('/agents').then((r) => r.data),
  create: (data: any) => api.post('/agents', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/agents/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/agents/${id}`).then((r) => r.data),
};

export const chatApi = {
  send: (data: {
    agentId: string;
    message: string;
    conversationId?: string;
    visitorId?: string;
    captureLead?: boolean;
  }) =>
    api.post('/chat/send', data).then((r) => r.data),
  conversations: (params?: Record<string, any>) =>
    api.get('/chat/conversations', { params }).then((r) => r.data),
  history: (conversationId: string) =>
    api.get(`/chat/history/${conversationId}`).then((r) => r.data),
  attachLead: (conversationId: string, leadId: string) =>
    api.patch(`/chat/${conversationId}/lead`, { leadId }).then((r) => r.data),
  updateStatus: (conversationId: string, status: 'open' | 'closed') =>
    api.patch(`/chat/${conversationId}/status`, { status }).then((r) => r.data),
};

export const leadsApi = {
  list: () => api.get('/leads').then((r) => r.data),
  create: (data: any) => api.post('/leads', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/leads/${id}`, data).then((r) => r.data),
};

export const knowledgeApi = {
  list: () => api.get('/knowledge').then((r) => r.data),
  search: (q: string) => api.get('/knowledge/search', { params: { q } }).then((r) => r.data),
  addText: (content: string, filename?: string) =>
    api.post('/knowledge/text', { content, filename }).then((r) => r.data),
  delete: (id: string) => api.delete(`/knowledge/${id}`).then((r) => r.data),
};
