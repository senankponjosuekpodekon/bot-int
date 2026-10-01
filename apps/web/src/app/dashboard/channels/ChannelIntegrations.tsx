'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Trash2, Plus, Loader2, Check, X, Copy, Link2 } from 'lucide-react';
import { integrationsApi, tenantApi } from '@/lib/api';
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
      { key: 'verifyToken', label: 'Verify Token (choisi par vous)', type: 'text' },
      { key: 'appSecret', label: 'App Secret (signature webhook)', type: 'password' },
    ],
  },
  instagram: {
    label: 'Instagram',
    fields: [
      { key: 'accessToken', label: 'Page Access Token', type: 'password' },
      { key: 'verifyToken', label: 'Verify Token (choisi par vous)', type: 'text' },
      { key: 'appSecret', label: 'App Secret (signature webhook)', type: 'password' },
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
      { key: 'inboundSecret', label: 'Inbound Secret (webhook entrant)', type: 'password' },
    ],
  },
};

const KNOWN_TYPES = Object.keys(INTEGRATION_SCHEMAS);
const EMPTY_INTEGRATIONS: Integration[] = [];

export default function ChannelIntegrations() {
  const queryClient = useQueryClient();
  const { data, isLoading: loading, isError } = useQuery<Integration[]>({
    queryKey: ['integrations'],
    queryFn: async () => {
      const res = await integrationsApi.list();
      return Array.isArray(res) ? res : res?.data ?? [];
    },
    refetchOnWindowFocus: false,
  });
  const integrations = data ?? EMPTY_INTEGRATIONS;
  const { data: tenant } = useQuery({ queryKey: ['tenant', 'me'], queryFn: () => tenantApi.me() });
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  // Webhook path segment per integration type (twilio receives SMS webhooks)
  const WEBHOOK_PATH: Record<string, string> = { whatsapp: 'whatsapp', instagram: 'instagram', telegram: 'telegram', twilio: 'sms', email: 'email' };
  const webhookUrl = (type: string) => (tenant?.id ? `${apiBase}/webhooks/${WEBHOOK_PATH[type]}/${tenant.id}` : null);

  const telegramSetup = useMutation({
    mutationFn: () => integrationsApi.setupTelegramWebhook(tenant.id),
    onSuccess: (res: any) => toast.success(res?.webhookUrl ? 'Webhook Telegram configuré' : 'Webhook Telegram configuré'),
    onError: () => toast.error('Échec de la configuration du webhook Telegram'),
  });

  const copyWebhook = (url: string) => {
    navigator.clipboard?.writeText(url).then(
      () => toast.success('URL de webhook copiée'),
      () => toast.error('Copie impossible'),
    );
  };
  const [savingType, setSavingType] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { config: Record<string, any>; enabled: boolean; open: boolean }>>({});

  useEffect(() => {
    const initialForms: Record<string, any> = {};
    KNOWN_TYPES.forEach((type) => {
      const existing = integrations.find((i: Integration) => i.type === type);
      initialForms[type] = {
        config: existing?.config ?? {},
        enabled: existing?.enabled ?? false,
        open: !!existing,
      };
    });
    setForms(initialForms);
  }, [integrations]);

  useEffect(() => {
    if (isError) toast.error('Erreur lors du chargement des intégrations');
  }, [isError]);

  const saveIntegration = useMutation({
    mutationFn: async ({ type, config, enabled, existing }: { type: string; config: Record<string, any>; enabled: boolean; existing?: Integration }) => {
      await integrationsApi.upsert(type, config);
      if (existing && existing.enabled !== enabled) {
        await integrationsApi.toggle(type, enabled);
      } else if (!existing && !enabled) {
        await integrationsApi.toggle(type, false);
      }
    },
    onSuccess: () => {
      toast.success('Intégration enregistrée');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
    onSettled: () => setSavingType(null),
  });

  const deleteIntegration = useMutation({
    mutationFn: (type: string) => integrationsApi.remove(type),
    onSuccess: () => {
      toast.success('Intégration supprimée');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const handleSave = (type: string) => {
    setSavingType(type);
    const { config, enabled } = forms[type];
    const existing = integrations.find((i) => i.type === type);
    saveIntegration.mutate({ type, config, enabled, existing });
  };

  const handleDelete = (type: string) => {
    if (!confirm('Supprimer cette intégration ?')) return;
    deleteIntegration.mutate(type);
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
              {webhookUrl(type) && (
                <div className="bg-gray-50 rounded-lg p-2 space-y-1">
                  <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> URL de webhook (à coller dans la console du fournisseur)
                  </p>
                  <div className="flex items-center gap-1">
                    <code className="text-xs text-gray-600 break-all flex-1">{webhookUrl(type)}</code>
                    <button onClick={() => copyWebhook(webhookUrl(type)!)} className="p-1 text-gray-400 hover:text-gray-600 shrink-0">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
              {type === 'telegram' && existing?.enabled && (
                <button
                  onClick={() => telegramSetup.mutate()}
                  disabled={telegramSetup.isPending || !tenant?.id}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  {telegramSetup.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                  Configurer le webhook Telegram
                </button>
              )}
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
