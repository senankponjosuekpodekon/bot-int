'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, X, Save } from 'lucide-react';
import { agentsApi } from '@/lib/api';
import { toast } from 'sonner';
import { useUiLocale } from '@/lib/ui-locale';

const FIELD_TYPES = [
  { value: 'text', labelKey: 'flw.ft.text' },
  { value: 'email', labelKey: 'flw.ft.email' },
  { value: 'phone', labelKey: 'flw.ft.phone' },
  { value: 'number', labelKey: 'flw.ft.number' },
  { value: 'date', labelKey: 'flw.ft.date' },
  { value: 'buttons', labelKey: 'flw.ft.buttons' },
  { value: 'dropdown', labelKey: 'flw.ft.dropdown' },
];

const ACTION_TYPES = [
  { value: 'log', label: 'Log' },
  { value: 'webhook', label: 'Webhook' },
];

interface FlowField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
}

interface FlowAction {
  type: string;
  config?: Record<string, any>;
}

interface Flow {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  agentId?: string;
  fields?: FlowField[];
  actions?: FlowAction[];
}

interface Agent {
  id: string;
  name: string;
}

interface FlowFormProps {
  flow: Flow | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

function normalizeOptions(input: string): { label: string; value: string }[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((v) => ({ label: v, value: v }));
}

function formatOptions(options?: { label: string; value: string }[]): string {
  return (options || []).map((o) => o.value).join(', ');
}

export default function FlowForm({ flow, onSave, onCancel }: FlowFormProps) {
  const { t } = useUiLocale();
  const { data: agents = [], isLoading: loadingAgents } = useQuery<Agent[]>({
    queryKey: ['agents', { limit: 100 }],
    queryFn: async () => {
      const res = await agentsApi.list({ limit: 100 });
      return res?.data ?? res ?? [];
    },
  });
  const [form, setForm] = useState({
    agentId: flow?.agentId || '',
    title: flow?.title || '',
    description: flow?.description || '',
    isActive: flow ? flow.isActive : true,
    fields: Array.isArray(flow?.fields) ? flow.fields : [],
    actions: Array.isArray(flow?.actions) ? flow.actions : [],
  });

  const addField = () => {
    setForm({
      ...form,
      fields: [
        ...form.fields,
        { id: `field_${Date.now()}`, type: 'text', label: '', placeholder: '', options: [], required: false },
      ],
    });
  };

  const updateField = (idx: number, key: string, value: any) => {
    const fields = [...form.fields];
    fields[idx] = { ...fields[idx], [key]: value };
    setForm({ ...form, fields });
  };

  const removeField = (idx: number) => {
    setForm({ ...form, fields: form.fields.filter((_, i) => i !== idx) });
  };

  const addAction = () => {
    setForm({
      ...form,
      actions: [...form.actions, { type: 'log', config: { message: '' } }],
    });
  };

  const updateAction = (idx: number, key: string, value: any) => {
    const actions = [...form.actions];
    actions[idx] = { ...actions[idx], [key]: value };
    setForm({ ...form, actions });
  };

  const updateActionConfig = (idx: number, key: string, value: any) => {
    const actions = [...form.actions];
    actions[idx] = { ...actions[idx], config: { ...actions[idx].config, [key]: value } };
    setForm({ ...form, actions });
  };

  const removeAction = (idx: number) => {
    setForm({ ...form, actions: form.actions.filter((_, i) => i !== idx) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agentId || !form.title || form.fields.length === 0) {
      toast.error(t('flw.toast.required'));
      return;
    }
    onSave({
      ...form,
      fields: form.fields.map((f) => ({
        ...f,
        options: f.type === 'buttons' || f.type === 'dropdown' ? f.options : undefined,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 lg:p-6 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {flow ? t('flw.editFlow') : t('flw.newFlow')}
        </h2>
        <button type="button" onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Agent</label>
          <select
            value={form.agentId}
            onChange={(e) => setForm({ ...form, agentId: e.target.value })}
            className="input"
            required
          >
            <option value="">{loadingAgents ? t('common.loading') : t('flw.selectAgent')}</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t('flw.status')}</label>
          <select
            value={form.isActive ? 'true' : 'false'}
            onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
            className="input"
          >
            <option value="true">{t('flw.active')}</option>
            <option value="false">{t('flw.inactive')}</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">{t('srv.fieldTitle')}</label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="input"
          placeholder={t('flw.titlePlaceholder')}
          required
        />
      </div>

      <div>
        <label className="label">{t('prod.description')}</label>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input"
          placeholder={t('flw.descPlaceholder')}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="label">{t('flw.fieldsLabel')}</label>
          <button type="button" onClick={addField} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> {t('flw.addField')}
          </button>
        </div>
        {form.fields.length === 0 && <p className="text-sm text-gray-400">{t('flw.noFields')}</p>}
        {form.fields.map((field, idx) => (
          <div key={field.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={field.label}
                onChange={(e) => updateField(idx, 'label', e.target.value)}
                className="input"
                placeholder={t('flw.labelPlaceholder')}
                required
              />
              <select
                value={field.type}
                onChange={(e) => updateField(idx, 'type', e.target.value)}
                className="input"
              >
                {FIELD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>
                    {t(ft.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={field.placeholder || ''}
                onChange={(e) => updateField(idx, 'placeholder', e.target.value)}
                className="input"
                placeholder={t('flw.placeholderPh')}
              />
              {(field.type === 'buttons' || field.type === 'dropdown') && (
                <input
                  value={formatOptions(field.options)}
                  onChange={(e) => updateField(idx, 'options', normalizeOptions(e.target.value))}
                  className="input"
                  placeholder={t('flw.optionsPh')}
                />
              )}
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!field.required}
                  onChange={(e) => updateField(idx, 'required', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600"
                />
                {t('srv.required')}
              </label>
              <button type="button" onClick={() => removeField(idx)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="label">{t('prod.actions')}</label>
          <button type="button" onClick={addAction} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> {t('flw.addAction')}
          </button>
        </div>
        {form.actions.length === 0 && <p className="text-sm text-gray-400">{t('flw.noActions')}</p>}
        {form.actions.map((action, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-3">
              <select
                value={action.type}
                onChange={(e) => updateAction(idx, 'type', e.target.value)}
                className="input w-32"
              >
                {ACTION_TYPES.map((at) => (
                  <option key={at.value} value={at.value}>
                    {at.label}
                  </option>
                ))}
              </select>
              {action.type === 'log' ? (
                <input
                  value={action.config?.message || ''}
                  onChange={(e) => updateActionConfig(idx, 'message', e.target.value)}
                  className="input flex-1"
                  placeholder={t('flw.logMessage')}
                />
              ) : (
                <input
                  value={action.config?.url || ''}
                  onChange={(e) => updateActionConfig(idx, 'url', e.target.value)}
                  className="input flex-1"
                  placeholder="https://..."
                  type="url"
                />
              )}
              <button type="button" onClick={() => removeAction(idx)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> {t('common.save')}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
