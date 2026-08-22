'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot, ChevronRight, ChevronLeft, SkipForward, Sparkles, Check,
  MessageCircle, Shield, Zap, Clock, AlertCircle, BookOpen, Code2,
  Copy, Check as CheckIcon, Globe, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { agentsApi, knowledgeApi } from '@/lib/api';

const TEMPLATES: Record<string, Array<{ label: string; prompt: string }>> = {
  general: [
    { label: 'Assistant polyvalent', prompt: 'Tu es un assistant IA polyvalent. Tu réponds de manière claire, concise et utile. Tu réponds toujours en français.' },
    { label: 'Guide conversationnel', prompt: 'Tu es un guide conversationnel bienveillant. Tu accueilles chaleureusement et orientes vers les bonnes ressources. Tu réponds en français.' },
  ],
  sales: [
    { label: 'Commercial B2B', prompt: 'Tu es un expert commercial B2B. Tu qualifies les prospects, identifies leurs pain points et demandes email/téléphone pour qualification. Tu réponds en français.' },
    { label: 'Vendeur e-commerce', prompt: 'Tu es un conseiller de vente e-commerce. Tu aides à choisir les produits et proposes des upsells pertinents. Tu réponds en français.' },
  ],
  support: [
    { label: 'Support N1', prompt: 'Tu es un support technique niveau 1. Tu diagnostiques avec des questions méthodiques et escalades si besoin. Tu réponds en français.' },
    { label: 'FAQ', prompt: 'Tu réponds aux questions fréquentes et proposes de transmettre à un humain si tu ne sais pas. Tu réponds en français.' },
  ],
  hr: [
    { label: 'RH onboarding', prompt: 'Tu es un assistant RH. Tu accueilles les nouveaux employés et guides leurs premières étapes. Tu réponds en français.' },
    { label: 'RH FAQ', prompt: 'Tu réponds aux questions RH internes (congés, paie, avantages) de manière professionnelle. Tu réponds en français.' },
  ],
};

const TONES = [
  { value: 'professional', label: 'Professionnel' },
  { value: 'friendly', label: 'Amical' },
  { value: 'formal', label: 'Formel' },
  { value: 'casual', label: 'Décontracté' },
];

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const STEPS = ['Identité', 'Personnalité', 'Connaissances', 'Widget'];

