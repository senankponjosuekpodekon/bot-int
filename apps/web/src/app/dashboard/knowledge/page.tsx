'use client';

import { useEffect, useMemo, useState } from 'react';
import { knowledgeApi } from '@/lib/api';
import { BookOpen, Plus, Trash2, Search, X, FileText, Link as LinkIcon, Upload, Building2, Loader2, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface KnowledgeDoc {
  id: string;
  filename?: string;
  type: string;
  content: string;
  createdAt: string;
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [importMode, setImportMode] = useState<'text' | 'file' | 'url' | 'company' | 'scrape'>('text');
  const [form, setForm] = useState({ content: '', filename: '' });
  const [urlForm, setUrlForm] = useState('');
  const [companyForm, setCompanyForm] = useState('');
  const [companyResult, setCompanyResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const filteredDocs = useMemo(() => {
    if (!query.trim()) return docs;
    return docs.filter((doc) =>
      (doc.filename || '').toLowerCase().includes(query.toLowerCase()) ||
      doc.content.toLowerCase().includes(query.toLowerCase()),
    );
  }, [docs, query]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await knowledgeApi.list();
      setDocs(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Impossible de charger les documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      await knowledgeApi.addText(form.content, form.filename || undefined);
      toast.success('Document ajouté');
      setShowForm(false);
      setForm({ content: '', filename: '' });
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Ajout impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      await knowledgeApi.delete(id);
      toast.success('Document supprimé');
      setDocs((prev) => prev.filter((doc) => doc.id !== id));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Suppression impossible');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await knowledgeApi.uploadFile(file);
      toast.success('Fichier importé avec succès');
      setShowForm(false);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Import impossible');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlForm.trim()) return;
    setSaving(true);
    try {
      await knowledgeApi.importUrlAsync(urlForm.trim());
      toast.success('Import URL lancé en arrière-plan');
      setShowForm(false);
      setUrlForm('');
      setTimeout(() => load(), 5000);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Import URL impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleCompanySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.trim()) return;
    setSaving(true);
    setCompanyResult(null);
    try {
      const result = await knowledgeApi.searchCompany(companyForm.trim());
      setCompanyResult(result);
      if (result.docs?.length > 0) {
        toast.success(`${result.docs.length} document(s) importé(s) pour ${companyForm.trim()}`);
        load();
      } else {
        toast.info('Recherche terminée — aucune page exploitable trouvée');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Recherche entreprise impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleScrapeSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlForm.trim()) return;
    setSaving(true);
    try {
      const result = await knowledgeApi.scrapeSite(urlForm.trim());
      toast.success(`${result.knowledgeEntries} entrée(s) ajoutée(s) à la base de connaissances`);
      setShowForm(false);
      setUrlForm('');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Scraping impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return load();
    setSearching(true);
    try {
      const results = await knowledgeApi.search(query.trim());
      setDocs(results);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Recherche impossible');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-4 lg:space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Base de connaissances</h1>
          <p className="text-sm text-gray-500">Centralisez les documents utilisés par vos agents IA.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Ajouter du contenu
        </button>
      </div>

      <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSearch}>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          <input
            className="input pl-10"
            placeholder="Rechercher un document ou un passage"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-secondary whitespace-nowrap" disabled={searching}>
          {searching ? 'Recherche...' : 'Filtrer'}
        </button>
      </form>

      {loading ? (
        <div className="card p-12 text-center text-gray-400">Chargement des documents...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          Aucun document pour le moment. Ajoutez-en pour alimenter vos agents.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="card p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {doc.filename || 'Texte ajouté'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 capitalize">
                      {doc.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">Ajouté le {new Date(doc.createdAt).toLocaleDateString('fr-FR')}</p>
                  <p className="text-sm text-gray-600 mt-3 line-clamp-3 whitespace-pre-line">
                    {doc.content}
                  </p>
                </div>
                <button
                  className="text-red-500 hover:text-red-700 flex items-center gap-2 text-sm"
                  onClick={() => handleDelete(doc.id)}
                >
                  <Trash2 className="w-4 h-4" /> Supprimer
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ajouter du contenu</h2>

            <div className="flex gap-2 mb-6">
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${importMode === 'text' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setImportMode('text')}
              >
                <FileText className="w-4 h-4" /> Texte
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${importMode === 'file' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setImportMode('file')}
              >
                <Upload className="w-4 h-4" /> Fichier
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
                <Building2 className="w-4 h-4" /> Entreprise
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
                  <label className="label">Nom (optionnel)</label>
                  <input className="input" value={form.filename} onChange={(e) => setForm({ ...form, filename: e.target.value })} placeholder="FAQ Support" />
                </div>
                <div>
                  <label className="label">Contenu</label>
                  <textarea
                    className="input h-48 resize-y"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Collez votre texte ici..."
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
                  Importez un fichier PDF ou texte. Le contenu sera extrait et indexé automatiquement.
                </p>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 lg:p-8 text-center">
                  <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <label className="cursor-pointer">
                    <span className="btn-primary inline-block">{uploading ? 'Import...' : 'Choisir un fichier'}</span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.csv"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                  <p className="text-xs text-gray-400 mt-3">PDF, TXT, MD, CSV — 10 Mo max</p>
                </div>
                <button type="button" className="btn-secondary w-full" onClick={() => setShowForm(false)}>
                  Annuler
                </button>
              </div>
            )}

            {importMode === 'url' && (
              <form className="space-y-4" onSubmit={handleUrlImport}>
                <p className="text-sm text-gray-500">
                  Importez le contenu d'une page web. Le scraping s'exécute en arrière-plan avec rendu JavaScript.
                </p>
                <div>
                  <label className="label">URL de la page</label>
                  <input
                    className="input"
                    value={urlForm}
                    onChange={(e) => setUrlForm(e.target.value)}
                    placeholder="https://exemple.com/page"
                    type="url"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1" disabled={saving}>
                    {saving ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Import...</span> : 'Importer en arrière-plan'}
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
                  Recherchez une entreprise par nom. Le système trouve automatiquement son site web, ses réseaux sociaux et importe le contenu dans la base de connaissances.
                </p>
                <div>
                  <label className="label">Nom de l'entreprise</label>
                  <input
                    className="input"
                    value={companyForm}
                    onChange={(e) => setCompanyForm(e.target.value)}
                    placeholder="Ex: Stiamond Agents, OpenAI, Renault..."
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1" disabled={saving}>
                    {saving ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Recherche...</span> : 'Rechercher et importer'}
                  </button>
                  <button type="button" className="btn-secondary flex-1" onClick={() => { setShowForm(false); setCompanyResult(null); }}>
                    Annuler
                  </button>
                </div>
                {companyResult && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <p className="font-semibold text-gray-900">{companyResult.name}</p>
                    {companyResult.website && (
                      <p className="text-gray-600">Site web: <a href={companyResult.website} target="_blank" rel="noreferrer" className="text-primary-600 underline">{companyResult.website}</a></p>
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
                      <p className="text-emerald-600 text-xs">{companyResult.docs.length} document(s) importé(s) dans la base</p>
                    )}
                  </div>
                )}
              </form>
            )}

            {importMode === 'scrape' && (
              <form className="space-y-4" onSubmit={handleScrapeSite}>
                <p className="text-sm text-gray-500">
                  Donnez l'URL de votre site. Le système scrape automatiquement les pages clés (contact, à propos, FAQ, services) et extrait les informations dans la base de connaissances.
                </p>
                <div>
                  <label className="label">URL du site à scraper</label>
                  <input
                    className="input"
                    value={urlForm}
                    onChange={(e) => setUrlForm(e.target.value)}
                    placeholder="https://www.monentreprise.com"
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
                  <p className="font-semibold mb-1">Ce qui sera extrait :</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Emails, téléphones, adresses</li>
                    <li>Horaires d'ouverture</li>
                    <li>Description de l'entreprise</li>
                    <li>FAQ (questions/réponses)</li>
                    <li>Services proposés</li>
                    <li>Liens réseaux sociaux</li>
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
