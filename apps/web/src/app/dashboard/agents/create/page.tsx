'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot, ChevronRight, ChevronLeft, SkipForward, Sparkles, Check,
  MessageCircle, Shield, Zap, Clock, AlertCircle, BookOpen, Code2,
  Copy, Check as CheckIcon, Globe, FileText, Brain
} from 'lucide-react';
import { toast } from 'sonner';
import { agentsApi, knowledgeApi } from '@/lib/api';
import { useUiLocale } from '@/lib/ui-locale';

const TEMPLATES: Record<string, Array<{ labelKey: string; promptKey: string }>> = {
  general: [
    { labelKey: 'agc.tpl.general1.label', promptKey: 'agc.tpl.general1.prompt' },
    { labelKey: 'agc.tpl.general2.label', promptKey: 'agc.tpl.general2.prompt' },
  ],
  sales: [
    { labelKey: 'agc.tpl.sales1.label', promptKey: 'agc.tpl.sales1.prompt' },
    { labelKey: 'agc.tpl.sales2.label', promptKey: 'agc.tpl.sales2.prompt' },
  ],
  support: [
    { labelKey: 'agc.tpl.support1.label', promptKey: 'agc.tpl.support1.prompt' },
    { labelKey: 'agc.tpl.support2.label', promptKey: 'agc.tpl.support2.prompt' },
  ],
  hr: [
    { labelKey: 'agc.tpl.hr1.label', promptKey: 'agc.tpl.hr1.prompt' },
    { labelKey: 'agc.tpl.hr2.label', promptKey: 'agc.tpl.hr2.prompt' },
  ],
};

const TONES = [
  { value: 'professional', labelKey: 'agc.tone.professional' },
  { value: 'friendly', labelKey: 'agc.tone.friendly' },
  { value: 'formal', labelKey: 'agc.tone.formal' },
  { value: 'casual', labelKey: 'agc.tone.casual' },
];

const INDUSTRY_KEYS = [
  'agc.ind.ecommerce', 'agc.ind.saas', 'agc.ind.realestate', 'agc.ind.health', 'agc.ind.finance', 'agc.ind.education',
  'agc.ind.food', 'agc.ind.tourism', 'agc.ind.retail', 'agc.ind.auto', 'agc.ind.construction', 'agc.ind.logistics',
  'agc.ind.recruiting', 'agc.ind.legal', 'agc.ind.marketing', 'agc.ind.other',
];

const STEPS = ['agc.step.identity', 'agc.step.personality', 'agc.step.knowledge', 'agc.step.widget'];

