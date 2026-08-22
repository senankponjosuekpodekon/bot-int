'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { agentsApi } from '@/lib/api';
import { ArrowLeft, Save, Trash2, Bot, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const AGENT_TYPES = [
  { value: 'general', label: 'Général' },
  { value: 'sales', label: 'Commercial' },
  { value: 'support', label: 'Support client' },
  { value: 'hr', label: 'RH' },
];

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'general',
    systemPrompt: '',
    personality: '',
    isActive: true,
    iceBreakers: [] as string[],
  });
  const [newIceBreaker, setNewIceBreaker] = useState('');

  useEffect(() => {
    if (!id) return;
    agentsApi
      .getById(id)
      .then((data) => {
        setAgent(data);
        setForm({
          name: data.name || '',
          type: data.type || 'general',
          systemPrompt: data.systemPrompt || '',
          personality: data.personality || '',
          isActive: data.isActive ?? true,
          iceBreakers: data.iceBreakers || [],
        });
      })
      .catch(() => toast.error('Agent introuvable'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await agentsApi.update(id, form);
      toast.success('Agent mis à jour');
      setAgent({ ...agent, ...form });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cet agent ? Cette action est irréversible.')) return;
    try {
      await agentsApi.delete(id);
      toast.success('Agent supprimé');
      router.push('/dashboard/agents');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Suppression impossible');
    }
  };

  const addIceBreaker = () => {
    if (!newIceBreaker.trim()) return;
    setForm({ ...form, iceBreakers: [...form.iceBreakers, newIceBreaker.trim()] });
    setNewIceBreaker('');
  };

  const removeIceBreaker = (index: number) => {
    setForm({ ...form, iceBreakers: form.iceBreakers.filter((_, i) => i !== index) });
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-4 lg:p-8">
        <div className="card p-12 text-center">
          <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Agent introuvable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      <button
        onClick={() => router.push('/dashboard/agents')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux agents
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
          <Bot className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
          <p className="text-sm text-gray-500">
            Type: {AGENT_TYPES.find((t) => t.value === agent.type)?.label || agent.type} ·{' '}
            {agent.isActive ? 'Actif' : 'Inactif'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-4 lg:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>

          <div>
            <label className="label">Nom de l'agent</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Assistant Support"
              required
            />
          </div>

          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {AGENT_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Prompt système</label>
            <textarea
              className="input resize-none"
              rows={6}
              value={form.systemPrompt}
              onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
              placeholder="Tu es un assistant commercial expert..."
              required
            />
          </div>

          <div>
            <label className="label">Personnalité (optionnel)</label>
            <input
              className="input"
              value={form.personality}
              onChange={(e) => setForm({ ...form, personality: e.target.value })}
              placeholder="Amical, professionnel, humoristique..."
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Agent actif
            </label>
          </div>
        </div>

        <div className="card p-4 lg:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Brise-glace</h2>
          </div>
          <p className="text-sm text-gray-500">
            Phrases d'accueil que l'agent peut utiliser pour démarrer une conversation.
          </p>

          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={newIceBreaker}
              onChange={(e) => setNewIceBreaker(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addIceBreaker();
                }
              }}
              placeholder="Bonjour ! Comment puis-je vous aider aujourd'hui ?"
            />
            <button type="button" className="btn-secondary" onClick={addIceBreaker}>
              Ajouter
            </button>
          </div>

          {form.iceBreakers.length > 0 && (
            <div className="space-y-2">
              {form.iceBreakers.map((ice, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5"
                >
                  <span className="text-sm text-gray-700">{ice}</span>
                  <button
                    type="button"
                    onClick={() => removeIceBreaker(i)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button
            type="button"
            className="btn-secondary flex items-center gap-2 text-red-600 hover:bg-red-50"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
        </div>
      </form>
    </div>
  );
}
