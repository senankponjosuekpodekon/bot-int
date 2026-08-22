'use client';
import { useEffect, useState } from 'react';
import { agentsApi } from '@/lib/api';
import { Bot, Plus, Pencil, Trash2, X, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const SYSTEM_PROMPT_TEMPLATES: Record<string, Array<{ label: string; prompt: string }>> = {
  general: [
    {
      label: 'Assistant polyvalent',
      prompt: 'Tu es un assistant IA polyvalent. Tu réponds de manière claire, concise et utile. Tu adaptes ton ton à l\'interlocuteur et poses des questions pertinentes pour mieux comprendre les besoins. Tu réponds toujours en français.',
    },
    {
      label: 'Guide conversationnel',
      prompt: 'Tu es un guide conversationnel bienveillant. Tu accueilles chaleureusement l\'utilisateur, tu l\'orientes vers les bonnes ressources et tu maintains une conversation fluide et engageante. Tu réponds en français.',
    },
  ],
  sales: [
    {
      label: 'Commercial B2B',
      prompt: 'Tu es un expert commercial B2B. Ton objectif est de qualifier les prospects, comprendre leurs besoins et présenter les solutions adaptées. Tu poses des questions ouvertes pour identifier les pain points. Tu es persuasif sans être agressif. Tu réponds en français et demandes toujours des coordonnées (email/téléphone) pour qualifier le lead.',
    },
    {
      label: 'Vendeur e-commerce',
      prompt: 'Tu es un conseiller de vente e-commerce. Tu aides les clients à choisir les bons produits, tu réponds aux questions sur les prix, les délais de livraison et les retours. Tu proposes des upsells pertinents. Tu réponds en français et restes amical et professionnel.',
    },
  ],
  support: [
    {
      label: 'Support technique N1',
      prompt: 'Tu es un agent de support technique niveau 1. Tu diagnostiques les problèmes en posant des questions méthodiques, tu proposes des solutions étape par étape et tu escalades vers le support N2 si nécessaire. Tu restes patient et clair. Tu réponds en français.',
    },
    {
      label: 'Support client FAQ',
      prompt: 'Tu es un agent de support client. Tu réponds aux questions fréquentes sur les comptes, facturations, et fonctionnalités du produit. Tu guides l\'utilisateur avec des instructions simples. Si tu ne connais pas la réponse, tu proposes de transmettre à un humain. Tu réponds en français.',
    },
  ],
  hr: [
    {
      label: 'Assistant RH onboarding',
      prompt: 'Tu es un assistant RH spécialisé dans l\'onboarding. Tu accueilles les nouveaux employés, tu les guides dans leurs premières étapes (compte, outils, formation) et tu réponds aux questions sur la politique de l\'entreprise. Tu es chaleureux et structuré. Tu réponds en français.',
    },
    {
      label: 'RH FAQ interne',
      prompt: 'Tu es un assistant RH qui répond aux questions internes des employés: congés, paie, avantages, procédures administratives. Tu renvoies vers les bons documents ou contacts quand nécessaire. Tu réponds en français de manière professionnelle et confidentielle.',
    },
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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'general', systemPrompt: '', personality: '' });
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await agentsApi.list();
      setAgents(res.data || res);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Impossible de charger les agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await agentsApi.create(form);
      toast.success('Agent créé avec succès');
      setShowForm(false);
      setForm({ name: '', type: 'general', systemPrompt: '', personality: '' });
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur lors de la création de l'agent");
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
    if (!confirm('Supprimer cet agent ?')) return;
    try {
      await agentsApi.delete(id);
      toast.success('Agent supprimé');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Suppression impossible");
    }
  };

  return (
    <div className="p-4 sm:p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents IA</h1>
          <p className="text-gray-500 text-sm mt-1">Créez et gérez vos agents conversationnels</p>
        </div>
        <button onClick={() => { window.location.href = '/dashboard/agents/create'; }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouvel agent
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-4 lg:p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nouvel agent</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Nom de l'agent</label>
                <input name="name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Assistant Support" required />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="general">Général</option>
                  <option value="sales">Commercial</option>
                  <option value="support">Support client</option>
                  <option value="hr">RH</option>
                </select>
              </div>
              <div>
                <label className="label">Prompt système</label>
                {(SYSTEM_PROMPT_TEMPLATES[form.type] || []).length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {(SYSTEM_PROMPT_TEMPLATES[form.type] || []).map((tpl) => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() => setForm({ ...form, systemPrompt: tpl.prompt })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        {tpl.label}
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
                  placeholder="Tu es un assistant commercial expert... Tu réponds toujours en français..."
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Création...' : 'Créer l\'agent'}
                </button>
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : agents.length === 0 ? (
        <div className="card p-12 text-center">
          <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun agent créé</p>
          <p className="text-gray-400 text-sm mt-1">Cliquez sur "Nouvel agent" pour commencer</p>
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
                  {agent.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Actif</span>}
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{agent.systemPrompt}</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => copyPublicUrl(agent.id)}
                  title="Copier le lien public"
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  {copiedId === agent.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
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
