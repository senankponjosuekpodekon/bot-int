'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Save } from 'lucide-react';
import { agentsApi } from '@/lib/api';
import { toast } from 'sonner';

const FIELD_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'buttons', label: 'Boutons' },
  { value: 'dropdown', label: 'Liste déroulante' },
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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [form, setForm] = useState({
    agentId: flow?.agentId || '',
    title: flow?.title || '',
    description: flow?.description || '',
    isActive: flow ? flow.isActive : true,
    fields: Array.isArray(flow?.fields) ? flow.fields : [],
    actions: Array.isArray(flow?.actions) ? flow.actions : [],
  });

  useEffect(() => {
    agentsApi
      .list({ limit: 100 })
      .then((res: any) => {
        const data = res?.data ?? res ?? [];
        setAgents(data);
      })
      .catch(() => {})
      .finally(() => setLoadingAgents(false));
  }, []);

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
      toast.error('Agent, titre et au moins un champ sont requis');
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
          {flow ? 'Modifier le flux' : 'Nouveau flux'}
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
            <option value="">{loadingAgents ? 'Chargement...' : 'Sélectionner un agent'}</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Statut</label>
          <select
            value={form.isActive ? 'true' : 'false'}
            onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
            className="input"
          >
            <option value="true">Actif</option>
            <option value="false">Inactif</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Titre</label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="input"
          placeholder="Formulaire de devis"
          required
        />
      </div>

      <div>
        <label className="label">Description</label>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input"
          placeholder="Objectif du flux..."
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="label">Champs</label>
          <button type="button" onClick={addField} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Ajouter un champ
          </button>
        </div>
        {form.fields.length === 0 && <p className="text-sm text-gray-400">Aucun champ.</p>}
        {form.fields.map((field, idx) => (
          <div key={field.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={field.label}
                onChange={(e) => updateField(idx, 'label', e.target.value)}
                className="input"
                placeholder="Label"
                required
              />
              <select
                value={field.type}
                onChange={(e) => updateField(idx, 'type', e.target.value)}
                className="input"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={field.placeholder || ''}
                onChange={(e) => updateField(idx, 'placeholder', e.target.value)}
                className="input"
                placeholder="Placeholder"
              />
              {(field.type === 'buttons' || field.type === 'dropdown') && (
                <input
                  value={formatOptions(field.options)}
                  onChange={(e) => updateField(idx, 'options', normalizeOptions(e.target.value))}
                  className="input"
                  placeholder="Option 1, Option 2, ..."
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
                Requis
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
          <label className="label">Actions</label>
          <button type="button" onClick={addAction} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Ajouter une action
          </button>
        </div>
        {form.actions.length === 0 && <p className="text-sm text-gray-400">Aucune action.</p>}
        {form.actions.map((action, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-3">
              <select
                value={action.type}
                onChange={(e) => updateAction(idx, 'type', e.target.value)}
                className="input w-32"
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {action.type === 'log' ? (
                <input
                  value={action.config?.message || ''}
                  onChange={(e) => updateActionConfig(idx, 'message', e.target.value)}
                  className="input flex-1"
                  placeholder="Message à logger"
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
          <Save className="w-4 h-4" /> Enregistrer
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Annuler
        </button>
      </div>
    </form>
  );
}
