'use client';
import { useState, useEffect, useCallback } from 'react';
import { siteApi, agentsApi } from '@/lib/api';
import { Globe, Plus, Trash2, Save, Eye, X, ExternalLink, CheckCircle2, AlertCircle, Palette, Layout, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const COLOR_PRESETS = [
  { name: 'Indigo', primary: '#6366f1', secondary: '#8b5cf6' },
  { name: 'Émeraude', primary: '#10b981', secondary: '#34d399' },
  { name: 'Corail', primary: '#f97316', secondary: '#fb923c' },
  { name: 'Rose', primary: '#ec4899', secondary: '#f472b6' },
  { name: 'Bleu', primary: '#3b82f6', secondary: '#60a5fa' },
  { name: 'Violet', primary: '#8b5cf6', secondary: '#a78bfa' },
];

export default function SiteConfigPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [tab, setTab] = useState<'content' | 'design' | 'domain'>('content');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, ag] = await Promise.all([siteApi.list(), agentsApi.list()]);
      setSites(data);
      setAgents(ag);
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => {
    setEditing({
      businessName: '',
      tagline: '',
      aboutText: '',
      logoUrl: '',
      coverImageUrl: '',
      agentId: agents[0]?.id || '',
      contact: { email: '', phone: '', address: '', hours: '' },
      socialLinks: [],
      theme: { primaryColor: '#6366f1', secondaryColor: '#8b5cf6', backgroundColor: '#ffffff', textColor: '#1f2937' },
      sections: { showAbout: true, showProducts: true, showContact: true, showChat: true, showHours: true, showSocial: false, showFAQ: false },
      faqs: [],
      customDomain: '',
      subdomain: '',
      seo: {},
    });
    setTab('content');
    setShowBuilder(true);
  };

  const handleSave = async () => {
    if (!editing.businessName.trim()) { toast.error('Nom du business requis'); return; }
    try {
      if (editing.id) {
        await siteApi.update(editing.id, editing);
        toast.success('Site mis à jour');
      } else {
        const created = await siteApi.create(editing);
        toast.success(`Site créé: ${created.slug}`);
      }
      setShowBuilder(false);
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce site ?')) return;
    try { await siteApi.delete(id); toast.success('Supprimé'); load(); }
    catch { toast.error('Erreur'); }
  };

  const handleToggle = async (id: string) => {
    try { await siteApi.toggle(id); load(); } catch { toast.error('Erreur'); }
  };

  const handleVerifyDomain = async (id: string) => {
    try { await siteApi.verifyDomain(id); toast.success('Domaine vérifié'); load(); }
    catch { toast.error('Erreur vérification'); }
  };

  const addFaq = () => {
    setEditing({ ...editing, faqs: [...(editing.faqs || []), { question: '', answer: '' }] });
  };

  const updateFaq = (idx: number, field: string, value: string) => {
    const faqs = [...editing.faqs];
    faqs[idx] = { ...faqs[idx], [field]: value };
    setEditing({ ...editing, faqs });
  };

  const removeFaq = (idx: number) => {
    setEditing({ ...editing, faqs: editing.faqs.filter((_: any, i: number) => i !== idx) });
  };

  const addSocial = () => {
    setEditing({ ...editing, socialLinks: [...(editing.socialLinks || []), { platform: '', url: '' }] });
  };

  const updateSocial = (idx: number, field: string, value: string) => {
    const socialLinks = [...editing.socialLinks];
    socialLinks[idx] = { ...socialLinks[idx], [field]: value };
    setEditing({ ...editing, socialLinks });
  };

  const update = (field: string, value: any) => setEditing({ ...editing, [field]: value });
  const updateContact = (field: string, value: string) => setEditing({ ...editing, contact: { ...editing.contact, [field]: value } });
  const updateTheme = (field: string, value: string) => setEditing({ ...editing, theme: { ...editing.theme, [field]: value } });
  const updateSection = (field: string, value: boolean) => setEditing({ ...editing, sections: { ...editing.sections, [field]: value } });

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary-600" /> Site & Landing Page
          </h1>
          <p className="text-sm text-gray-500 mt-1">Créez une vitrine en ligne avec chat intégré pour votre business</p>
        </div>
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
          <Plus className="w-4 h-4" /> Créer un site
        </button>
      </div>

      {/* Sites list */}
      {loading ? (
        <p className="text-center text-gray-500 py-8">Chargement...</p>
      ) : sites.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun site configuré</p>
          <p className="text-sm text-gray-400 mt-1">Créez votre landing page avec chat intégré</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{s.businessName}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  {s.customDomain && (
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${s.domainVerified ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {s.domainVerified ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {s.customDomain}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <a href={`/site/${s.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> /site/{s.slug}
                  </a>
                  {s.subdomain && <span className="text-gray-400">{s.subdomain}.stiamond.com</span>}
                  {s.agentId && <span className="text-gray-400">Chat: ✓</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`/site/${s.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100" title="Voir le site">
                  <Eye className="w-4 h-4 text-gray-500" />
                </a>
                <button onClick={() => { setEditing(s); setTab('content'); setShowBuilder(true); }} className="p-2 rounded-lg hover:bg-gray-100" title="Éditer">
                  <Layout className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => handleToggle(s.id)} className="p-2 rounded-lg hover:bg-gray-100">
                  <span className={`text-xs font-medium ${s.isActive ? 'text-green-600' : 'text-gray-400'}`}>{s.isActive ? 'ON' : 'OFF'}</span>
                </button>
                <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg hover:bg-gray-100">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Builder modal */}
      {showBuilder && editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold">{editing.id ? 'Éditer' : 'Créer'} le site</h2>
              <button onClick={() => { setShowBuilder(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 border-b border-gray-100">
              {[
                { key: 'content', label: 'Contenu', icon: Layout },
                { key: 'design', label: 'Design', icon: Palette },
                { key: 'domain', label: 'Domaine', icon: Globe },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as any)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>

            <div className="p-4 lg:p-6 space-y-4">
              {tab === 'content' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nom du business *</label>
                      <input value={editing.businessName} onChange={(e) => update('businessName', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Slogan</label>
                      <input value={editing.tagline || ''} onChange={(e) => update('tagline', e.target.value)} placeholder="Votre partenaire de confiance" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">À propos</label>
                    <textarea value={editing.aboutText || ''} onChange={(e) => update('aboutText', e.target.value)} rows={4} placeholder="Présentez votre business..." className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Logo URL</label>
                      <input value={editing.logoUrl || ''} onChange={(e) => update('logoUrl', e.target.value)} placeholder="https://..." className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Cover URL</label>
                      <input value={editing.coverImageUrl || ''} onChange={(e) => update('coverImageUrl', e.target.value)} placeholder="https://..." className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Agent (chat intégré)</label>
                    <select value={editing.agentId || ''} onChange={(e) => update('agentId', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm">
                      <option value="">Aucun chat</option>
                      {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>

                  {/* Contact */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium text-gray-700">Contact</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input value={editing.contact?.email || ''} onChange={(e) => updateContact('email', e.target.value)} placeholder="Email" className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                      <input value={editing.contact?.phone || ''} onChange={(e) => updateContact('phone', e.target.value)} placeholder="Téléphone" className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    </div>
                    <input value={editing.contact?.address || ''} onChange={(e) => updateContact('address', e.target.value)} placeholder="Adresse" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    <input value={editing.contact?.hours || ''} onChange={(e) => updateContact('hours', e.target.value)} placeholder="Horaires (ex: Lun-Ven 9h-18h)" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                  </div>

                  {/* Sections */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Sections à afficher</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { key: 'showAbout', label: 'À propos' },
                        { key: 'showProducts', label: 'Produits' },
                        { key: 'showContact', label: 'Contact' },
                        { key: 'showHours', label: 'Horaires' },
                        { key: 'showChat', label: 'Chat' },
                        { key: 'showFAQ', label: 'FAQ' },
                        { key: 'showSocial', label: 'Réseaux sociaux' },
                      ].map((sec) => (
                        <label key={sec.key} className="flex items-center gap-2 text-sm text-gray-600">
                          <input type="checkbox" checked={editing.sections?.[sec.key] ?? false} onChange={(e) => updateSection(sec.key, e.target.checked)} />
                          {sec.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* FAQ */}
                  {editing.sections?.showFAQ && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">FAQ</label>
                        <button onClick={addFaq} className="flex items-center gap-1 text-xs text-primary-600"><Plus className="w-3 h-3" /> Ajouter</button>
                      </div>
                      {(editing.faqs || []).map((faq: any, i: number) => (
                        <div key={i} className="border border-gray-200 rounded-lg p-3 mb-2 space-y-2">
                          <input value={faq.question} onChange={(e) => updateFaq(i, 'question', e.target.value)} placeholder="Question" className="w-full px-3 py-1.5 rounded border border-gray-300 text-sm" />
                          <textarea value={faq.answer} onChange={(e) => updateFaq(i, 'answer', e.target.value)} placeholder="Réponse" rows={2} className="w-full px-3 py-1.5 rounded border border-gray-300 text-sm" />
                          <button onClick={() => removeFaq(i)} className="text-red-400 text-xs">Supprimer</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Social */}
                  {editing.sections?.showSocial && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Réseaux sociaux</label>
                        <button onClick={addSocial} className="flex items-center gap-1 text-xs text-primary-600"><Plus className="w-3 h-3" /> Ajouter</button>
                      </div>
                      {(editing.socialLinks || []).map((s: any, i: number) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <input value={s.platform} onChange={(e) => updateSocial(i, 'platform', e.target.value)} placeholder="Plateforme" className="w-32 px-3 py-1.5 rounded border border-gray-300 text-sm" />
                          <input value={s.url} onChange={(e) => updateSocial(i, 'url', e.target.value)} placeholder="URL" className="flex-1 px-3 py-1.5 rounded border border-gray-300 text-sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === 'design' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Thème de couleurs</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => setEditing({ ...editing, theme: { ...editing.theme, primaryColor: preset.primary, secondaryColor: preset.secondary } })}
                          className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            editing.theme?.primaryColor === preset.primary ? 'border-gray-900' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex gap-1 mb-2">
                            <div className="w-6 h-6 rounded" style={{ background: preset.primary }} />
                            <div className="w-6 h-6 rounded" style={{ background: preset.secondary }} />
                          </div>
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Couleur principale</label>
                      <div className="flex gap-2 mt-1">
                        <input type="color" value={editing.theme?.primaryColor || '#6366f1'} onChange={(e) => updateTheme('primaryColor', e.target.value)} className="w-12 h-10 rounded border border-gray-300" />
                        <input value={editing.theme?.primaryColor || '#6366f1'} onChange={(e) => updateTheme('primaryColor', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Couleur secondaire</label>
                      <div className="flex gap-2 mt-1">
                        <input type="color" value={editing.theme?.secondaryColor || '#8b5cf6'} onChange={(e) => updateTheme('secondaryColor', e.target.value)} className="w-12 h-10 rounded border border-gray-300" />
                        <input value={editing.theme?.secondaryColor || '#8b5cf6'} onChange={(e) => updateTheme('secondaryColor', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="bg-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-2">Aperçu</p>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: editing.theme?.primaryColor }}>
                          <span className="text-white text-sm font-bold">B</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: editing.theme?.textColor }}>{editing.businessName || 'Mon Business'}</p>
                          <p className="text-xs opacity-50">{editing.tagline || 'Slogan'}</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: editing.theme?.primaryColor }}>
                        Bouton d'exemple
                      </button>
                    </div>
                  </div>
                </>
              )}

              {tab === 'domain' && (
                <>
                  <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium text-blue-800">Sous-domaine Stiamond Agents</p>
                    <div className="flex items-center gap-2">
                      <input value={editing.subdomain || ''} onChange={(e) => update('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="mon-business" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                      <span className="text-sm text-gray-500">.stiamond.com</span>
                    </div>
                    <p className="text-xs text-blue-600">URL: {editing.subdomain || 'mon-business'}.stiamond.com</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium text-green-800">Domaine personnalisé</p>
                    <input value={editing.customDomain || ''} onChange={(e) => update('customDomain', e.target.value)} placeholder="www.mon-business.com" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    <div className="bg-white rounded-lg p-3 text-xs text-gray-600 space-y-1">
                      <p className="font-medium text-gray-700">Configuration DNS:</p>
                      <p>1. Ajoutez un enregistrement CNAME:</p>
                      <p className="font-mono bg-gray-50 px-2 py-1 rounded">www → cdn.stiamond.com</p>
                      <p>2. Cliquez sur "Vérifier" après configuration</p>
                    </div>
                    {editing.id && editing.customDomain && (
                      <button onClick={() => handleVerifyDomain(editing.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                        <CheckCircle2 className="w-4 h-4" /> Vérifier le domaine
                      </button>
                    )}
                    {editing.domainVerified && (
                      <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Domaine vérifié</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">SEO</p>
                    <div className="space-y-2">
                      <input value={editing.seo?.metaTitle || ''} onChange={(e) => setEditing({ ...editing, seo: { ...editing.seo, metaTitle: e.target.value } })} placeholder="Titre SEO" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                      <input value={editing.seo?.metaDescription || ''} onChange={(e) => setEditing({ ...editing, seo: { ...editing.seo, metaDescription: e.target.value } })} placeholder="Description SEO" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    </div>
                  </div>
                </>
              )}

              {/* Save */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700">
                  <Save className="w-4 h-4" /> Sauvegarder
                </button>
                <button onClick={() => { setShowBuilder(false); setEditing(null); }} className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
