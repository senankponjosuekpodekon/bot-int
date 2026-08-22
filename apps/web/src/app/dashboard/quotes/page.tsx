'use client';
import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Trash2, Download, X, Check, Clock } from 'lucide-react';
import { quotesApi } from '@/lib/api';

interface Quote {
  id: string;
  quoteNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerCompany: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes: string;
  validUntil: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepté', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusé', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Expiré', color: 'bg-orange-100 text-orange-700' },
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerCompany: '',
    taxRate: 20,
    notes: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await quotesApi.list();
      setQuotes(data);
    } catch {
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.customerName || form.items.length === 0) {
      showToast('Nom client et au moins un article requis', 'error');
      return;
    }
    try {
      await quotesApi.create(form);
      showToast('Devis créé');
      setShowForm(false);
      setForm({ customerName: '', customerEmail: '', customerPhone: '', customerCompany: '', taxRate: 20, notes: '', items: [{ description: '', quantity: 1, unitPrice: 0 }] });
      load();
    } catch {
      showToast('Erreur lors de la création', 'error');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await quotesApi.updateStatus(id, status);
      showToast('Statut mis à jour');
      load();
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce devis ?')) return;
    try {
      await quotesApi.delete(id);
      showToast('Devis supprimé');
      load();
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const downloadPdf = (id: string) => {
    const token = localStorage.getItem('access_token');
    const url = quotesApi.pdfUrl(id);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'devis.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => showToast('Erreur lors du téléchargement', 'error'));
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unitPrice: 0 }] });
  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i: number, field: string, value: any) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    setForm({ ...form, items });
  };

  const formSubtotal = form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const formTax = formSubtotal * (form.taxRate / 100);
  const formTotal = formSubtotal + formTax;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
          <p className="text-sm text-gray-500 mt-1">{quotes.length} devis • Génération PDF automatique</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
          <Plus className="w-4 h-4" /> Nouveau devis
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun devis. Créez-en un ou laissez le flow "Demande de devis" en générer automatiquement.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">N°</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-center px-4 py-3">Statut</th>
                <th className="text-center px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotes.map((q) => {
                const status = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
                return (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{q.quoteNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{q.customerName}</p>
                      {q.customerCompany && <p className="text-xs text-gray-500">{q.customerCompany}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(q.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{parseFloat(q.total.toString()).toFixed(2)}€</td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={q.status}
                        onChange={(e) => handleStatusChange(q.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${status.color}`}
                      >
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => downloadPdf(q.id)} className="p-1.5 rounded-lg hover:bg-blue-50" title="Télécharger PDF">
                          <Download className="w-4 h-4 text-blue-500" />
                        </button>
                        <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded-lg hover:bg-red-50" title="Supprimer">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-4 lg:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Nouveau devis</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Client *</label><input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Entreprise</label><input value={form.customerCompany} onChange={(e) => setForm({ ...form, customerCompany: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Email</label><input value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Téléphone</label><input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Articles</label>
                  <button onClick={addItem} className="text-xs text-primary-600 hover:underline">+ Ajouter</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder="Description" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                      <input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 0)} className="w-16 px-2 py-2 rounded-lg border border-gray-300 text-sm" />
                      <input type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} placeholder="Prix" className="w-24 px-2 py-2 rounded-lg border border-gray-300 text-sm" />
                      <span className="text-sm font-medium text-gray-700 w-24 text-right pt-2">{(item.quantity * item.unitPrice).toFixed(2)}€</span>
                      {form.items.length > 1 && <button onClick={() => removeItem(i)} className="p-2 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                <div><label className="text-sm font-medium text-gray-700">TVA (%)</label><input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
                <div className="pt-6"><p className="text-sm text-gray-500">Sous-total: <span className="font-bold text-gray-900">{formSubtotal.toFixed(2)}€</span></p></div>
                <div className="pt-6"><p className="text-sm text-gray-500">Total: <span className="font-bold text-gray-900 text-base">{formTotal.toFixed(2)}€</span></p></div>
              </div>

              <div><label className="text-sm font-medium text-gray-700">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>

              <button onClick={handleSave} className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">Créer le devis + PDF</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.msg}</div>
      )}
    </div>
  );
}
