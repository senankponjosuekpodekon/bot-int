'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { knowledgeApi } from '@/lib/api';
import { BookOpen, Plus, Trash2, Search, X, FileText, Link as LinkIcon, Upload, Building2, Loader2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useUiLocale } from '@/lib/ui-locale';

interface KnowledgeDoc {
  id: string;
  filename?: string;
  type: string;
  content: string;
  createdAt: string;
}

export default function KnowledgePage() {
  const { t } = useUiLocale();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [importMode, setImportMode] = useState<'text' | 'file' | 'url' | 'company' | 'scrape'>('text');
  const [form, setForm] = useState({ content: '', filename: '' });
  const [urlForm, setUrlForm] = useState('');
  const [companyForm, setCompanyForm] = useState('');
  const [companyResult, setCompanyResult] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  const { data: docs = [], isLoading: loading, isFetching: searching, error: loadError, refetch } = useQuery<KnowledgeDoc[]>({
    queryKey: ['knowledge', submittedQuery],
    queryFn: () => (submittedQuery ? knowledgeApi.search(submittedQuery) : knowledgeApi.list()),
  });

  useEffect(() => {
    if (loadError) {
      toast.error((loadError as any)?.response?.data?.message || (submittedQuery ? 'Recherche impossible' : 'Impossible de charger les documents'));
    }
  }, [loadError, submittedQuery]);

  const invalidateDocs = () => queryClient.invalidateQueries({ queryKey: ['knowledge'] });

  const addText = useMutation({
    mutationFn: ({ content, filename }: { content: string; filename?: string }) =>
      knowledgeApi.addText(content, filename),
    onSuccess: () => {
      toast.success(t('kn.toast.added'));
      setShowForm(false);
      setForm({ content: '', filename: '' });
      invalidateDocs();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || t('kn.toast.addError')),
  });

  const deleteDoc = useMutation({
    mutationFn: (id: string) => knowledgeApi.delete(id),
    onSuccess: (_res, id) => {
      toast.success(t('kn.toast.deleted'));
      queryClient.setQueriesData<KnowledgeDoc[]>({ queryKey: ['knowledge'] }, (old) =>
        old ? old.filter((doc) => doc.id !== id) : old,
      );
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || t('kn.toast.deleteError')),
  });

  const uploadFile = useMutation({
    mutationFn: (file: File) => knowledgeApi.uploadFile(file),
    onSuccess: () => {
      toast.success(t('kn.toast.imported'));
      setShowForm(false);
      invalidateDocs();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || t('kn.toast.importError')),
  });

  const importUrl = useMutation({
    mutationFn: (url: string) => knowledgeApi.importUrlAsync(url),
    onSuccess: () => {
      toast.success(t('kn.toast.urlStarted'));
      setShowForm(false);
      setUrlForm('');
      setTimeout(() => invalidateDocs(), 5000);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || t('kn.toast.urlError')),
  });

  const searchCompany = useMutation({
    mutationFn: (name: string) => knowledgeApi.searchCompany(name),
    onSuccess: (result, name) => {
      setCompanyResult(result);
      if (result.docs?.length > 0) {
        toast.success(`${result.docs.length} ${t('kn.toast.docsImported')} ${name}`);
        invalidateDocs();
      } else {
        toast.info(t('kn.toast.noPages'));
      }
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || t('kn.toast.companyError')),
  });

  const scrapeSite = useMutation({
    mutationFn: (url: string) => knowledgeApi.scrapeSite(url),
    onSuccess: (result) => {
      toast.success(`${result.knowledgeEntries} ${t('kn.toast.entriesAdded')}`);
      setShowForm(false);
      setUrlForm('');
      invalidateDocs();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || t('kn.toast.scrapeError')),
  });

  const uploading = uploadFile.isPending;
  const saving = addText.isPending || importUrl.isPending || searchCompany.isPending || scrapeSite.isPending;

  const filteredDocs = useMemo(() => {
    if (!query.trim()) return docs;
    return docs.filter((doc) =>
      (doc.filename || '').toLowerCase().includes(query.toLowerCase()) ||
      doc.content.toLowerCase().includes(query.toLowerCase()),
    );
  }, [docs, query]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    addText.mutate({ content: form.content, filename: form.filename || undefined });
  };

  const handleDelete = (id: string) => {
    if (!confirm(t('kn.confirmDelete'))) return;
    deleteDoc.mutate(id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile.mutate(file);
  };

  const handleUrlImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlForm.trim()) return;
    importUrl.mutate(urlForm.trim());
  };

  const handleCompanySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.trim()) return;
    setCompanyResult(null);
    searchCompany.mutate(companyForm.trim());
  };

  const handleScrapeSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlForm.trim()) return;
    scrapeSite.mutate(urlForm.trim());
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q === submittedQuery) {
      refetch();
    } else {
      setSubmittedQuery(q);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-4 lg:space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('kn.title')}</h1>
          <p className="text-sm text-gray-500">{t('kn.subtitle')}</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> {t('kn.addContent')}
        </button>
      </div>

      <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSearch}>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          <input
            className="input pl-10"
            placeholder={t('kn.searchPh')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-secondary whitespace-nowrap" disabled={searching}>
          {searching ? t('kn.searching') : t('kn.filter')}
        </button>
      </form>

      {loading ? (
        <div className="card p-12 text-center text-gray-400">{t('kn.loadingDocs')}</div>
      ) : filteredDocs.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          {t('kn.empty')}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="card p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {doc.filename || t('kn.textAdded')}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 capitalize">
                      {doc.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{t('kn.addedOn')} {new Date(doc.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-600 mt-3 line-clamp-3 whitespace-pre-line">
                    {doc.content}
                  </p>
                </div>
                <button
                  className="text-red-500 hover:text-red-700 flex items-center gap-2 text-sm"
                  onClick={() => handleDelete(doc.id)}
                >
                  <Trash2 className="w-4 h-4" /> {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-4 lg:p-6 w-full max-w-2xl relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setShowForm(false)}>
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('kn.addContent')}</h2>

            <div className="flex gap-2 mb-6">
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${importMode === 'text' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setImportMode('text')}
              >
                <FileText className="w-4 h-4" /> {t('kn.mode.text')}
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${importMode === 'file' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setImportMode('file')}
              >
                <Upload className="w-4 h-4" /> {t('kn.mode.file')}
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${importMode === 'url' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setImportMode('url')}
              >
                <LinkIcon className="w-4 h-4" /> URL
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${importMode === 'company' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setImportMode('company')}
              >
                <Building2 className="w-4 h-4" /> {t('kn.mode.company')}
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${importMode === 'scrape' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setImportMode('scrape')}
              >
                <Globe className="w-4 h-4" /> Scraper site
              </button>
            </div>

            {importMode === 'text' && (
              <form className="space-y-4" onSubmit={handleCreate}>
                <p className="text-sm text-gray-500">
                  Copiez-collez un extrait important (FAQ, script commercial, fiche produit, etc.).
                </p>
                <div>
                  <label className="label">{t('kn.nameOpt')}</label>
                  <input className="input" value={form.filename} onChange={(e) => setForm({ ...form, filename: e.target.value })} placeholder={t('kn.namePh')} />
                </div>
                <div>
                  <label className="label">{t('kn.content')}</label>
                  <textarea
                    className="input h-48 resize-y"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder={t('kn.contentPh')}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1" disabled={saving}>
                    {saving ? 'Ajout...' : 'Enregistrer'}
                  </button>
                  <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            )}

            {importMode === 'file' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  {t('kn.fileDesc')}
                </p>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 lg:p-8 text-center">
                  <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <label className="cursor-pointer">
                    <span className="btn-primary inline-block">{uploading ? t('kn.importing') : t('kn.chooseFile')}</span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.csv"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                  <p className="text-xs text-gray-400 mt-3">{t('kn.fileFormats')}</p>
                </div>
                <button type="button" className="btn-secondary w-full" onClick={() => setShowForm(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            )}

            {importMode === 'url' && (
              <form className="space-y-4" onSubmit={handleUrlImport}>
                <p className="text-sm text-gray-500">
                  {t('kn.urlDesc')}
                </p>
                <div>
                  <label className="label">{t('kn.pageUrl')}</label>
                  <input
                    className="input"
                    value={urlForm}
                    onChange={(e) => setUrlForm(e.target.value)}
                    placeholder={t('kn.pageUrlPh')}
                    type="url"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1" disabled={saving}>
                    {saving ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Import...</span> : t('kn.importBg')}
                  </button>
                  <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            )}

            {importMode === 'company' && (
              <form className="space-y-4" onSubmit={handleCompanySearch}>
                <p className="text-sm text-gray-500">
                  {t('kn.companyDesc')}
                </p>
                <div>
                  <label className="label">{t('kn.companyName')}</label>
                  <input
                    className="input"
                    value={companyForm}
                    onChange={(e) => setCompanyForm(e.target.value)}
                    placeholder={t('kn.companyPh')}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1" disabled={saving}>
                    {saving ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Recherche...</span> : t('kn.searchAndImport')}
                  </button>
                  <button type="button" className="btn-secondary flex-1" onClick={() => { setShowForm(false); setCompanyResult(null); }}>
                    Annuler
                  </button>
                </div>
                {companyResult && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <p className="font-semibold text-gray-900">{companyResult.name}</p>
                    {companyResult.website && (
                      <p className="text-gray-600">{t('kn.website')}: <a href={companyResult.website} target="_blank" rel="noreferrer" className="text-primary-600 underline">{companyResult.website}</a></p>
                    )}
                    {companyResult.description && (
                      <p className="text-gray-500 text-xs">{companyResult.description.slice(0, 200)}...</p>
                    )}
                    {companyResult.socials?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {companyResult.socials.map((s: any, i: number) => (
                          <a key={i} href={s.url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-lg bg-white border border-gray-200 text-xs text-gray-600 hover:border-primary-200">
                            {s.platform}
                          </a>
                        ))}
                      </div>
                    )}
                    {companyResult.docs?.length > 0 && (
                      <p className="text-emerald-600 text-xs">{companyResult.docs.length} {t('kn.docsInBase')}</p>
                    )}
                  </div>
                )}
              </form>
            )}

            {importMode === 'scrape' && (
              <form className="space-y-4" onSubmit={handleScrapeSite}>
                <p className="text-sm text-gray-500">
                  {t('kn.scrapeDesc')}
                </p>
                <div>
                  <label className="label">{t('kn.siteUrl')}</label>
                  <input
                    className="input"
                    value={urlForm}
                    onChange={(e) => setUrlForm(e.target.value)}
                    placeholder={t('kn.siteUrlPh')}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1" disabled={saving}>
                    {saving ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Scraping...</span> : 'Scraper et importer'}
                  </button>
                  <button type="button" className="btn-secondary flex-1" onClick={() => { setShowForm(false); setUrlForm(''); }}>
                    Annuler
                  </button>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                  <p className="font-semibold mb-1">{t('kn.extractTitle')}</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>{t('kn.extract1')}</li>
                    <li>{t('kn.extract2')}</li>
                    <li>{t('kn.extract3')}</li>
                    <li>{t('kn.extract4')}</li>
                    <li>{t('kn.extract5')}</li>
                    <li>{t('kn.extract6')}</li>
                  </ul>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
