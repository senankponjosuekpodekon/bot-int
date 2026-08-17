'use client';

import { useEffect, useMemo, useState } from 'react';
import { knowledgeApi } from '@/lib/api';
import { BookOpen, Plus, Trash2, Search, X } from 'lucide-react';
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
  const [form, setForm] = useState({ content: '', filename: '' });
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
    <div className="p-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Base de connaissances</h1>
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
          <div className="card p-6 w-full max-w-2xl relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setShowForm(false)}>
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Ajouter un texte</h2>
            <p className="text-sm text-gray-500 mb-4">
              Copiez-collez un extrait important (FAQ, script commercial, fiche produit, etc.).
            </p>
            <form className="space-y-4" onSubmit={handleCreate}>
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
          </div>
        </div>
      )}
    </div>
  );
}
