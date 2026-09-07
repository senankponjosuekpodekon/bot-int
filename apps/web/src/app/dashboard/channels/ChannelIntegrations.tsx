'use client';
import { useEffect, useState } from 'react';
import { Save, Trash2, Plus, Loader2, Check, X } from 'lucide-react';
import { integrationsApi } from '@/lib/api';
import { toast } from 'sonner';

interface Integration {
  id?: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
}

const INTEGRATION_SCHEMAS: Record<string, { label: string; fields: { key: string; label: string; type: string }[] }> = {
  whatsapp: {
    label: 'WhatsApp',
    fields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text' },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'verifyToken', label: 'Verify Token', type: 'text' },
    ],
  },
  instagram: {
    label: 'Instagram',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'verifyToken', label: 'Verify Token', type: 'text' },
    ],
  },
  telegram: {
    label: 'Telegram',
    fields: [{ key: 'botToken', label: 'Bot Token', type: 'password' }],
  },
  twilio: {
    label: 'Twilio SMS',
    fields: [
      { key: 'accountSid', label: 'Account SID', type: 'text' },
      { key: 'authToken', label: 'Auth Token', type: 'password' },
      { key: 'fromNumber', label: 'From Number', type: 'text' },
    ],
  },
  email: {
    label: 'Email',
    fields: [
      { key: 'provider', label: 'Provider (resend | sendgrid)', type: 'text' },
      { key: 'apiKey', label: 'API Key', type: 'password' },
      { key: 'fromEmail', label: 'From Email', type: 'email' },
      { key: 'fromName', label: 'From Name', type: 'text' },
    ],
  },
};

const KNOWN_TYPES = Object.keys(INTEGRATION_SCHEMAS);

export default function ChannelIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { config: Record<string, any>; enabled: boolean; open: boolean }>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await integrationsApi.list();
      const data = Array.isArray(res) ? res : res?.data ?? [];
      setIntegrations(data);
      const initialForms: Record<string, any> = {};
      KNOWN_TYPES.forEach((type) => {
        const existing = data.find((i: Integration) => i.type === type);
        initialForms[type] = {
          config: existing?.config ?? {},
          enabled: existing?.enabled ?? false,
          open: !!existing,
        };
      });
      setForms(initialForms);
    } catch {
      toast.error('Erreur lors du chargement des intégrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (type: string) => {
    setSavingType(type);
    const { config, enabled } = forms[type];
    try {
      const existing = integrations.find((i) => i.type === type);
      await integrationsApi.upsert(type, config);
      if (existing && existing.enabled !== enabled) {
        await integrationsApi.toggle(type, enabled);
      } else if (!existing && !enabled) {
        await integrationsApi.toggle(type, false);
      }
      toast.success('Intégration enregistrée');
      await load();
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSavingType(null);
    }
  };

  const handleDelete = async (type: string) => {
    if (!confirm('Supprimer cette intégration ?')) return;
    try {
      await integrationsApi.remove(type);
      toast.success('Intégration supprimée');
      await load();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const updateConfig = (type: string, key: string, value: any) => {
    setForms({
      ...forms,
      [type]: { ...forms[type], config: { ...forms[type].config, [key]: value } },
    });
  };

  const setOpen = (type: string, open: boolean) => {
    setForms({ ...forms, [type]: { ...forms[type], open } });
  };

  if (loading) {
    return (
      <div className="card p-4 flex items-center justify-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Chargement des intégrations...
      </div>
    );
  }

  return (
    <div className="card p-4 lg:p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Intégrations canaux</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {KNOWN_TYPES.map((type) => {
          const schema = INTEGRATION_SCHEMAS[type];
          const existing = integrations.find((i) => i.type === type);
          const form = forms[type] || { config: {}, enabled: false, open: false };
          if (!form.open) {
            return (
              <button
                key={type}
                onClick={() => setOpen(type, true)}
                className="border border-dashed border-gray-300 rounded-xl p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 text-primary-600">
                  <Plus className="w-4 h-4" />
                  <span className="font-medium">{schema.label}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Configurer {schema.label}</p>
              </button>
            );
          }
          return (
            <div key={type} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{schema.label}</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(e) => setForms({ ...forms, [type]: { ...form, enabled: e.target.checked } })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                    Actif
                  </label>
                  <button onClick={() => setOpen(type, false)} className="p-1 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {schema.fields.map((field) => (
                <div key={field.key}>
                  <label className="text-xs text-gray-500 block mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={form.config?.[field.key] || ''}
                    onChange={(e) => updateConfig(type, field.key, e.target.value)}
                    className="input w-full"
                    placeholder={field.label}
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleSave(type)}
                  disabled={!!savingType}
                  className="btn-primary flex items-center gap-1 text-sm"
                >
                  {savingType === type ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Enregistrer
                </button>
                {existing && (
                  <button onClick={() => handleDelete(type)} className="btn-secondary text-red-600 text-sm flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Supprimer
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
