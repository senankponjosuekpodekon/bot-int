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
  send: (agentIdOrObj: string | any, message?: string, conversationId?: string, captureLead?: boolean) => {
    if (typeof agentIdOrObj === 'object') {
      return api.post('/chat/send', agentIdOrObj).then((r) => r.data);
    }
    return api.post('/chat/send', { agentId: agentIdOrObj, message, conversationId, captureLead }).then((r) => r.data);
  },
  conversations: (params?: { status?: string; agentId?: string; page?: number; limit?: number }) =>
    api.get('/chat/conversations', { params }).then((r) => r.data),
  history: (conversationId: string) =>
    api.get(`/chat/history/${conversationId}`).then((r) => r.data),
  attachLead: (conversationId: string, leadId: string) =>
    api.patch(`/chat/${conversationId}/lead`, { leadId }).then((r) => r.data),
  updateStatus: (conversationId: string, status: string) =>
    api.patch(`/chat/${conversationId}/status`, { status }).then((r) => r.data),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  handoff: (conversationId: string, agentId: string) =>
    api.post(`/chat/${conversationId}/handoff`, { agentId }).then((r) => r.data),
  take: (conversationId: string) =>
    api.post(`/chat/${conversationId}/take`).then((r) => r.data),
  feedback: (data: { agentId: string; userMessage: string; originalReply: string; correctedReply: string; reason?: string }) =>
    api.post('/chat/feedback', data).then((r) => r.data),
  getFeedback: (agentId?: string) =>
    api.get('/chat/feedback', { params: { agentId } }).then((r) => r.data),
  deleteFeedback: (id: string) =>
    api.delete(`/chat/feedback/${id}`).then((r) => r.data),
};

export const leadsApi = {
  list: (params?: { status?: string; tag?: string; search?: string }) =>
    api.get('/leads', { params }).then((r) => r.data),
  create: (data: any) => api.post('/leads', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/leads/${id}`, data).then((r) => r.data),
  addTag: (id: string, tag: string) => api.post(`/leads/${id}/tags`, { tag }).then((r) => r.data),
  removeTag: (id: string, tag: string) => api.delete(`/leads/${id}/tags/${tag}`).then((r) => r.data),
  pipelineStats: () => api.get('/leads/pipeline/stats').then((r) => r.data),
  exportCsv: () => api.get('/leads/export/csv', { responseType: 'blob' }).then((r) => r.data),
};

export const productsApi = {
  list: (params?: { category?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/products', { params }).then((r) => r.data),
  categories: () => api.get('/products/categories').then((r) => r.data),
  create: (data: any) => api.post('/products', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/products/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/products/${id}`).then((r) => r.data),
  importShopify: (shopDomain: string, accessToken: string) =>
    api.post('/products/import/shopify', { shopDomain, accessToken }).then((r) => r.data),
  importWooCommerce: (siteUrl: string, consumerKey: string, consumerSecret: string) =>
    api.post('/products/import/woocommerce', { siteUrl, consumerKey, consumerSecret }).then((r) => r.data),
  importFeed: (shopUrl: string) =>
    api.post('/products/import/feed', { shopUrl }).then((r) => r.data),
  importCsv: (csvContent: string, format?: string) =>
    api.post('/products/import/csv', { csvContent, format }).then((r) => r.data),
  importGoogleMerchant: (csvContent: string) =>
    api.post('/products/import/google-merchant', { csvContent }).then((r) => r.data),
  importSitemap: (sitemapUrl: string) =>
    api.post('/products/import/sitemap', { sitemapUrl }).then((r) => r.data),
  sync: () => api.post('/products/sync').then((r) => r.data),
  autoSync: () => api.post('/products/auto-sync').then((r) => r.data),
};

export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard').then((r) => r.data),
  timeline: (days?: number) => api.get('/analytics/timeline', { params: { days } }).then((r) => r.data),
  funnel: () => api.get('/analytics/funnel').then((r) => r.data),
  acquisition: () => api.get('/analytics/acquisition').then((r) => r.data),
};

export const integrationsApi = {
  list: () => api.get('/integrations').then((r) => r.data),
  upsert: (type: string, config: Record<string, any>) => api.post('/integrations', { type, config }).then((r) => r.data),
  toggle: (type: string, enabled: boolean) => api.patch(`/integrations/${type}`, { enabled }).then((r) => r.data),
  remove: (type: string) => api.delete(`/integrations/${type}`).then((r) => r.data),
  createPaymentLink: (productId: string, productName: string, amount: number, currency?: string) =>
    api.post('/integrations/stripe/payment-link', { productId, productName, amount, currency }).then((r) => r.data),
  calendlyEvents: () => api.get('/integrations/calendly/events').then((r) => r.data),
  sendEmail: (to: string, subject: string, body: string) =>
    api.post('/integrations/email/send', { to, subject, body }).then((r) => r.data),
  sendWhatsApp: (to: string, message: string) =>
    api.post('/integrations/whatsapp/send', { to, message }).then((r) => r.data),
  sendTelegram: (to: string, message: string) =>
    api.post('/integrations/telegram/send', { to, message }).then((r) => r.data),
  sendSMS: (to: string, message: string) =>
    api.post('/integrations/sms/send', { to, message }).then((r) => r.data),
};

