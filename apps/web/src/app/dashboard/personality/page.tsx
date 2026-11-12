'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Clock, MessageCircle, Shield, Zap, Trash2, Plus, Save, AlertCircle, Globe, Brain } from 'lucide-react';
import { agentsApi, chatApi } from '@/lib/api';
import { useUiLocale } from '@/lib/ui-locale';

export default function PersonalityPage() {
  const { t } = useUiLocale();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState('');
  const [config, setConfig] = useState<any>({
    tone: 'friendly',
    discloseAI: true,
    aiDisclosureMessage: '',
    pacingEnabled: true,
    minDelayMs: 500,
    maxDelayMs: 2500,
    businessHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] },
    autoReplyMode: 'always',
    toolsEnabled: true,
    memoryEnabled: true,
    escalationTopics: [],
    forbiddenTopics: [],
  });
  const [newTopic, setNewTopic] = useState('');
  const [topicType, setTopicType] = useState<'escalation' | 'forbidden'>('escalation');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const agentsQuery = useQuery<any[]>({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list().then((data: any) => (Array.isArray(data) ? data : data?.data ?? [])),
  });
  const agents = agentsQuery.data ?? [];

  const feedbackQuery = useQuery<any[]>({
    queryKey: ['chat', 'feedback', selectedAgent],
    queryFn: () =>
      chatApi.getFeedback(selectedAgent).then((fb) => (Array.isArray(fb) ? fb : fb?.data ?? [])),
    enabled: !!selectedAgent,
  });
  const feedback = feedbackQuery.data ?? [];

  const savePersonality = useMutation({
    mutationFn: () => agentsApi.update(selectedAgent, { personalityConfig: config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', selectedAgent] });
      showToast(t('pers.toast.saved'));
    },
    onError: () => showToast(t('pers.toast.saveError'), 'error'),
  });
  const saving = savePersonality.isPending;

  const deleteFeedbackMutation = useMutation({
    mutationFn: (id: string) => chatApi.deleteFeedback(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData(['chat', 'feedback', selectedAgent], (old: any[] = []) =>
        old.filter((f) => f.id !== id),
      );
      showToast(t('pers.toast.fbDeleted'));
    },
    onError: () => showToast(t('pers.toast.error'), 'error'),
  });

  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) setSelectedAgent(agents[0].id);
  }, [agents, selectedAgent]);

  useEffect(() => {
    if (agentsQuery.isError) showToast(t('pers.toast.loadError'), 'error');
  }, [agentsQuery.isError]);

  useEffect(() => {
    if (selectedAgent) {
      const a = agents.find((x) => x.id === selectedAgent);
      if (a?.personalityConfig) {
        const p = a.personalityConfig;
        setConfig({
          ...config,
          ...p,
          toolsEnabled: p.toolsEnabled ?? true,
          memoryEnabled: p.memoryEnabled ?? true,
          escalationTopics: Array.isArray(p.escalationTopics) ? p.escalationTopics : [],
          forbiddenTopics: Array.isArray(p.forbiddenTopics) ? p.forbiddenTopics : [],
          businessHours: {
            ...config.businessHours,
            ...(p.businessHours || {}),
            days: Array.isArray(p.businessHours?.days) ? p.businessHours.days : config.businessHours.days,
          },
        });
      }
    }
  }, [selectedAgent, agents]);

  const handleSave = () => {
    savePersonality.mutate();
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

  const deleteFeedback = (id: string) => {
    deleteFeedbackMutation.mutate(id);
  };

  const days = t('pers.days').split(',');

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary-600" /> {t('pers.title')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t('pers.subtitle')}</p>
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
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-gray-400" /> {t('pers.tone')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { value: 'professional', label: t('pers.tone.professional') },
            { value: 'friendly', label: t('pers.tone.friendly') },
            { value: 'formal', label: t('pers.tone.formal') },
            { value: 'casual', label: t('pers.tone.casual') },
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
          <span className="text-sm text-gray-700">{t('pers.disclose')}</span>
        </label>
        {config.discloseAI && (
          <div>
            <label className="text-sm font-medium text-gray-700">Message de divulgation (personnalisable)</label>
            <input
              value={config.aiDisclosureMessage || ''}
              onChange={(e) => setConfig({ ...config, aiDisclosureMessage: e.target.value })}
              placeholder={t('pers.disclosePh')}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">{t('pers.discloseHint')}</p>
          </div>
        )}
      </div>

      {/* Pacing */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-gray-400" /> Rythme de communication (Pacing)</h2>
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input type="checkbox" checked={config.pacingEnabled} onChange={(e) => setConfig({ ...config, pacingEnabled: e.target.checked })} className="w-4 h-4 rounded" />
          <span className="text-sm text-gray-700">{t('pers.delay')}</span>
        </label>
        {config.pacingEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">{t('pers.delayMin')}</label>
              <input type="number" value={config.minDelayMs} onChange={(e) => setConfig({ ...config, minDelayMs: parseInt(e.target.value) || 500 })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('pers.delayMax')}</label>
              <input type="number" value={config.maxDelayMs} onChange={(e) => setConfig({ ...config, maxDelayMs: parseInt(e.target.value) || 2500 })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </div>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">{t('pers.delayHint')}</p>
      </div>

      {/* Horaires */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> {t('pers.hours')}</h2>
        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700">{t('pers.autoReply')}</label>
          <select value={config.autoReplyMode} onChange={(e) => setConfig({ ...config, autoReplyMode: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm">
            <option value="always">{t('pers.mode.always')}</option>
            <option value="business_hours">{t('pers.mode.business')}</option>
            <option value="off_hours_only">{t('pers.mode.offHours')}</option>
          </select>
        </div>
        {config.autoReplyMode !== 'always' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('pers.open')}</label>
                <input type="time" value={config.businessHours?.start || '09:00'} onChange={(e) => setConfig({ ...config, businessHours: { ...config.businessHours, start: e.target.value } })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('pers.close')}</label>
                <input type="time" value={config.businessHours?.end || '18:00'} onChange={(e) => setConfig({ ...config, businessHours: { ...config.businessHours, end: e.target.value } })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">{t('pers.daysOpen')}</label>
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

      {/* Capacités : outils et mémoire */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-gray-400" /> {t('pers.capabilities')}</h2>
        <p className="text-xs text-gray-400 mb-3">{t('pers.capabilitiesDesc')}</p>
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input type="checkbox" checked={config.toolsEnabled} onChange={(e) => setConfig({ ...config, toolsEnabled: e.target.checked })} className="w-4 h-4 rounded" />
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{t('pers.tools')}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={config.memoryEnabled} onChange={(e) => setConfig({ ...config, memoryEnabled: e.target.checked })} className="w-4 h-4 rounded" />
          <Brain className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{t('pers.memory')}</span>
        </label>
      </div>

      {/* Escalade & Sujets interdits */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-gray-400" /> {t('pers.escalation')}</h2>
        
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700">{t('pers.escTopics')}</label>
          <p className="text-xs text-gray-400 mb-2">{t('pers.escHint')}</p>
          <div className="flex gap-2 mb-2">
            <select value={topicType} onChange={(e) => setTopicType(e.target.value as any)} className="px-2 py-1 rounded-lg border border-gray-300 text-xs">
              <option value="escalation">{t('pers.escalationOpt')}</option>
              <option value="forbidden">{t('pers.forbiddenOpt')}</option>
            </select>
            <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder={t('pers.topicPh')} className="flex-1 px-3 py-1 rounded-lg border border-gray-300 text-sm" onKeyDown={(e) => e.key === 'Enter' && addTopic()} />
            <button onClick={addTopic} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary-50 text-primary-700 text-sm"><Plus className="w-3 h-3" /> {t('site.add')}</button>
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
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-500" /> {t('pers.learning')}</h2>
        <p className="text-xs text-gray-400 mb-3">{t('pers.learningDesc')}</p>
        {feedback.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">{t('pers.noFeedback')}</p>
        ) : (
          <div className="space-y-2">
            {feedback.map((f) => (
              <div key={f.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">{t('pers.question')}: {f.userMessage.slice(0, 80)}</p>
                    <p className="text-xs text-red-600 mt-1 line-through">{t('pers.original')}: {f.originalReply.slice(0, 80)}</p>
                    <p className="text-xs text-green-600 mt-1">{t('pers.correction')}: {f.correctedReply.slice(0, 80)}</p>
                    {f.reason && <p className="text-xs text-gray-400 mt-1">{t('pers.reason')}: {f.reason}</p>}
                  </div>
                  <button onClick={() => deleteFeedback(f.id)} className="p-1 rounded hover:bg-gray-100"><Trash2 className="w-4 h-4 text-gray-400" /></button>
                </div>
                {f.appliedToPrompt && <span className="text-xs text-green-600 mt-1 inline-block">✓ {t('pers.applied')}</span>}
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
          <Save className="w-4 h-4" /> {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.msg}</div>
      )}
    </div>
  );
}
