'use client';
import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Clock, MessageCircle, Shield, Zap, Trash2, Plus, Save, AlertCircle } from 'lucide-react';
import { agentsApi, chatApi } from '@/lib/api';

export default function PersonalityPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agent, setAgent] = useState<any>(null);
  const [config, setConfig] = useState<any>({
    tone: 'friendly',
    discloseAI: true,
    aiDisclosureMessage: '',
    pacingEnabled: true,
    minDelayMs: 500,
    maxDelayMs: 2500,
    businessHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] },
    autoReplyMode: 'always',
    escalationTopics: [],
    forbiddenTopics: [],
  });
  const [feedback, setFeedback] = useState<any[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [topicType, setTopicType] = useState<'escalation' | 'forbidden'>('escalation');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const data = await agentsApi.list();
      setAgents(data);
      if (data.length > 0 && !selectedAgent) setSelectedAgent(data[0].id);
    } catch {
      showToast('Erreur lors du chargement', 'error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selectedAgent) {
      const a = agents.find((x) => x.id === selectedAgent);
      setAgent(a);
      if (a?.personalityConfig) {
        setConfig({ ...config, ...a.personalityConfig });
      }
      chatApi.getFeedback(selectedAgent).then(setFeedback).catch(() => setFeedback([]));
    }
  }, [selectedAgent, agents]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await agentsApi.update(selectedAgent, { personalityConfig: config });
      showToast('Personnalité sauvegardée');
    } catch {
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addTopic = () => {
    if (!newTopic.trim()) return;
    const key = topicType === 'escalation' ? 'escalationTopics' : 'forbiddenTopics';
    setConfig({ ...config, [key]: [...(config[key] || []), newTopic.trim()] });
    setNewTopic('');
  };

  const removeTopic = (type: 'escalation' | 'forbidden', topic: string) => {
    const key = type === 'escalation' ? 'escalationTopics' : 'forbiddenTopics';
    setConfig({ ...config, [key]: (config[key] || []).filter((t: string) => t !== topic) });
  };

  const deleteFeedback = async (id: string) => {
    try {
      await chatApi.deleteFeedback(id);
      setFeedback(feedback.filter((f) => f.id !== id));
      showToast('Feedback supprimé');
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary-600" /> Personnalité & Comportement
        </h1>
        <p className="text-sm text-gray-500 mt-1">Configurez le ton, le rythme, la transparence et l'apprentissage de votre agent</p>
      </div>

      {/* Agent selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <label className="text-sm font-medium text-gray-700">Agent</label>
        <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm">
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {/* Ton de voix */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-gray-400" /> Ton de voix</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { value: 'professional', label: 'Professionnel' },
            { value: 'friendly', label: 'Amical' },
            { value: 'formal', label: 'Formel' },
            { value: 'casual', label: 'Décontracté' },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setConfig({ ...config, tone: t.value })}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${config.tone === t.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transparence IA */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-gray-400" /> Transparence IA (Genuine)</h2>
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input type="checkbox" checked={config.discloseAI} onChange={(e) => setConfig({ ...config, discloseAI: e.target.checked })} className="w-4 h-4 rounded" />
          <span className="text-sm text-gray-700">Divulguer que les réponses sont générées par IA</span>
        </label>
        {config.discloseAI && (
          <div>
            <label className="text-sm font-medium text-gray-700">Message de divulgation (personnalisable)</label>
            <input
              value={config.aiDisclosureMessage || ''}
              onChange={(e) => setConfig({ ...config, aiDisclosureMessage: e.target.value })}
              placeholder="— Message généré par notre assistant IA. Un agent humain peut prendre le relais."
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Ajouté à la fin du premier message de chaque nouvelle conversation.</p>
          </div>
        )}
      </div>

      {/* Pacing */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-gray-400" /> Rythme de communication (Pacing)</h2>
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input type="checkbox" checked={config.pacingEnabled} onChange={(e) => setConfig({ ...config, pacingEnabled: e.target.checked })} className="w-4 h-4 rounded" />
          <span className="text-sm text-gray-700">Simuler un délai naturel avant de répondre</span>
        </label>
        {config.pacingEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Délai minimum (ms)</label>
              <input type="number" value={config.minDelayMs} onChange={(e) => setConfig({ ...config, minDelayMs: parseInt(e.target.value) || 500 })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Délai maximum (ms)</label>
              <input type="number" value={config.maxDelayMs} onChange={(e) => setConfig({ ...config, maxDelayMs: parseInt(e.target.value) || 2500 })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </div>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">Le délai est calculé selon la longueur de la réponse (mots × 30ms). Un humain met du temps à répondre — le bot aussi.</p>
      </div>

      {/* Horaires */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> Horaires & Disponibilité</h2>
        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700">Mode de réponse automatique</label>
          <select value={config.autoReplyMode} onChange={(e) => setConfig({ ...config, autoReplyMode: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm">
            <option value="always">Toujours (24/7)</option>
            <option value="business_hours">Pendant les horaires d'ouverture uniquement</option>
            <option value="off_hours_only">Hors horaires d'ouverture uniquement</option>
          </select>
        </div>
        {config.autoReplyMode !== 'always' && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Ouverture</label>
                <input type="time" value={config.businessHours?.start || '09:00'} onChange={(e) => setConfig({ ...config, businessHours: { ...config.businessHours, start: e.target.value } })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fermeture</label>
                <input type="time" value={config.businessHours?.end || '18:00'} onChange={(e) => setConfig({ ...config, businessHours: { ...config.businessHours, end: e.target.value } })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Jours d'ouverture</label>
              <div className="flex gap-1">
                {days.map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const days = config.businessHours?.days || [];
                      const newDays = days.includes(idx) ? days.filter((d: number) => d !== idx) : [...days, idx];
                      setConfig({ ...config, businessHours: { ...config.businessHours, days: newDays } });
                    }}
                    className={`w-10 h-10 rounded-lg text-xs font-medium ${(config.businessHours?.days || []).includes(idx) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Escalade & Sujets interdits */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-gray-400" /> Escalade & Limites</h2>
        
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700">Sujets à escalader vers un humain</label>
          <p className="text-xs text-gray-400 mb-2">Quand l'utilisateur mentionne ces mots, la conversation est transférée automatiquement</p>
          <div className="flex gap-2 mb-2">
            <select value={topicType} onChange={(e) => setTopicType(e.target.value as any)} className="px-2 py-1 rounded-lg border border-gray-300 text-xs">
              <option value="escalation">Escalade</option>
              <option value="forbidden">Interdit</option>
            </select>
            <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="ex: réclamation, plainte, remboursement..." className="flex-1 px-3 py-1 rounded-lg border border-gray-300 text-sm" onKeyDown={(e) => e.key === 'Enter' && addTopic()} />
            <button onClick={addTopic} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary-50 text-primary-700 text-sm"><Plus className="w-3 h-3" /> Ajouter</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(config.escalationTopics || []).map((t: string) => (
              <span key={t} className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-orange-100 text-orange-700">
                {t} <button onClick={() => removeTopic('escalation', t)}><Trash2 className="w-3 h-3" /></button>
              </span>
            ))}
            {(config.forbiddenTopics || []).map((t: string) => (
              <span key={t} className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-red-100 text-red-700">
                {t} <button onClick={() => removeTopic('forbidden', t)}><Trash2 className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback loop */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-500" /> Apprentissage (Feedback)</h2>
        <p className="text-xs text-gray-400 mb-3">Les corrections de l'administrateur sont injectées dans le prompt de l'agent pour qu'il apprenne de ses erreurs.</p>
        {feedback.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Aucun feedback pour le moment. Corrigez une réponse dans la page Conversations pour entraîner l'agent.</p>
        ) : (
          <div className="space-y-2">
            {feedback.map((f) => (
              <div key={f.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Question: {f.userMessage.slice(0, 80)}</p>
                    <p className="text-xs text-red-600 mt-1 line-through">Réponse originale: {f.originalReply.slice(0, 80)}</p>
                    <p className="text-xs text-green-600 mt-1">Correction: {f.correctedReply.slice(0, 80)}</p>
                    {f.reason && <p className="text-xs text-gray-400 mt-1">Raison: {f.reason}</p>}
                  </div>
                  <button onClick={() => deleteFeedback(f.id)} className="p-1 rounded hover:bg-gray-100"><Trash2 className="w-4 h-4 text-gray-400" /></button>
                </div>
                {f.appliedToPrompt && <span className="text-xs text-green-600 mt-1 inline-block">✓ Appliqué au prompt</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.msg}</div>
      )}
    </div>
  );
}
