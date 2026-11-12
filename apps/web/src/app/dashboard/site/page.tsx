'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { siteApi, agentsApi } from '@/lib/api';
import { Globe, Plus, Trash2, Save, Eye, X, ExternalLink, CheckCircle2, AlertCircle, Palette, Layout, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useUiLocale } from '@/lib/ui-locale';

const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'agents.stiamond.net';

const COLOR_PRESETS = [
  { name: 'Indigo', primary: '#6366f1', secondary: '#8b5cf6' },
  { name: 'Émeraude', primary: '#10b981', secondary: '#34d399' },
  { name: 'Corail', primary: '#f97316', secondary: '#fb923c' },
  { name: 'Rose', primary: '#ec4899', secondary: '#f472b6' },
  { name: 'Bleu', primary: '#3b82f6', secondary: '#60a5fa' },
  { name: 'Violet', primary: '#8b5cf6', secondary: '#a78bfa' },
];

export default function SiteConfigPage() {
  const { t } = useUiLocale();
  const queryClient = useQueryClient();
  const { data: sites = [], isLoading: sitesLoading, isError } = useQuery<any[]>({
    queryKey: ['sites'],
    queryFn: () => siteApi.list(),
  });
  const { data: agents = [], isLoading: agentsLoading } = useQuery<any[]>({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list().then((res: any) => res?.data || res || []),
  });
  const loading = sitesLoading || agentsLoading;
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [tab, setTab] = useState<'content' | 'design' | 'domain'>('content');

  useEffect(() => {
    if (isError) toast.error(t('site.toast.error'));
  }, [isError]);

  const saveSite = useMutation({
    mutationFn: (site: any) => (site.id ? siteApi.update(site.id, site) : siteApi.create(site)),
    onSuccess: (result, site) => {
      toast.success(site.id ? t('site.toast.updated') : `${t('site.toast.created')}: ${result.slug}`);
      setShowBuilder(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('site.toast.error')),
  });

  const deleteSite = useMutation({
    mutationFn: (id: string) => siteApi.delete(id),
    onSuccess: () => {
      toast.success(t('site.toast.deleted'));
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
    onError: () => toast.error(t('site.toast.error')),
  });

  const toggleSite = useMutation({
    mutationFn: (id: string) => siteApi.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sites'] }),
    onError: () => toast.error(t('site.toast.error')),
  });

  const verifyDomain = useMutation({
    mutationFn: (id: string) => siteApi.verifyDomain(id),
    onSuccess: () => {
      toast.success(t('site.toast.verified'));
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
    onError: () => toast.error(t('site.toast.verifyError')),
  });

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

  const handleSave = () => {
    if (!editing.businessName.trim()) { toast.error(t('site.toast.nameRequired')); return; }
    saveSite.mutate(editing);
  };

  const handleDelete = (id: string) => {
    if (!confirm(t('site.confirmDelete'))) return;
    deleteSite.mutate(id);
  };

  const handleToggle = (id: string) => {
    toggleSite.mutate(id);
  };

  const handleVerifyDomain = (id: string) => {
    verifyDomain.mutate(id);
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
            <Globe className="w-6 h-6 text-primary-600" /> {t('site.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('site.subtitle')}</p>
        </div>
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
          <Plus className="w-4 h-4" /> {t('site.create')}
        </button>
      </div>

      {/* Sites list */}
      {loading ? (
        <p className="text-center text-gray-500 py-8">{t('common.loading')}</p>
      ) : sites.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('site.empty')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('site.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{s.businessName}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.isActive ? t('site.active') : t('site.inactive')}
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
                  {s.subdomain && <span className="text-gray-400">{s.subdomain}.{SITE_DOMAIN}</span>}
                  {s.agentId && <span className="text-gray-400">Chat: ✓</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`/site/${s.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100" title={t('site.viewSite')}>
                  <Eye className="w-4 h-4 text-gray-500" />
                </a>
                <button onClick={() => { setEditing(s); setTab('content'); setShowBuilder(true); }} className="p-2 rounded-lg hover:bg-gray-100" title={t('site.edit')}>
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
              <h2 className="text-xl font-bold">{editing.id ? t('site.editSite') : t('site.createSite')}</h2>
              <button onClick={() => { setShowBuilder(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 border-b border-gray-100">
              {[
                { key: 'content', label: t('site.tab.content'), icon: Layout },
                { key: 'design', label: 'Design', icon: Palette },
                { key: 'domain', label: t('site.tab.domain'), icon: Globe },
              ].map((tb) => (
                <button
                  key={tb.key}
                  onClick={() => setTab(tb.key as any)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === tb.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tb.icon className="w-4 h-4" /> {tb.label}
                </button>
              ))}
            </div>

            <div className="p-4 lg:p-6 space-y-4">
              {tab === 'content' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('site.businessName')}</label>
                      <input value={editing.businessName} onChange={(e) => update('businessName', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('site.tagline')}</label>
                      <input value={editing.tagline || ''} onChange={(e) => update('tagline', e.target.value)} placeholder={t('site.taglinePh')} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('site.about')}</label>
                    <textarea value={editing.aboutText || ''} onChange={(e) => update('aboutText', e.target.value)} rows={4} placeholder={t('site.aboutPh')} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
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
                    <label className="text-sm font-medium text-gray-700">{t('site.agentLabel')}</label>
                    <select value={editing.agentId || ''} onChange={(e) => update('agentId', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm">
                      <option value="">{t('site.noChat')}</option>
                      {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>

                  {/* Contact */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium text-gray-700">Contact</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input value={editing.contact?.email || ''} onChange={(e) => updateContact('email', e.target.value)} placeholder="Email" className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                      <input value={editing.contact?.phone || ''} onChange={(e) => updateContact('phone', e.target.value)} placeholder={t('site.phone')} className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    </div>
                    <input value={editing.contact?.address || ''} onChange={(e) => updateContact('address', e.target.value)} placeholder={t('site.address')} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    <input value={editing.contact?.hours || ''} onChange={(e) => updateContact('hours', e.target.value)} placeholder={t('site.hoursPh')} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                  </div>

                  {/* Sections */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('site.sections')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { key: 'showAbout', label: t('site.about') },
                        { key: 'showProducts', label: t('site.products') },
                        { key: 'showContact', label: t('site.contact') },
                        { key: 'showHours', label: t('site.hours') },
                        { key: 'showChat', label: 'Chat' },
                        { key: 'showFAQ', label: 'FAQ' },
                        { key: 'showSocial', label: t('site.social') },
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
                        <button onClick={addFaq} className="flex items-center gap-1 text-xs text-primary-600"><Plus className="w-3 h-3" /> {t('site.add')}</button>
                      </div>
                      {(editing.faqs || []).map((faq: any, i: number) => (
                        <div key={i} className="border border-gray-200 rounded-lg p-3 mb-2 space-y-2">
                          <input value={faq.question} onChange={(e) => updateFaq(i, 'question', e.target.value)} placeholder={t('site.questionPh')} className="w-full px-3 py-1.5 rounded border border-gray-300 text-sm" />
                          <textarea value={faq.answer} onChange={(e) => updateFaq(i, 'answer', e.target.value)} placeholder={t('site.answerPh')} rows={2} className="w-full px-3 py-1.5 rounded border border-gray-300 text-sm" />
                          <button onClick={() => removeFaq(i)} className="text-red-400 text-xs">{t('common.delete')}</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Social */}
                  {editing.sections?.showSocial && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">{t('site.social')}</label>
                        <button onClick={addSocial} className="flex items-center gap-1 text-xs text-primary-600"><Plus className="w-3 h-3" /> {t('site.add')}</button>
                      </div>
                      {(editing.socialLinks || []).map((s: any, i: number) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <input value={s.platform} onChange={(e) => updateSocial(i, 'platform', e.target.value)} placeholder={t('site.platformPh')} className="w-32 px-3 py-1.5 rounded border border-gray-300 text-sm" />
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
                    <label className="text-sm font-medium text-gray-700 mb-2 block">{t('site.colorTheme')}</label>
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
                      <label className="text-sm font-medium text-gray-700">{t('site.primaryColor')}</label>
                      <div className="flex gap-2 mt-1">
                        <input type="color" value={editing.theme?.primaryColor || '#6366f1'} onChange={(e) => updateTheme('primaryColor', e.target.value)} className="w-12 h-10 rounded border border-gray-300" />
                        <input value={editing.theme?.primaryColor || '#6366f1'} onChange={(e) => updateTheme('primaryColor', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('site.secondaryColor')}</label>
                      <div className="flex gap-2 mt-1">
                        <input type="color" value={editing.theme?.secondaryColor || '#8b5cf6'} onChange={(e) => updateTheme('secondaryColor', e.target.value)} className="w-12 h-10 rounded border border-gray-300" />
                        <input value={editing.theme?.secondaryColor || '#8b5cf6'} onChange={(e) => updateTheme('secondaryColor', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="bg-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-2">{t('site.preview')}</p>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: editing.theme?.primaryColor }}>
                          <span className="text-white text-sm font-bold">B</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: editing.theme?.textColor }}>{editing.businessName || t('site.previewName')}</p>
                          <p className="text-xs opacity-50">{editing.tagline || t('site.previewTagline')}</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: editing.theme?.primaryColor }}>
                        {t('site.previewButton')}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {tab === 'domain' && (
                <>
                  <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium text-blue-800">{t('site.subdomainTitle')}</p>
                    <div className="flex items-center gap-2">
                      <input value={editing.subdomain || ''} onChange={(e) => update('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="mon-business" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                      <span className="text-sm text-gray-500">.{SITE_DOMAIN}</span>
                    </div>
                    <p className="text-xs text-blue-600">URL: {editing.subdomain || 'mon-business'}.{SITE_DOMAIN}</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium text-green-800">{t('site.customDomain')}</p>
                    <input value={editing.customDomain || ''} onChange={(e) => update('customDomain', e.target.value)} placeholder="www.mon-business.com" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    <div className="bg-white rounded-lg p-3 text-xs text-gray-600 space-y-1">
                      <p className="font-medium text-gray-700">{t('site.dnsConfig')}</p>
                      <p>{t('site.dnsStep1')}</p>
                      <p className="font-mono bg-gray-50 px-2 py-1 rounded">www → cdn.{SITE_DOMAIN}</p>
                      <p>{t('site.dnsStep2')}</p>
                    </div>
                    {editing.id && editing.customDomain && (
                      <button onClick={() => handleVerifyDomain(editing.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                        <CheckCircle2 className="w-4 h-4" /> {t('site.verifyDomain')}
                      </button>
                    )}
                    {editing.domainVerified && (
                      <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t('site.toast.verified')}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">SEO</p>
                    <div className="space-y-2">
                      <input value={editing.seo?.metaTitle || ''} onChange={(e) => setEditing({ ...editing, seo: { ...editing.seo, metaTitle: e.target.value } })} placeholder={t('site.seoTitlePh')} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                      <input value={editing.seo?.metaDescription || ''} onChange={(e) => setEditing({ ...editing, seo: { ...editing.seo, metaDescription: e.target.value } })} placeholder={t('site.seoDescPh')} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                    </div>
                  </div>
                </>
              )}

              {/* Save */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700">
                  <Save className="w-4 h-4" /> {t('common.save')}
                </button>
                <button onClick={() => { setShowBuilder(false); setEditing(null); }} className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