export default function CreateAgentPage() {
  const router = useRouter();
  const { t } = useUiLocale();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const [identity, setIdentity] = useState({
    name: '',
    type: 'general',
    industry: '',
    systemPrompt: '',
    personality: '',
  });

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

  const [knowledgeForm, setKnowledgeForm] = useState({ content: '', filename: '', url: '' });
  const [widget, setWidget] = useState({ color: '#4f46e5', title: 'Chat IA', position: 'bottom-right' });

  const handleCreate = async () => {
    setSaving(true);
    try {
      const agent = await agentsApi.create({
        name: identity.name,
        type: identity.type,
        industry: identity.industry,
        systemPrompt: identity.systemPrompt,
        personality: identity.personality,
        isActive: true,
        personalityConfig: config,
      });

      if (knowledgeForm.content.trim()) {
        try {
          await knowledgeApi.addText(knowledgeForm.content, knowledgeForm.filename || undefined);
          toast.success(t('agc.toast.docAdded'));
        } catch {
          toast.error(t('agc.toast.docError'));
        }
      }

      if (knowledgeForm.url.trim()) {
        try {
          await knowledgeApi.importUrlAsync(knowledgeForm.url.trim());
          toast.success(t('agc.toast.importStarted'));
        } catch {
          toast.error(t('agc.toast.importError'));
        }
      }

      setCreated({ ...agent, ...widget });
      toast.success(t('agc.toast.created'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('agc.toast.createError'));
    } finally {
      setSaving(false);
    }
  };

  const addTopic = (type: 'escalation' | 'forbidden', value: string) => {
    if (!value.trim()) return;
    const key = type === 'escalation' ? 'escalationTopics' : 'forbiddenTopics';
    setConfig({ ...config, [key]: [...(config[key] || []), value.trim()] });
  };

  const removeTopic = (type: 'escalation' | 'forbidden', value: string) => {
    const key = type === 'escalation' ? 'escalationTopics' : 'forbiddenTopics';
    setConfig({ ...config, [key]: (config[key] || []).filter((t: string) => t !== value) });
  };

  const canProceed = () => {
    if (step === 0) return identity.name.length >= 2 && identity.systemPrompt.length >= 10;
    return true;
  };

  const copyEmbed = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const apiUrl = typeof window !== 'undefined'
    ? `${window.location.origin.replace(/:\d+$/, ':3001')}/api`
    : 'http://localhost:3001/api';

  const embedCode = created
    ? `<script src="${apiUrl}/widget/embed.js"\n  data-agent="${created.id}"\n  data-color="${widget.color}"\n  data-title="${widget.title}"\n  data-position="${widget.position}"\n  data-api="${apiUrl}">\n</script>`
    : '';

  if (created) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <div className="card p-4 lg:p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{created.name} {t('agc.isReady')}</h1>
          <p className="text-gray-500 mt-2">{t('agc.embedHint')}</p>
          <div className="mt-6 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{t('agc.embedCode')}</span>
              <button onClick={() => copyEmbed(embedCode)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100">
                {copied ? <><CheckIcon className="w-3 h-3" /> {t('agc.copied')}</> : <><Copy className="w-3 h-3" /> {t('agc.copy')}</>}
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto"><code>{embedCode}</code></pre>
          </div>
          <div className="mt-8 flex justify-center gap-3">
            <a href={`/dashboard/agents/${created.id}`} className="px-6 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">{t('agc.configureLater')}</a>
            <a href="/dashboard/agents" className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">{t('agc.viewAgents')}</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2"><Bot className="w-6 h-6 text-primary-600" /> {t('agc.title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('agc.subtitle')}</p>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((key, i) => (
          <div key={key} className={`flex-1 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${i <= step ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className="w-6 h-6 rounded-full bg-white text-primary-700 text-xs flex items-center justify-center font-bold shadow-sm">{i + 1}</span>
            {t(key)}
          </div>
        ))}
      </div>

      <div className="card p-4 lg:p-6 mb-6 min-h-[420px]">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Bot className="w-5 h-5 text-primary-600" /> {t('agc.identityTitle')}</h2>
            <div>
              <label className="label">{t('agc.name')}</label>
              <input name="name" className="input" value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} placeholder="Assistant Support" required />
            </div>
            <div>
              <label className="label">{t('agc.type')}</label>
              <select className="input" value={identity.type} onChange={(e) => setIdentity({ ...identity, type: e.target.value })}>
                <option value="general">{t('agc.type.general')}</option>
                <option value="sales">{t('agc.type.sales')}</option>
                <option value="support">{t('agc.type.support')}</option>
                <option value="hr">{t('agc.type.hr')}</option>
              </select>
            </div>
            <div>
              <label className="label">{t('agc.industry')}</label>
              <select className="input" value={identity.industry} onChange={(e) => setIdentity({ ...identity, industry: e.target.value })}>
                <option value="">{t('agc.industry.placeholder')}</option>
                {INDUSTRY_KEYS.map((k) => <option key={k} value={t(k)}>{t(k)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('agc.systemPrompt')}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(TEMPLATES[identity.type] || []).map((tpl) => (
                  <button key={tpl.labelKey} type="button" onClick={() => setIdentity({ ...identity, systemPrompt: t(tpl.promptKey).replace(/{{industry}}/g, identity.industry || t('agc.industryFallback')) })} className="px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {t(tpl.labelKey)}
                  </button>
                ))}
              </div>
              <textarea name="systemPrompt" className="input resize-none" rows={4} value={identity.systemPrompt} onChange={(e) => setIdentity({ ...identity, systemPrompt: e.target.value })} placeholder={t('agc.systemPrompt.placeholder')} required />
            </div>
            <div>
              <label className="label">{t('agc.personality.label')}</label>
              <input name="personality" className="input" value={identity.personality} onChange={(e) => setIdentity({ ...identity, personality: e.target.value })} placeholder={t('agc.personality.placeholder')} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary-600" /> {t('agc.personalityTitle')}</h2>
            <div>
              <label className="label">{t('agc.tone')}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {TONES.map((tn) => (
                  <button key={tn.value} onClick={() => setConfig({ ...config, tone: tn.value })} className={`px-3 py-2 rounded-lg text-sm font-medium ${config.tone === tn.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{t(tn.labelKey)}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.discloseAI} onChange={(e) => setConfig({ ...config, discloseAI: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700">{t('agc.discloseAI')}</span>
              </label>
              {config.discloseAI && <input className="input mt-2" value={config.aiDisclosureMessage} onChange={(e) => setConfig({ ...config, aiDisclosureMessage: e.target.value })} placeholder={t('agc.disclosure.placeholder')} />}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-2"><Shield className="w-4 h-4" /> {t('agc.autoReply')}</label>
                <select className="input" value={config.autoReplyMode} onChange={(e) => setConfig({ ...config, autoReplyMode: e.target.value })}>
                  <option value="always">{t('agc.autoReply.always')}</option>
                  <option value="business_hours">{t('agc.autoReply.businessHours')}</option>
                  <option value="off_hours_only">{t('agc.autoReply.offHours')}</option>
                </select>
              </div>
              {config.autoReplyMode !== 'always' && (
                <div>
                  <label className="label flex items-center gap-2"><Clock className="w-4 h-4" /> {t('agc.hours')}</label>
                  <div className="flex gap-2">
                    <input type="time" className="input" value={config.businessHours.start} onChange={(e) => setConfig({ ...config, businessHours: { ...config.businessHours, start: e.target.value } })} />
                    <input type="time" className="input" value={config.businessHours.end} onChange={(e) => setConfig({ ...config, businessHours: { ...config.businessHours, end: e.target.value } })} />
                  </div>
                  <div className="flex gap-1 mt-2">
                    {[0,1,2,3,4,5,6].map((idx) => (
                      <button key={idx} onClick={() => {
                        const days = config.businessHours.days || [];
                        const newDays = days.includes(idx) ? days.filter((x: number) => x !== idx) : [...days, idx];
                        setConfig({ ...config, businessHours: { ...config.businessHours, days: newDays } });
                      }} className={`w-10 h-10 rounded-lg text-xs font-medium ${(config.businessHours.days || []).includes(idx) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{t(`agc.day.${idx}`)}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-2"><Zap className="w-4 h-4" /> {t('agc.minDelay')}</label>
                <input type="number" className="input" value={config.minDelayMs} onChange={(e) => setConfig({ ...config, minDelayMs: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">{t('agc.maxDelay')}</label>
                <input type="number" className="input" value={config.maxDelayMs} onChange={(e) => setConfig({ ...config, maxDelayMs: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-primary-600" /> {t('agc.capabilities')}</h3>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input type="checkbox" checked={config.toolsEnabled} onChange={(e) => setConfig({ ...config, toolsEnabled: e.target.checked })} className="w-4 h-4 rounded" />
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{t('agc.tools')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.memoryEnabled} onChange={(e) => setConfig({ ...config, memoryEnabled: e.target.checked })} className="w-4 h-4 rounded" />
                <Brain className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{t('agc.memory')}</span>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TopicInput label={t('agc.escalation')} color="orange" topics={config.escalationTopics} onAdd={addTopic} onRemove={removeTopic} />
              <TopicInput label={t('agc.forbidden')} color="red" topics={config.forbiddenTopics} onAdd={addTopic} onRemove={removeTopic} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary-600" /> {t('agc.knowledgeTitle')}</h2>
            <p className="text-sm text-gray-500">{t('agc.knowledgeHint')}</p>
            <div>
              <label className="label flex items-center gap-2"><FileText className="w-4 h-4" /> Texte / FAQ</label>
              <input className="input mb-2" value={knowledgeForm.filename} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, filename: e.target.value })} placeholder={t('agc.docName')} />
              <textarea className="input resize-none" rows={4} value={knowledgeForm.content} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })} placeholder={t('agc.docPlaceholder')} />
            </div>
            <div>
              <label className="label flex items-center gap-2"><Globe className="w-4 h-4" /> {t('agc.urlImport')}</label>
              <input type="url" className="input" value={knowledgeForm.url} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, url: e.target.value })} placeholder="https://..." />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Code2 className="w-5 h-5 text-primary-600" /> {t('agc.step.widget')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('agc.widgetTitle')}</label>
                <input className="input" value={widget.title} onChange={(e) => setWidget({ ...widget, title: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('agc.position')}</label>
                <select className="input" value={widget.position} onChange={(e) => setWidget({ ...widget, position: e.target.value })}>
                  <option value="bottom-right">{t('agc.posRight')}</option>
                  <option value="bottom-left">{t('agc.posLeft')}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">{t('agc.color')}</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={widget.color} onChange={(e) => setWidget({ ...widget, color: e.target.value })} className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer" />
                <input className="input" value={widget.color} onChange={(e) => setWidget({ ...widget, color: e.target.value })} />
              </div>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 lg:p-6 h-40 flex items-center justify-center relative mt-4">
              <p className="text-gray-400 text-sm">{t('agc.preview')}</p>
              <div className="absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style={{ background: widget.color }}>
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> {t('agc.prev')}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {step < STEPS.length - 1 ? (
            <>
              <button onClick={() => setStep(step + 1)} className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                <SkipForward className="w-4 h-4" /> {t('agc.skip')}
              </button>
              <button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="px-6 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
                {t('agc.next')} <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={handleCreate} disabled={!canProceed() || saving} className="px-6 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
              {saving ? t('agc.creating') : t('agc.create')} <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TopicInput({
  label,
  color,
  topics,
  onAdd,
  onRemove,
}: {
  label: string;
  color: 'orange' | 'red';
  topics: string[];
  onAdd: (type: 'escalation' | 'forbidden', value: string) => void;
  onRemove: (type: 'escalation' | 'forbidden', value: string) => void;
}) {
  const [value, setValue] = useState('');
  const { t } = useUiLocale();
  const type = color === 'orange' ? 'escalation' : 'forbidden';
  return (
    <div>
      <label className="label flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {label}</label>
      <div className="flex gap-2 mb-2">
        <input className="input flex-1" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { onAdd(type, value); setValue(''); } }} placeholder={type === 'escalation' ? t('agc.exampleEscalation') : t('agc.exampleForbidden')} />
        <button onClick={() => { onAdd(type, value); setValue(''); }} className="px-3 py-2 rounded-lg bg-primary-50 text-primary-700 text-sm hover:bg-primary-100">{t('agc.add')}</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(topics || []).map((t) => (
          <span key={t} className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full ${color === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
            {t} <button onClick={() => onRemove(type, t)} className="hover:opacity-70">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}
