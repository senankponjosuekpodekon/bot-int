'use client';
import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Search, Trash2, Pencil, Upload, X, RefreshCw, History, ChevronDown, ChevronUp, LayoutGrid, List, Database } from 'lucide-react';
import { productsApi, agentsApi, type Agent } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  sku: string;
  category: string;
  imageUrl: string;
  productUrl: string;
  isActive: boolean;
  agentId?: string;
}

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importInitialTab, setImportInitialTab] = useState<'feed' | 'csv' | 'csv_url' | 'gmc' | 'sitemap' | 'shopify' | 'woocommerce' | undefined>();
  const [importInitialConfig, setImportInitialConfig] = useState<{ storeDomain?: string; agentId?: string; csvUrl?: string; format?: string } | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [importSources, setImportSources] = useState<any[]>([]);
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [importHistoryTotal, setImportHistoryTotal] = useState(0);
  const [importHistoryLoading, setImportHistoryLoading] = useState(false);
  const [selectedImport, setSelectedImport] = useState<any | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: 0, currency: 'EUR', stock: 0, category: '', imageUrl: '', productUrl: '', agentId: '' });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const results = await productsApi.sync();
      const summary = results.map((r: any) => `${r.type}: ${r.imported ?? r.error} ${r.imported ? 'importés' : ''}`).join(', ');
      showToast(summary || 'Aucune intégration à synchroniser');
      load();
    } catch {
      showToast('Erreur lors de la synchronisation', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleAutoSync = async () => {
    setSyncing(true);
    try {
      const result = await productsApi.autoSync();
      showToast(`${result.imported} produit(s) synchronisé(s) automatiquement`);
      load();
    } catch {
      showToast('Erreur lors de l\'auto-sync (configurez Shopify/WooCommerce d\'abord)', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const loadAgents = useCallback(async () => {
    try {
      const response = await agentsApi.list({ limit: 100 });
      setAgents(response?.data || []);
    } catch {
      setAgents([]);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setImportHistoryLoading(true);
    try {
      const result = await productsApi.importHistory({ limit: 50 });
      setImportHistory(result?.data || []);
      setImportHistoryTotal(result?.total || 0);
    } catch {
      showToast('Erreur lors du chargement de l\'historique', 'error');
    } finally {
      setImportHistoryLoading(false);
    }
  }, []);

  const loadSources = useCallback(async () => {
    try {
      const data = await productsApi.importSources();
      setImportSources(data || []);
    } catch {
      showToast('Erreur lors du chargement des sources', 'error');
    }
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);
  useEffect(() => { if (showHistory) loadHistory(); }, [showHistory, loadHistory]);
  useEffect(() => { if (showSources) loadSources(); }, [showSources, loadSources]);
  useEffect(() => { loadSources(); }, [loadSources]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([
        productsApi.list({ search, category: category || undefined, page, limit: PAGE_SIZE, agentId: selectedAgent || undefined }),
        productsApi.categories(selectedAgent || undefined),
      ]);
      setProducts(data.data);
      setTotal(data.total);
      setCategories(cats);
    } catch {
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, category, selectedAgent, page]);

  useEffect(() => { setPage(1); }, [search, category, selectedAgent]);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name || form.price < 0) { showToast('Nom et prix requis', 'error'); return; }
    try {
      if (editing) {
        await productsApi.update(editing.id, form);
        showToast('Produit mis à jour');
      } else {
        await productsApi.create(form);
        showToast('Produit créé');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', description: '', price: 0, currency: 'EUR', stock: 0, category: '', imageUrl: '', productUrl: '', agentId: '' });
      load();
    } catch {
      showToast('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await productsApi.delete(id);
      showToast('Produit supprimé');
      load();
    } catch {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || '', price: p.price, currency: p.currency, stock: p.stock, category: p.category || '', imageUrl: p.imageUrl || '', productUrl: p.productUrl || '', agentId: p.agentId || '' });
    setShowForm(true);
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Produits</h1>
          <p className="text-sm text-gray-500 mt-1">{total} produit{total > 1 ? 's' : ''} au catalogue</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleSync} disabled={syncing} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Sync...' : 'Synchroniser'}
          </button>
          <button onClick={handleAutoSync} disabled={syncing} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 border border-primary-200 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50" title="Synchronisation automatique depuis Shopify/WooCommerce (cron toutes les 6h)">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Auto-sync
          </button>
          <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <History className="w-4 h-4" /> Historique
          </button>
          <button onClick={() => setShowSources(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Database className="w-4 h-4" /> Sources
            {importSources.filter((s) => s.enabled).length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs">{importSources.filter((s) => s.enabled).length}</span>
            )}
          </button>
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Upload className="w-4 h-4" /> Importer
          </button>
          <button onClick={() => { setEditing(null); setForm({ name: '', description: '', price: 0, currency: 'EUR', stock: 0, category: '', imageUrl: '', productUrl: '', agentId: '' }); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
            <Plus className="w-4 h-4" /> Nouveau produit
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full sm:w-auto px-3 py-2 rounded-lg border border-gray-300 text-sm">
          <option value="">Toutes catégories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className="w-full sm:w-auto px-3 py-2 rounded-lg border border-gray-300 text-sm">
          <option value="">Tous les agents</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden self-start">
          <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><List className="w-4 h-4" /></button>
          <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><LayoutGrid className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun produit. Créez-en un ou importez depuis Shopify/WooCommerce.</p>
        </div>
      ) : view === 'list' ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-gray-50 text-gray-700 font-medium">
              <tr>
                <th className="text-left px-4 py-3 w-14">Image</th>
                <th className="text-left px-4 py-3">Produit</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">SKU</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Stock</th>
                <th className="text-left px-4 py-3">Prix</th>
                <th className="text-right px-4 py-3 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400"><Package className="w-4 h-4" /></div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    {p.category && <div className="text-xs text-primary-600">{p.category}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.sku || '-'}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.stock > 0 ? p.stock : 'Rupture'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">
                    {isNaN(Number(p.price)) ? '-' : Number(p.price).toFixed(2)}{p.currency === 'EUR' ? '€' : ' ' + p.currency}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-40 object-cover" /> : <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400"><Package className="w-8 h-8" /></div>}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{p.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${p.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.stock > 0 ? p.stock : 'Rupture'}
                  </span>
                </div>
                {p.category && <span className="inline-block text-xs text-primary-600 mt-1">{p.category}</span>}
                {p.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{p.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-lg font-bold text-gray-900">
                    {isNaN(Number(p.price)) ? '-' : Number(p.price).toFixed(2)}{p.currency === 'EUR' ? '€' : ' ' + p.currency}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-600">
            Page {page} / {Math.ceil(total / PAGE_SIZE)} ({total} produits)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(Math.ceil(total / PAGE_SIZE), p + 1))}
            disabled={page >= Math.ceil(total / PAGE_SIZE)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-4 lg:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? 'Modifier' : 'Nouveau'} produit</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm font-medium text-gray-700">Nom *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Prix *</label><input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Devise</label><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"><option value="EUR">EUR</option><option value="USD">USD</option><option value="XOF">XOF</option></select></div>
                <div><label className="text-sm font-medium text-gray-700">Stock</label><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Catégorie</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Image URL</label><input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
              </div>
              <div><label className="text-sm font-medium text-gray-700">URL produit</label><input value={form.productUrl} onChange={(e) => setForm({ ...form, productUrl: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
              <div>
                <label className="text-sm font-medium text-gray-700">Agent assigné</label>
                <select value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm">
                  <option value="">Partagé / tous les agents</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <button onClick={handleSave} className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">{editing ? 'Mettre à jour' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          onClose={() => { setShowImport(false); setImportInitialTab(undefined); setImportInitialConfig(undefined); }}
          onDone={() => { setShowImport(false); setImportInitialTab(undefined); setImportInitialConfig(undefined); load(); }}
          showToast={showToast}
          agents={agents}
          initialTab={importInitialTab}
          initialConfig={importInitialConfig}
        />
      )}

      {showHistory && (
        <HistoryModal
          onClose={() => { setShowHistory(false); setSelectedImport(null); }}
          history={importHistory}
          total={importHistoryTotal}
          loading={importHistoryLoading}
          selected={selectedImport}
          onSelect={setSelectedImport}
          onRefresh={loadHistory}
          showToast={showToast}
          onReimport={(config) => { setShowHistory(false); setSelectedImport(null); setImportInitialTab(config.tab); setImportInitialConfig(config); setShowImport(true); }}
        />
      )}

      {showSources && (
        <SourcesModal
          onClose={() => setShowSources(false)}
          sources={importSources}
          onRefresh={loadSources}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.msg}</div>
      )}
    </div>
  );
}

function ImportModal({ onClose, onDone, showToast, agents, initialTab, initialConfig }: {
  onClose: () => void;
  onDone: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  agents?: Agent[];
  initialTab?: 'feed' | 'csv' | 'csv_url' | 'gmc' | 'sitemap' | 'shopify' | 'woocommerce';
  initialConfig?: { storeDomain?: string; agentId?: string; csvUrl?: string; format?: string };
}) {
  const [tab, setTab] = useState<'feed' | 'csv' | 'csv_url' | 'gmc' | 'sitemap' | 'shopify' | 'woocommerce'>(initialTab || 'feed');
  const [loading, setLoading] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [csvText, setCsvText] = useState('');
  const [csvUrl, setCsvUrl] = useState(initialConfig?.csvUrl || '');
  const [csvUrlFormat, setCsvUrlFormat] = useState(initialConfig?.format || '');
  const [csvUrlStoreDomain, setCsvUrlStoreDomain] = useState(initialConfig?.storeDomain || '');
  const [gmcText, setGmcText] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [shopifyForm, setShopifyForm] = useState({ shopDomain: '', accessToken: '' });
  const [wooForm, setWooForm] = useState({ siteUrl: '', consumerKey: '', consumerSecret: '' });
  const [importAgentId, setImportAgentId] = useState(initialConfig?.agentId || '');
  const [csvStoreDomain, setCsvStoreDomain] = useState(initialConfig?.storeDomain || '');
  const [sitemapMaxPages, setSitemapMaxPages] = useState(50);

  const handleImport = async () => {
    setLoading(true);
    try {
      const selectedAgentId = importAgentId || undefined;
      let result;
      if (tab === 'feed') {
        if (!feedUrl) { showToast('URL requise', 'error'); setLoading(false); return; }
        result = await productsApi.importFeed(feedUrl);
      } else if (tab === 'csv') {
        if (!csvText.trim()) { showToast('CSV vide', 'error'); setLoading(false); return; }
        result = await productsApi.importCsv(csvText, undefined, csvStoreDomain || undefined, selectedAgentId);
      } else if (tab === 'csv_url') {
        if (!csvUrl.trim()) { showToast('URL CSV requise', 'error'); setLoading(false); return; }
        result = await productsApi.importCsvUrl(csvUrl, csvUrlFormat || undefined, csvUrlStoreDomain || undefined, selectedAgentId);
      } else if (tab === 'gmc') {
        if (!gmcText.trim()) { showToast('CSV vide', 'error'); setLoading(false); return; }
        result = await productsApi.importGoogleMerchant(gmcText, selectedAgentId);
      } else if (tab === 'sitemap') {
        if (!sitemapUrl) { showToast('URL sitemap requise', 'error'); setLoading(false); return; }
        result = await productsApi.importSitemap(sitemapUrl, selectedAgentId, sitemapMaxPages);
      } else if (tab === 'shopify') {
        result = await productsApi.importShopify(shopifyForm.shopDomain, shopifyForm.accessToken);
      } else {
        result = await productsApi.importWooCommerce(wooForm.siteUrl, wooForm.consumerKey, wooForm.consumerSecret);
      }
      const created = result.created ?? 0;
      const updated = result.updated ?? 0;
      const errors = result.errors ?? 0;
      const summary = result.scanned != null
        ? `${result.scanned} URLs scannées, +${created} · ~${updated}${errors > 0 ? ` · ${errors} erreurs` : ''}`
        : `+${created} créés · ~${updated} mis à jour${errors > 0 ? ` · ${errors} erreurs` : ''}`;
      showToast(summary);
      onDone();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Erreur lors de l'import", 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'feed' as const, label: 'Lien boutique', color: 'bg-green-600' },
    { id: 'csv' as const, label: 'CSV', color: 'bg-blue-600' },
    { id: 'csv_url' as const, label: 'CSV URL', color: 'bg-cyan-600' },
    { id: 'gmc' as const, label: 'Google Merchant', color: 'bg-orange-600' },
    { id: 'sitemap' as const, label: 'Sitemap XML', color: 'bg-indigo-600' },
    { id: 'shopify' as const, label: 'Shopify API', color: 'bg-green-600' },
    { id: 'woocommerce' as const, label: 'Woo API', color: 'bg-purple-600' },
  ];

  const agentSelect = (
    <div>
      <label className="text-sm font-medium text-gray-700">Agent assigné (optionnel)</label>
      <select value={importAgentId} onChange={(e) => setImportAgentId(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm">
        <option value="">Partagé / tous les agents</option>
        {agents?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-4 lg:p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Importer des produits</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-1 mb-4 flex-wrap">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab === t.id ? `${t.color} text-white` : 'bg-gray-100 text-gray-700'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'feed' && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Lien de la boutique Shopify</label>
              <input value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="maboutique.myshopify.com" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Feed public — aucun token requis. Fonctionne avec n'importe quelle boutique Shopify.</p>
            </div>
          </div>
        )}

        {tab === 'csv' && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Coller le contenu CSV</label>
              <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={6} placeholder="name,price,stock,category,description&#10;T-shirt,19.99,100,Vêtements,Coton bio" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono" />
              <p className="text-xs text-gray-400 mt-1">Détection automatique du format (Shopify, WooCommerce, ou générique). Colonnes reconnues: name/title, price/prix, stock, category, description, sku, image.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Domaine Shopify (optionnel)</label>
              <input value={csvStoreDomain} onChange={(e) => setCsvStoreDomain(e.target.value)} placeholder="maboutique.myshopify.com" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Permet de reconstruire l'URL produit complète (/products/handle).</p>
            </div>
            {agentSelect}
          </div>
        )}

        {tab === 'csv_url' && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">URL du fichier CSV</label>
              <input value={csvUrl} onChange={(e) => setCsvUrl(e.target.value)} placeholder="https://maboutique.com/produits.csv" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Le fichier doit être accessible publiquement (hébergé sur un site, Google Sheets publique, etc.).</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Format (optionnel)</label>
              <select value={csvUrlFormat} onChange={(e) => setCsvUrlFormat(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm">
                <option value="">Détection automatique</option>
                <option value="shopify">Shopify</option>
                <option value="woocommerce">WooCommerce</option>
                <option value="generic">Générique</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Domaine Shopify (optionnel)</label>
              <input value={csvUrlStoreDomain} onChange={(e) => setCsvUrlStoreDomain(e.target.value)} placeholder="maboutique.myshopify.com" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </div>
            {agentSelect}
          </div>
        )}

        {tab === 'gmc' && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Coller le feed Google Merchant (CSV)</label>
              <textarea value={gmcText} onChange={(e) => setGmcText(e.target.value)} rows={6} placeholder="id,title,description,link,image_link,price,availability,brand,gtin,condition&#10;SKU001,T-shirt Bio,Coton bio,https://...,https://...,19.99 EUR,in_stock,MyBrand,123456,new" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono" />
              <p className="text-xs text-gray-400 mt-1">Format Google Shopping. Colonnes: id, title, description, link, image_link, price, availability, brand, gtin, mpn, condition, product_type, google_product_category.</p>
            </div>
            {agentSelect}
          </div>
        )}

        {tab === 'sitemap' && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">URL du sitemap XML</label>
              <input value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} placeholder="https://maboutique.com/sitemap.xml" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Scraping automatique: lit le sitemap, filtre les URLs produit (/product, /p/, /item/...), scrape chaque page pour extraire nom, prix, description, image. Supporte les sitemaps index (nested).</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Nombre max de pages à scraper</label>
              <input type="number" min={1} max={500} value={sitemapMaxPages} onChange={(e) => setSitemapMaxPages(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Entre 1 et 500 (par défaut 50).</p>
            </div>
            {agentSelect}
          </div>
        )}

        {tab === 'shopify' && (
          <div className="space-y-3">
            <div><label className="text-sm font-medium text-gray-700">Domaine Shopify</label><input value={shopifyForm.shopDomain} onChange={(e) => setShopifyForm({ ...shopifyForm, shopDomain: e.target.value })} placeholder="maboutique.myshopify.com" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Access Token</label><input value={shopifyForm.accessToken} onChange={(e) => setShopifyForm({ ...shopifyForm, accessToken: e.target.value })} type="password" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <p className="text-xs text-gray-400">API Admin — accès complet aux produits, variants, stock.</p>
          </div>
        )}

        {tab === 'woocommerce' && (
          <div className="space-y-3">
            <div><label className="text-sm font-medium text-gray-700">URL du site</label><input value={wooForm.siteUrl} onChange={(e) => setWooForm({ ...wooForm, siteUrl: e.target.value })} placeholder="https://maboutique.com" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Consumer Key</label><input value={wooForm.consumerKey} onChange={(e) => setWooForm({ ...wooForm, consumerKey: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Consumer Secret</label><input value={wooForm.consumerSecret} onChange={(e) => setWooForm({ ...wooForm, consumerSecret: e.target.value })} type="password" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
          </div>
        )}

        <button onClick={handleImport} disabled={loading} className="w-full mt-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50">{loading ? 'Import en cours...' : 'Importer'}</button>
      </div>
    </div>
  );
}

function HistoryModal({
  onClose,
  history,
  total,
  loading,
  selected,
  onSelect,
  onRefresh,
  showToast,
  onReimport,
}: {
  onClose: () => void;
  history: any[];
  total: number;
  loading: boolean;
  selected: any | null;
  onSelect: (item: any) => void;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onReimport?: (config: { tab: any; storeDomain?: string; agentId?: string; csvUrl?: string; format?: string }) => void;
}) {
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      success: 'bg-green-100 text-green-700',
      partial: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
  };

  const sourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      csv: 'CSV',
      sitemap: 'Sitemap',
      google_merchant: 'Google Merchant',
      shopify: 'Shopify',
      woocommerce: 'WooCommerce',
      feed: 'Feed public',
      autosync: 'Auto-sync',
      manual: 'Manuel',
    };
    return labels[source] || source;
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-4 lg:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Historique des imports</h2>
          <div className="flex items-center gap-2">
            <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-gray-100" title="Rafraîchir"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Aucun import enregistré.</div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{total} import{total > 1 ? 's' : ''}</p>
            {history.map((h) => (
              <div key={h.id} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => onSelect(selected?.id === h.id ? null : h)}>
                  <div>
                    <p className="font-medium text-sm">{sourceLabel(h.source)}</p>
                    <p className="text-xs text-gray-500">{formatDate(h.startedAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(h.status)}
                    <span className="text-xs text-gray-600">+{h.created} · ~{h.updated} · ×{h.errors}</span>
                    {selected?.id === h.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
                {selected?.id === h.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-2 bg-green-50 rounded-lg"><div className="font-bold text-green-700">{h.created}</div><div className="text-xs text-green-600">Créés</div></div>
                      <div className="text-center p-2 bg-blue-50 rounded-lg"><div className="font-bold text-blue-700">{h.updated}</div><div className="text-xs text-blue-600">Mis à jour</div></div>
                      <div className="text-center p-2 bg-red-50 rounded-lg"><div className="font-bold text-red-700">{h.errors}</div><div className="text-xs text-red-600">Erreurs</div></div>
                    </div>
                    {h.scanned != null && <p className="text-xs text-gray-500 mb-2">{h.scanned} URLs scannées</p>}
                    {h.source === 'sitemap' && h.metadata?.sitemapUrl && (
                      <button
                        onClick={async () => {
                          try {
                            await productsApi.importSitemap(h.metadata.sitemapUrl, h.metadata.agentId, h.metadata.maxPages);
                            showToast('Import sitemap relancé');
                            onRefresh();
                          } catch {
                            showToast('Erreur lors du re-lancement', 'error');
                          }
                        }}
                        className="mt-2 w-full py-2 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700"
                      >
                        Re-lancer cet import
                      </button>
                    )}
                    {h.source === 'csv_url' && h.metadata?.csvUrl && (
                      <button
                        onClick={async () => {
                          try {
                            await productsApi.importCsvUrl(h.metadata.csvUrl, h.metadata.format, h.metadata.storeDomain, h.metadata.agentId);
                            showToast('Import CSV URL relancé');
                            onRefresh();
                          } catch {
                            showToast('Erreur lors du re-lancement', 'error');
                          }
                        }}
                        className="mt-2 w-full py-2 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700"
                      >
                        Re-lancer cet import
                      </button>
                    )}
                    {h.source === 'csv' && onReimport && (
                      <button
                        onClick={() => onReimport({
                          tab: 'csv',
                          storeDomain: h.metadata?.storeDomain,
                          agentId: h.metadata?.agentId,
                        })}
                        className="mt-2 w-full py-2 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700"
                      >
                        Ré-importer avec les mêmes paramètres
                      </button>
                    )}
                    {h.source === 'google_merchant' && onReimport && (
                      <button
                        onClick={() => onReimport({
                          tab: 'gmc',
                          agentId: h.metadata?.agentId,
                        })}
                        className="mt-2 w-full py-2 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700"
                      >
                        Ré-importer avec les mêmes paramètres
                      </button>
                    )}
                    {h.details && h.details.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-2 max-h-40 overflow-y-auto">
                        <p className="text-xs font-medium text-gray-700 mb-1">Détails</p>
                        {h.details.map((d: string, i: number) => <p key={i} className="text-xs text-gray-600">{d}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SourcesModal({
  onClose,
  sources,
  onRefresh,
  showToast,
}: {
  onClose: () => void;
  sources: any[];
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const toggle = async (id: string, enabled: boolean) => {
    try {
      await productsApi.updateImportSource(id, { enabled: !enabled });
      showToast(enabled ? 'Source désactivée' : 'Source activée');
      onRefresh();
    } catch {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const updateFrequency = async (id: string, frequencyMinutes: number) => {
    try {
      await productsApi.updateImportSource(id, { frequencyMinutes });
      showToast('Fréquence mise à jour');
      onRefresh();
    } catch {
      showToast('Erreur lors de la mise à jour de la fréquence', 'error');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette source ?')) return;
    try {
      await productsApi.deleteImportSource(id);
      showToast('Source supprimée');
      onRefresh();
    } catch {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const label = (s: any) => {
    if (s.source === 'sitemap') return `Sitemap : ${s.config?.sitemapUrl}`;
    if (s.source === 'csv_url') return `CSV URL : ${s.config?.csvUrl}`;
    if (s.source === 'google_merchant') return `Google Merchant`;
    return s.source;
  };

  const nextImport = (s: any) => {
    if (!s.enabled) return 'Désactivée';
    if (!s.lastImportAt) return 'Dès le prochain cycle';
    const freq = (s.config?.frequencyMinutes || 360) * 60 * 1000;
    const next = new Date(new Date(s.lastImportAt).getTime() + freq);
    return `Prochain : ${next.toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-4 lg:p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Sources d'import mémorisées</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        {sources.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Aucune source enregistrée. Importez depuis sitemap ou CSV URL pour en créer.</p>
        ) : (
          <div className="space-y-3">
            {sources.map((s) => (
              <div key={s.id} className="border border-gray-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{label(s)}</p>
                  <p className="text-xs text-gray-500">Dernier import : {s.lastImportAt ? new Date(s.lastImportAt).toLocaleString() : 'Jamais'}</p>
                  <p className="text-xs text-primary-600 font-medium">{nextImport(s)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={s.config?.frequencyMinutes || 360}
                    onChange={(e) => updateFrequency(s.id, Number(e.target.value))}
                    className="px-2 py-1 rounded-lg border border-gray-300 text-xs"
                  >
                    <option value={5}>5 min</option>
                    <option value={15}>15 min</option>
                    <option value={60}>1 h</option>
                    <option value={360}>6 h</option>
                    <option value={720}>12 h</option>
                    <option value={1440}>24 h</option>
                    <option value={10080}>7 j</option>
                  </select>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={() => toggle(s.id, s.enabled)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                    <span className="text-sm text-gray-700">{s.enabled ? 'Active' : 'Inactive'}</span>
                  </label>
                  <button onClick={() => remove(s.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
