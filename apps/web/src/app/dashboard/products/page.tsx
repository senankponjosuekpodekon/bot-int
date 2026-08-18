'use client';
import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Search, Trash2, Pencil, Upload, X, RefreshCw } from 'lucide-react';
import { productsApi } from '@/lib/api';

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
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: 0, currency: 'EUR', stock: 0, category: '', imageUrl: '', productUrl: '' });

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([
        productsApi.list({ search, category: category || undefined, limit: 100 }),
        productsApi.categories(),
      ]);
      setProducts(data.data);
      setTotal(data.total);
      setCategories(cats);
    } catch {
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, category]);

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
      setForm({ name: '', description: '', price: 0, currency: 'EUR', stock: 0, category: '', imageUrl: '', productUrl: '' });
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
    setForm({ name: p.name, description: p.description || '', price: p.price, currency: p.currency, stock: p.stock, category: p.category || '', imageUrl: p.imageUrl || '', productUrl: p.productUrl || '' });
    setShowForm(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
          <p className="text-sm text-gray-500 mt-1">{total} produit{total > 1 ? 's' : ''} au catalogue</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncing} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Sync...' : 'Synchroniser'}
          </button>
          <button onClick={handleAutoSync} disabled={syncing} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 border border-primary-200 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50" title="Synchronisation automatique depuis Shopify/WooCommerce (cron toutes les 6h)">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Auto-sync
          </button>
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Upload className="w-4 h-4" /> Importer
          </button>
          <button onClick={() => { setEditing(null); setForm({ name: '', description: '', price: 0, currency: 'EUR', stock: 0, category: '', imageUrl: '', productUrl: '' }); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
            <Plus className="w-4 h-4" /> Nouveau produit
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm">
          <option value="">Toutes catégories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun produit. Créez-en un ou importez depuis Shopify/WooCommerce.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-40 object-cover" />}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{p.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.stock > 0 ? `${p.stock} en stock` : 'Rupture'}
                  </span>
                </div>
                {p.category && <span className="inline-block text-xs text-primary-600 mt-1">{p.category}</span>}
                {p.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{p.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-lg font-bold text-gray-900">{p.price.toFixed(2)}{p.currency === 'EUR' ? '€' : ' ' + p.currency}</span>
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

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? 'Modifier' : 'Nouveau'} produit</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm font-medium text-gray-700">Nom *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Prix *</label><input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Devise</label><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"><option value="EUR">EUR</option><option value="USD">USD</option><option value="XOF">XOF</option></select></div>
                <div><label className="text-sm font-medium text-gray-700">Stock</label><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Catégorie</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Image URL</label><input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
              </div>
              <div><label className="text-sm font-medium text-gray-700">URL produit</label><input value={form.productUrl} onChange={(e) => setForm({ ...form, productUrl: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
              <button onClick={handleSave} className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">{editing ? 'Mettre à jour' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); load(); }} showToast={showToast} />
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.msg}</div>
      )}
    </div>
  );
}

function ImportModal({ onClose, onDone, showToast }: { onClose: () => void; onDone: () => void; showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [tab, setTab] = useState<'feed' | 'csv' | 'gmc' | 'sitemap' | 'shopify' | 'woocommerce'>('feed');
  const [loading, setLoading] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [csvText, setCsvText] = useState('');
  const [gmcText, setGmcText] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [shopifyForm, setShopifyForm] = useState({ shopDomain: '', accessToken: '' });
  const [wooForm, setWooForm] = useState({ siteUrl: '', consumerKey: '', consumerSecret: '' });

  const handleImport = async () => {
    setLoading(true);
    try {
      let result;
      if (tab === 'feed') {
        if (!feedUrl) { showToast('URL requise', 'error'); setLoading(false); return; }
        result = await productsApi.importFeed(feedUrl);
      } else if (tab === 'csv') {
        if (!csvText.trim()) { showToast('CSV vide', 'error'); setLoading(false); return; }
        result = await productsApi.importCsv(csvText);
      } else if (tab === 'gmc') {
        if (!gmcText.trim()) { showToast('CSV vide', 'error'); setLoading(false); return; }
        result = await productsApi.importGoogleMerchant(gmcText);
      } else if (tab === 'sitemap') {
        if (!sitemapUrl) { showToast('URL sitemap requise', 'error'); setLoading(false); return; }
        result = await productsApi.importSitemap(sitemapUrl);
      } else if (tab === 'shopify') {
        result = await productsApi.importShopify(shopifyForm.shopDomain, shopifyForm.accessToken);
      } else {
        result = await productsApi.importWooCommerce(wooForm.siteUrl, wooForm.consumerKey, wooForm.consumerSecret);
      }
      const summary = result.scanned != null
        ? `${result.scanned} URLs scannées, ${result.imported} importés`
        : `${result.imported} produits importés${result.errors > 0 ? `, ${result.errors} erreurs` : ''}`;
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
    { id: 'gmc' as const, label: 'Google Merchant', color: 'bg-orange-600' },
    { id: 'sitemap' as const, label: 'Sitemap XML', color: 'bg-indigo-600' },
    { id: 'shopify' as const, label: 'Shopify API', color: 'bg-green-600' },
    { id: 'woocommerce' as const, label: 'Woo API', color: 'bg-purple-600' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
          </div>
        )}

        {tab === 'gmc' && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Coller le feed Google Merchant (CSV)</label>
              <textarea value={gmcText} onChange={(e) => setGmcText(e.target.value)} rows={6} placeholder="id,title,description,link,image_link,price,availability,brand,gtin,condition&#10;SKU001,T-shirt Bio,Coton bio,https://...,https://...,19.99 EUR,in_stock,MyBrand,123456,new" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono" />
              <p className="text-xs text-gray-400 mt-1">Format Google Shopping. Colonnes: id, title, description, link, image_link, price, availability, brand, gtin, mpn, condition, product_type, google_product_category.</p>
            </div>
          </div>
        )}

        {tab === 'sitemap' && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">URL du sitemap XML</label>
              <input value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} placeholder="https://maboutique.com/sitemap.xml" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Scraping automatique: lit le sitemap, filtre les URLs produit (/product, /p/, /item/...), scrape chaque page (max 50) pour extraire nom, prix, description, image. Supporte les sitemaps index (nested).</p>
            </div>
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
