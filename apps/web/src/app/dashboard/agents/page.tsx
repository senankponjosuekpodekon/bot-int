'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '@/lib/api';
import { Bot, Plus, Pencil, Trash2, X, Sparkles, Copy, Check, Power } from 'lucide-react';
import { toast } from 'sonner';
import { useUiLocale } from '@/lib/ui-locale';

const SYSTEM_PROMPT_TEMPLATES: Record<string, Array<{ labelKey: string; promptKey: string }>> = {
  general: [
    { labelKey: 'agc.tpl.general1.label', promptKey: 'ag.tpl.general1.prompt' },
    { labelKey: 'agc.tpl.general2.label', promptKey: 'ag.tpl.general2.prompt' },
  ],
  sales: [
    { labelKey: 'agc.tpl.sales1.label', promptKey: 'ag.tpl.sales1.prompt' },
    { labelKey: 'agc.tpl.sales2.label', promptKey: 'ag.tpl.sales2.prompt' },
  ],
  support: [
    { labelKey: 'ag.tpl.support1.label', promptKey: 'ag.tpl.support1.prompt' },
    { labelKey: 'ag.tpl.support2.label', promptKey: 'ag.tpl.support2.prompt' },
  ],
  hr: [
    { labelKey: 'ag.tpl.hr1.label', promptKey: 'ag.tpl.hr1.prompt' },
    { labelKey: 'ag.tpl.hr2.label', promptKey: 'ag.tpl.hr2.prompt' },
  ],
};

interface Agent {
  id: string;
  name: string;
  type: string;
  systemPrompt: string;
  isActive: boolean;
}

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const { t } = useUiLocale();
  const { data: agents = [], isLoading: loading, isError } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list().then((res: any) => res.data || res),
  });
  const createAgent = useMutation({
    mutationFn: (data: { name: string; type: string; systemPrompt: string; personality: string }) =>
      agentsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
  const deleteAgent = useMutation({
    mutationFn: (id: string) => agentsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
  const toggleAgent = useMutation({
    mutationFn: (agent: Agent) => agentsApi.update(agent.id, { isActive: !agent.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'general', systemPrompt: '', personality: '' });
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isError) toast.error(t('ag.toast.loadError'));
  }, [isError, t]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createAgent.mutateAsync(form);
      toast.success(t('agc.toast.created'));
      setShowForm(false);
      setForm({ name: '', type: 'general', systemPrompt: '', personality: '' });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('agc.toast.createError'));
    } finally {
      setSaving(false);
    }
  };

  const copyPublicUrl = (id: string) => {
    const url = `${window.location.origin}/chat/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('ag.confirmDelete'))) return;
    try {
      await deleteAgent.mutateAsync(id);
      toast.success(t('ag.toast.deleted'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('ag.toast.deleteError'));
    }
  };

  const handleToggle = async (agent: Agent) => {
    try {
      await toggleAgent.mutateAsync(agent);
      toast.success(agent.isActive ? t('ag.toast.deactivated') : t('ag.toast.activated'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('ag.toast.toggleError'));
    }
  };

  return (
    <div className="p-4 sm:p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('ag.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('ag.subtitle')}</p>
        </div>
        <button onClick={() => { window.location.href = '/dashboard/agents/create'; }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('ag.new')}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-4 lg:p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('ag.new')}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">{t('ag.name')}</label>
                <input name="name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Assistant Support" required />
              </div>
              <div>
                <label className="label">{t('agc.type')}</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="general">{t('agc.type.general')}</option>
                  <option value="sales">{t('agc.type.sales')}</option>
                  <option value="support">{t('agc.type.support')}</option>
                  <option value="hr">{t('agc.type.hr')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('agc.systemPrompt')}</label>
                {(SYSTEM_PROMPT_TEMPLATES[form.type] || []).length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {(SYSTEM_PROMPT_TEMPLATES[form.type] || []).map((tpl) => (
                      <button
                        key={tpl.labelKey}
                        type="button"
                        onClick={() => setForm({ ...form, systemPrompt: t(tpl.promptKey) })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        {t(tpl.labelKey)}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  name="systemPrompt"
                  className="input resize-none"
                  rows={4}
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  placeholder={t('ag.promptPlaceholder')}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? t('agc.creating') : t('agc.create')}
                </button>
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
      ) : agents.length === 0 ? (
        <div className="card p-12 text-center">
          <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t('ag.empty')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('ag.emptyHint')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent) => (
            <div key={agent.id} className="card p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-4">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{agent.type}</span>
                  {agent.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{t('ag.active')}</span>}
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{agent.systemPrompt}</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => copyPublicUrl(agent.id)}
                  title={t('ag.copyLink')}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  {copiedId === agent.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleToggle(agent)}
                  title={agent.isActive ? t('ag.deactivate') : t('ag.activate')}
                  className={`p-2 rounded-lg transition-colors ${agent.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                >
                  <Power className="w-4 h-4" />
                </button>
                <a href={`/dashboard/agents/${agent.id}`} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Pencil className="w-4 h-4" />
                </a>
                <button onClick={() => handleDelete(agent.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