export default function CreateAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const [identity, setIdentity] = useState({
    name: '',
    type: 'general',
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
        systemPrompt: identity.systemPrompt,
        personality: identity.personality,
        isActive: true,
        personalityConfig: config,
      });

      if (knowledgeForm.content.trim()) {
        try {
          await knowledgeApi.addText(knowledgeForm.content, knowledgeForm.filename || undefined);
          toast.success('Document ajouté à la base de connaissances');
        } catch {
          toast.error('Impossible d\'ajouter le document');
        }
      }

      if (knowledgeForm.url.trim()) {
        try {
          await knowledgeApi.importUrlAsync(knowledgeForm.url.trim());
          toast.success('Import URL lancé');
        } catch {
          toast.error('Impossible d\'importer l\'URL');
        }
      }

      setCreated({ ...agent, ...widget });
      toast.success('Agent créé avec succès');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erreur lors de la création');
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
      <div className="p-8 max-w-4xl mx-auto">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{created.name} est prêt</h1>
          <p className="text-gray-500 mt-2">Intègre le chat sur ton site avec ce code :</p>
          <div className="mt-6 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Code d&apos;intégration</span>
              <button onClick={() => copyEmbed(embedCode)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100">
                {copied ? <><CheckIcon className="w-3 h-3" /> Copié</> : <><Copy className="w-3 h-3" /> Copier</>}
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto"><code>{embedCode}</code></pre>
          </div>
          <div className="mt-8 flex justify-center gap-3">
            <a href={`/dashboard/agents/${created.id}`} className="px-6 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">Configurer plus tard</a>
            <a href="/dashboard/agents" className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">Voir mes agents</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Bot className="w-6 h-6 text-primary-600" /> Créer un nouvel agent</h1>
        <p className="text-gray-500 text-sm mt-1">Assistant pas-à-pas. Chaque étape est optionnelle.</p>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className={`flex-1 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${i <= step ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className="w-6 h-6 rounded-full bg-white text-primary-700 text-xs flex items-center justify-center font-bold shadow-sm">{i + 1}</span>
            {label}
          </div>
        ))}
      </div>

      <div className="card p-6 mb-6 min-h-[420px]">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Bot className="w-5 h-5 text-primary-600" /> Identité de l&apos;agent</h2>
            <div>
              <label className="label">Nom</label>
              <input className="input" value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} placeholder="Assistant Support" required />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={identity.type} onChange={(e) => setIdentity({ ...identity, type: e.target.value })}>
                <option value="general">Général</option>
                <option value="sales">Commercial</option>
                <option value="support">Support client</option>
                <option value="hr">RH</option>
              </select>
            </div>
            <div>
              <label className="label">Prompt système</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(TEMPLATES[identity.type] || []).map((tpl) => (
                  <button key={tpl.label} type="button" onClick={() => setIdentity({ ...identity, systemPrompt: tpl.prompt })} className="px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {tpl.label}
                  </button>
                ))}
              </div>
              <textarea className="input resize-none" rows={4} value={identity.systemPrompt} onChange={(e) => setIdentity({ ...identity, systemPrompt: e.target.value })} placeholder="Tu es..." required />
            </div>
            <div>
              <label className="label">Description / personnalité courte (optionnel)</label>
              <input className="input" value={identity.personality} onChange={(e) => setIdentity({ ...identity, personality: e.target.value })} placeholder="Amical, orienté solutions, patient" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary-600" /> Personnalité & comportement</h2>
            <div>
              <label className="label">Ton de voix</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {TONES.map((t) => (
                  <button key={t.value} onClick={() => setConfig({ ...config, tone: t.value })} className={`px-3 py-2 rounded-lg text-sm font-medium ${config.tone === t.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{t.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.discloseAI} onChange={(e) => setConfig({ ...config, discloseAI: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700">Divulguer que les réponses sont générées par IA</span>
              </label>
              {config.discloseAI && <input className="input mt-2" value={config.aiDisclosureMessage} onChange={(e) => setConfig({ ...config, aiDisclosureMessage: e.target.value })} placeholder="Message de divulgation" />}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-2"><Shield className="w-4 h-4" /> Mode réponse auto</label>
                <select className="input" value={config.autoReplyMode} onChange={(e) => setConfig({ ...config, autoReplyMode: e.target.value })}>
                  <option value="always">Toujours</option>
                  <option value="business_hours">Horaires d&apos;ouverture</option>
                  <option value="off_hours_only">Hors horaires</option>
                </select>
              </div>
              {config.autoReplyMode !== 'always' && (
                <div>
                  <label className="label flex items-center gap-2"><Clock className="w-4 h-4" /> Horaires</label>
                  <div className="flex gap-2">
                    <input type="time" className="input" value={config.businessHours.start} onChange={(e) => setConfig({ ...config, businessHours: { ...config.businessHours, start: e.target.value } })} />
                    <input type="time" className="input" value={config.businessHours.end} onChange={(e) => setConfig({ ...config, businessHours: { ...config.businessHours, end: e.target.value } })} />
                  </div>
                  <div className="flex gap-1 mt-2">
                    {DAYS.map((d, idx) => (
                      <button key={d} onClick={() => {
                        const days = config.businessHours.days || [];
                        const newDays = days.includes(idx) ? days.filter((x: number) => x !== idx) : [...days, idx];
                        setConfig({ ...config, businessHours: { ...config.businessHours, days: newDays } });
                      }} className={`w-10 h-10 rounded-lg text-xs font-medium ${(config.businessHours.days || []).includes(idx) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-2"><Zap className="w-4 h-4" /> Délai min (ms)</label>
                <input type="number" className="input" value={config.minDelayMs} onChange={(e) => setConfig({ ...config, minDelayMs: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">Délai max (ms)</label>
                <input type="number" className="input" value={config.maxDelayMs} onChange={(e) => setConfig({ ...config, maxDelayMs: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TopicInput label="Sujets à escalader" color="orange" topics={config.escalationTopics} onAdd={addTopic} onRemove={removeTopic} />
              <TopicInput label="Sujets interdits" color="red" topics={config.forbiddenTopics} onAdd={addTopic} onRemove={removeTopic} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary-600" /> Connaissances de départ</h2>
            <p className="text-sm text-gray-500">Ajoute un texte ou une URL à la base de connaissances. L&apos;agent l&apos;utilisera pour répondre.</p>
            <div>
              <label className="label flex items-center gap-2"><FileText className="w-4 h-4" /> Texte / FAQ</label>
              <input className="input mb-2" value={knowledgeForm.filename} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, filename: e.target.value })} placeholder="Nom du document (optionnel)" />
              <textarea className="input resize-none" rows={4} value={knowledgeForm.content} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })} placeholder="Colle ici un extrait, une FAQ, un script..." />
            </div>
            <div>
              <label className="label flex items-center gap-2"><Globe className="w-4 h-4" /> URL à importer</label>
              <input type="url" className="input" value={knowledgeForm.url} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, url: e.target.value })} placeholder="https://..." />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Code2 className="w-5 h-5 text-primary-600" /> Widget</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Titre du widget</label>
                <input className="input" value={widget.title} onChange={(e) => setWidget({ ...widget, title: e.target.value })} />
              </div>
              <div>
                <label className="label">Position</label>
                <select className="input" value={widget.position} onChange={(e) => setWidget({ ...widget, position: e.target.value })}>
                  <option value="bottom-right">Bas droite</option>
                  <option value="bottom-left">Bas gauche</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Couleur</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={widget.color} onChange={(e) => setWidget({ ...widget, color: e.target.value })} className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer" />
                <input className="input" value={widget.color} onChange={(e) => setWidget({ ...widget, color: e.target.value })} />
              </div>
            </div>
            <div className="bg-gray-100 rounded-lg p-6 h-40 flex items-center justify-center relative mt-4">
              <p className="text-gray-400 text-sm">Aperçu de ton site</p>
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
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {step < STEPS.length - 1 ? (
            <>
              <button onClick={() => setStep(step + 1)} className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                <SkipForward className="w-4 h-4" /> Passer
              </button>
              <button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="px-6 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={handleCreate} disabled={!canProceed() || saving} className="px-6 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
              {saving ? 'Création...' : 'Créer l\'agent'} <Check className="w-4 h-4" />
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
  const type = color === 'orange' ? 'escalation' : 'forbidden';
  return (
    <div>
      <label className="label flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {label}</label>
      <div className="flex gap-2 mb-2">
        <input className="input flex-1" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { onAdd(type, value); setValue(''); } }} placeholder={`ex: ${type === 'escalation' ? 'réclamation' : 'insulte'}`} />
        <button onClick={() => { onAdd(type, value); setValue(''); }} className="px-3 py-2 rounded-lg bg-primary-50 text-primary-700 text-sm hover:bg-primary-100">Ajouter</button>
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
