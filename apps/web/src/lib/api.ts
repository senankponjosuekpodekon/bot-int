import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

type AuthResponse = {
  access_token: string;
  refresh_token: string;
  userId: string;
  tenantId: string;
};

export interface Agent {
  id: string;
  name: string;
  type?: string;
  industry?: string;
  isActive?: boolean;
}

 
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

api.interceptors.response.use((response) => {
  const payload = response.data;
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    'data' in payload &&
    Array.isArray((payload as any).data) &&
    Object.keys(payload).length === 1
  ) {
    response.data = (payload as any).data;
  }
  return response;
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
      if (isBrowser) window.location.href = '/login';
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
        useAuthStore.getState().logout();
        if (isBrowser) window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;

export const agentsApi = {
  list: (params?: { page?: number; limit?: number }) => api.get('/agents', { params }).then((r) => r.data),
  getById: (id: string) => api.get(`/agents/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/agents', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/agents/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/agents/${id}`).then((r) => r.data),

  // Memory
  remember: (data: { scope: string; scopeId: string; key: string; value: string; agentId?: string; importance?: number }) =>
    api.post('/agents/memory/remember', data).then((r) => r.data),
  recall: (data: { scope: string; scopeId: string; keys?: string[] }) =>
    api.post('/agents/memory/recall', data).then((r) => r.data),
  forget: (scope: string, scopeId: string, key?: string) =>
    api.delete(`/agents/memory/${scope}/${scopeId}`, { params: { key } }).then((r) => r.data),

  // Tools
  listTools: () => api.get('/agents/tools/list').then((r) => r.data),

  // Workflows
  listWorkflows: (params?: { page?: number; limit?: number }) =>
    api.get('/agents/workflows', { params }).then((r) => r.data),
  getWorkflow: (id: string) => api.get(`/agents/workflows/${id}`).then((r) => r.data),
  createWorkflow: (data: any) => api.post('/agents/workflows', data).then((r) => r.data),
  updateWorkflow: (id: string, data: any) => api.patch(`/agents/workflows/${id}`, data).then((r) => r.data),
  deleteWorkflow: (id: string) => api.delete(`/agents/workflows/${id}`).then((r) => r.data),
  executeWorkflow: (id: string, data: { userMessage: string; conversationId?: string; visitorId?: string; leadId?: string }) =>
    api.post(`/agents/workflows/${id}/execute`, data).then((r) => r.data),

  // Pending actions (WRITE/EXECUTE tool calls awaiting human approval)
  listPendingActions: (status?: string) =>
    api.get('/agents/pending-actions', { params: { status } }).then((r) => r.data),
  approvePendingAction: (id: string) =>
    api.post(`/agents/pending-actions/${id}/approve`).then((r) => r.data),
  rejectPendingAction: (id: string) =>
    api.post(`/agents/pending-actions/${id}/reject`).then((r) => r.data),
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
  exportTranscript: (conversationId: string) =>
    api.get(`/chat/transcript/${conversationId}`).then((r) => r.data),
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
  release: (conversationId: string) =>
    api.post(`/chat/${conversationId}/release`).then((r) => r.data),
  suggest: (conversationId: string) =>
    api.post(`/chat/${conversationId}/suggest`).then((r) => r.data),
  typing: (conversationId: string, who = 'operator') =>
    api.post(`/chat/${conversationId}/typing`, { who }).then((r) => r.data),
  operatorReply: (conversationId: string, message: string) =>
    api.post(`/chat/${conversationId}/operator`, { message }).then((r) => r.data),
  feedback: (data: { agentId: string; userMessage: string; originalReply: string; correctedReply: string; reason?: string }) =>
    api.post('/chat/feedback', data).then((r) => r.data),
  getFeedback: (agentId?: string) =>
    api.get('/chat/feedback', { params: { agentId } }).then((r) => r.data),
  deleteFeedback: (id: string) =>
    api.delete(`/chat/feedback/${id}`).then((r) => r.data),
};

export const leadsApi = {
  list: (params?: { status?: string; tag?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/leads', { params }).then((r) => r.data?.data ?? r.data),
  getById: (id: string) => api.get(`/leads/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/leads', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/leads/${id}`, data).then((r) => r.data),
  addTag: (id: string, tag: string) => api.post(`/leads/${id}/tags`, { tag }).then((r) => r.data),
  removeTag: (id: string, tag: string) => api.delete(`/leads/${id}/tags/${tag}`).then((r) => r.data),
  getComments: (id: string) => api.get(`/leads/${id}/comments`).then((r) => r.data),
  addComment: (id: string, content: string) => api.post(`/leads/${id}/comments`, { content }).then((r) => r.data),
  deleteComment: (leadId: string, commentId: string) => api.delete(`/leads/${leadId}/comments/${commentId}`).then((r) => r.data),
  pipelineStats: () => api.get('/leads/pipeline/stats').then((r) => r.data),
  exportCsv: () => api.get('/leads/export/csv', { responseType: 'blob' }).then((r) => r.data),
};

export const productsApi = {
  list: (params?: { category?: string; search?: string; page?: number; limit?: number; agentId?: string }) =>
    api.get('/products', { params }).then((r) => r.data),
  categories: (agentId?: string) => api.get('/products/categories', { params: agentId ? { agentId } : undefined }).then((r) => r.data),
  create: (data: any) => api.post('/products', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/products/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/products/${id}`).then((r) => r.data),
  bulkDelete: (ids: string[]) => api.post('/products/bulk-delete', { ids }).then((r) => r.data),
  importShopify: (shopDomain: string, accessToken: string) =>
    api.post('/products/import/shopify', { shopDomain, accessToken }).then((r) => r.data),
  importWooCommerce: (siteUrl: string, consumerKey: string, consumerSecret: string) =>
    api.post('/products/import/woocommerce', { siteUrl, consumerKey, consumerSecret }).then((r) => r.data),
  importFeed: (shopUrl: string) =>
    api.post('/products/import/feed', { shopUrl }).then((r) => r.data),
  importCsv: (csvContent: string, format?: string, storeDomain?: string, agentId?: string) =>
    api.post('/products/import/csv', { csvContent, format, storeDomain, agentId }).then((r) => r.data),
  importCsvUrl: (csvUrl: string, format?: string, storeDomain?: string, agentId?: string) =>
    api.post('/products/import/csv-url', { csvUrl, format, storeDomain, agentId }).then((r) => r.data),
  importGoogleMerchant: (csvContent: string, agentId?: string) =>
    api.post('/products/import/google-merchant', { csvContent, agentId }).then((r) => r.data),
  importSitemap: (sitemapUrl: string, agentId?: string, maxPages?: number) =>
    api.post('/products/import/sitemap', { sitemapUrl, agentId, maxPages }).then((r) => r.data),
  sync: () => api.post('/products/sync').then((r) => r.data),
  autoSync: () => api.post('/products/auto-sync').then((r) => r.data),
  importHistory: (params?: { limit?: number; offset?: number }) =>
    api.get('/products/import/history', { params }).then((r) => r.data),
  importHistoryById: (id: string) =>
    api.get(`/products/import/history/${id}`).then((r) => r.data),
  importSources: () =>
    api.get('/products/import/sources').then((r) => r.data),
  updateImportSource: (id: string, data: { enabled?: boolean; frequencyMinutes?: number }) =>
    api.patch(`/products/import/sources/${id}`, data).then((r) => r.data),
  deleteImportSource: (id: string) =>
    api.delete(`/products/import/sources/${id}`).then((r) => r.data),
};

export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard').then((r) => r.data),
  timeline: (days?: number) => api.get('/analytics/timeline', { params: { days } }).then((r) => r.data),
  funnel: () => api.get('/analytics/funnel').then((r) => r.data),
  acquisition: () => api.get('/analytics/acquisition').then((r) => r.data),
  channels: (days?: number) => api.get('/analytics/channels', { params: { days } }).then((r) => r.data),
  tokens: (days?: number) => api.get('/analytics/tokens', { params: { days } }).then((r) => r.data),
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
  list: () => api.get('/knowledge').then((r) => r.data?.data ?? r.data),
  search: (q: string) => api.get('/knowledge/search', { params: { q } }).then((r) => r.data?.data ?? r.data),
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

export const billingApi = {
  subscription: () => api.get('/billing/subscription').then((r) => r.data),
  usage: () => api.get('/billing/usage').then((r) => r.data),
  plans: () => api.get('/billing/plans').then((r) => r.data),
  checkout: (plan: string) => api.post('/billing/checkout', { plan }).then((r) => r.data),
  changePlan: (plan: string) => api.post('/billing/change-plan', { plan }).then((r) => r.data),
  cancel: () => api.post('/billing/cancel').then((r) => r.data),
};

export const apiKeyApi = {
  list: () => api.get('/api-keys').then((r) => r.data),
  create: (name: string, scopes?: string[]) => api.post('/api-keys', { name, scopes }).then((r) => r.data),
  revoke: (id: string) => api.post(`/api-keys/${id}/revoke`).then((r) => r.data),
  delete: (id: string) => api.delete(`/api-keys/${id}`).then((r) => r.data),
};

export const tenantApi = {
  me: () => api.get('/tenants/me').then((r) => r.data),
  updateMe: (data: any) => api.patch('/tenants/me', data).then((r) => r.data),
};

export const channelsApi = {
  agents: () => api.get('/channels/agents').then((r) => r.data),
  send: (data: { agentId: string; message: string; channel?: string; conversationId?: string; visitorId?: string }) =>
    api.post('/channels/message', data).then((r) => r.data),
  conversations: (params?: { channel?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/channels/conversations', { params }).then((r) => r.data),
  history: (id: string) => api.get(`/channels/conversations/${id}/history`).then((r) => r.data),
  registerWebhook: (url: string, events?: string) => api.post('/channels/webhooks', { url, events }).then((r) => r.data),
  removeWebhook: (id?: string) =>
    api.delete('/channels/webhooks', { params: id ? { id } : undefined }).then((r) => r.data),
};

export const businessApi = {
  list: () => api.get('/business').then((r) => r.data as { id: string; name: string; isDefault: boolean }[]),
};

export const adminApi = {
  stats: () => api.get('/admin/stats').then((r) => r.data),
  tenants: (page = 1, limit = 20, search?: string) =>
    api.get('/admin/tenants', { params: { page, limit, search } }).then((r) => r.data),
  tenantDetail: (id: string) => api.get(`/admin/tenants/${id}`).then((r) => r.data),
  toggleTenant: (id: string) => api.patch(`/admin/tenants/${id}/toggle-active`).then((r) => r.data),
  changeTenantPlan: (id: string, plan: string) => api.patch(`/admin/tenants/${id}/plan`, { plan }).then((r) => r.data),
  deleteTenant: (id: string) => api.delete(`/admin/tenants/${id}`).then((r) => r.data),
  users: (page = 1, limit = 20, tenantId?: string) =>
    api.get('/admin/users', { params: { page, limit, tenantId } }).then((r) => r.data),
  createUser: (data: any) => api.post('/admin/users', data).then((r) => r.data),
  toggleUser: (id: string) => api.patch(`/admin/users/${id}/toggle-active`).then((r) => r.data),
  changeUserRole: (id: string, role: string) => api.patch(`/admin/users/${id}/role`, { role }).then((r) => r.data),
  resetPassword: (id: string, password: string) => api.post(`/admin/users/${id}/reset-password`, { password }).then((r) => r.data),
  conversations: (page = 1, limit = 20, tenantId?: string) =>
    api.get('/admin/conversations', { params: { page, limit, tenantId } }).then((r) => r.data),
};
