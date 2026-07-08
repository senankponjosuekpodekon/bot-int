import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export const authApi = {
  register: (data: { companyName: string; name: string; email: string; password: string }) =>
    api.post('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then((r) => r.data),
};

export const agentsApi = {
  list: () => api.get('/agents').then((r) => r.data),
  create: (data: any) => api.post('/agents', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/agents/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/agents/${id}`).then((r) => r.data),
};

export const chatApi = {
  send: (data: { agentId: string; message: string; conversationId?: string }) =>
    api.post('/chat/send', data).then((r) => r.data),
  conversations: () => api.get('/chat/conversations').then((r) => r.data),
  history: (conversationId: string) =>
    api.get(`/chat/history/${conversationId}`).then((r) => r.data),
};

export const leadsApi = {
  list: () => api.get('/leads').then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/leads/${id}`, data).then((r) => r.data),
};

export const knowledgeApi = {
  list: () => api.get('/knowledge').then((r) => r.data),
  addText: (content: string, filename?: string) =>
    api.post('/knowledge/text', { content, filename }).then((r) => r.data),
  delete: (id: string) => api.delete(`/knowledge/${id}`).then((r) => r.data),
};