export const flowsApi = {
  list: () => api.get('/flows').then((r) => r.data),
  findByAgent: (agentId: string) => api.get(`/flows/agent/${agentId}`).then((r) => r.data),
  create: (data: any) => api.post('/flows', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/flows/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/flows/${id}`).then((r) => r.data),
  respond: (conversationId: string, flowId: string, responses: Record<string, string>) =>
    api.post('/flows/respond', { conversationId, flowId, responses }).then((r) => r.data),
};

export const intelligenceApi = {
  dashboard: () => api.get('/intelligence/dashboard').then((r) => r.data),
  insights: (params?: { type?: string; resolved?: string }) =>
    api.get('/intelligence/insights', { params }).then((r) => r.data),
  resolve: (id: string) => api.post(`/intelligence/insights/${id}/resolve`).then((r) => r.data),
  autoEnrich: (keyword: string) => api.post('/intelligence/auto-enrich', { keyword }).then((r) => r.data),
  platformDashboard: () => api.get('/intelligence/platform/dashboard').then((r) => r.data),
  platformRecommendations: () => api.get('/intelligence/platform/recommendations').then((r) => r.data),
};

export const quotesApi = {
  list: () => api.get('/quotes').then((r) => r.data),
  get: (id: string) => api.get(`/quotes/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/quotes', data).then((r) => r.data),
  createFromFlow: (leadId: string, responses: Record<string, string>) =>
    api.post('/quotes/from-flow', { leadId, responses }).then((r) => r.data),
  updateStatus: (id: string, status: string) => api.patch(`/quotes/${id}/status`, { status }).then((r) => r.data),
  delete: (id: string) => api.delete(`/quotes/${id}`).then((r) => r.data),
  pdfUrl: (id: string) => `${api.defaults.baseURL}/quotes/${id}/pdf`,
};

export const knowledgeApi = {
  list: () => api.get('/knowledge').then((r) => r.data),
  search: (q: string) => api.get('/knowledge/search', { params: { q } }).then((r) => r.data),
  addText: (content: string, filename?: string) =>
    api.post('/knowledge/text', { content, filename }).then((r) => r.data),
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/knowledge/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  importUrl: (url: string) =>
    api.post('/knowledge/url', { url }).then((r) => r.data),
  importUrlAsync: (url: string) =>
    api.post('/knowledge/url-async', { url }).then((r) => r.data),
  searchCompany: (companyName: string) =>
    api.post('/knowledge/search-company', { companyName }).then((r) => r.data),
  scrapeSite: (url: string) =>
    api.post('/knowledge/scrape-site', { url }).then((r) => r.data),
  delete: (id: string) => api.delete(`/knowledge/${id}`).then((r) => r.data),
};

export const surveysApi = {
  list: (type?: string) => api.get('/surveys', { params: { type } }).then((r) => r.data),
  get: (id: string) => api.get(`/surveys/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/surveys', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/surveys/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/surveys/${id}`).then((r) => r.data),
  toggle: (id: string) => api.patch(`/surveys/${id}/toggle`).then((r) => r.data),
  submit: (id: string, answers: any[], opts?: any) => api.post(`/surveys/${id}/submit`, { answers, ...opts }).then((r) => r.data),
  results: (id: string) => api.get(`/surveys/${id}/results`).then((r) => r.data),
  sendEmail: (id: string, leadId: string, email: string) => api.post(`/surveys/${id}/send-email`, { leadId, email }).then((r) => r.data),
  exportCsv: (id: string) => api.get(`/surveys/${id}/export`, { responseType: 'blob' }).then((r) => r.data),
};

export const siteApi = {
  list: () => api.get('/site').then((r) => r.data),
  get: (id: string) => api.get(`/site/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/site', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/site/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/site/${id}`).then((r) => r.data),
  toggle: (id: string) => api.patch(`/site/${id}/toggle`).then((r) => r.data),
  verifyDomain: (id: string) => api.post(`/site/${id}/verify-domain`).then((r) => r.data),
  public: {
    getBySlug: (slug: string) => api.get(`/site/public/slug/${slug}`).then((r) => r.data),
    getByDomain: (domain: string) => api.get(`/site/public/domain/${domain}`).then((r) => r.data),
  },
};
