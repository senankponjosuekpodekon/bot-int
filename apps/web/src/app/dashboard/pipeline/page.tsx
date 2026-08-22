'use client';
import { useState, useEffect, useCallback } from 'react';
import { Download, Tag, X, Plus } from 'lucide-react';
import { leadsApi } from '@/lib/api';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  score: number;
  source: string;
  tags: string[];
  notes: string;
  createdAt: string;
}

const COLUMNS = [
  { key: 'new', label: 'Nouveau', color: 'bg-blue-500' },
  { key: 'contacted', label: 'Contacté', color: 'bg-yellow-500' },
  { key: 'qualified', label: 'Qualifié', color: 'bg-purple-500' },
  { key: 'converted', label: 'Converti', color: 'bg-green-500' },
  { key: 'lost', label: 'Perdu', color: 'bg-red-500' },
];

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newTag, setNewTag] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, s] = await Promise.all([
        leadsApi.list({ search: search || undefined }),
        leadsApi.pipelineStats(),
      ]);
      setLeads(Array.isArray(data) ? data : data?.data ?? []);
      setStats(s ?? {});
    } catch {
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await leadsApi.update(leadId, { status: newStatus });
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
      load();
    } catch {
      showToast('Erreur lors du changement de statut', 'error');
    }
  };

  const handleAddTag = async () => {
    if (!selectedLead || !newTag.trim()) return;
    try {
      const updated = await leadsApi.addTag(selectedLead.id, newTag.trim());
      setSelectedLead(updated);
      setNewTag('');
      load();
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedLead) return;
    try {
      const updated = await leadsApi.removeTag(selectedLead.id, tag);
      setSelectedLead(updated);
      load();
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await leadsApi.exportCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Export CSV téléchargé');
    } catch {
      showToast('Erreur lors de l\'export', 'error');
    }
  };

  const leadsByStatus = (status: string) => leads.filter((l) => l.status === status);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pipeline CRM</h1>
          <p className="text-sm text-gray-500 mt-1">{stats.total || 0} leads • Score moyen: {stats.avgScore || 0} • Taux de conversion: {stats.total ? Math.round(((stats.converted || 0) / stats.total) * 100) : 0}%</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="px-3 py-2 rounded-lg border border-gray-300 text-sm w-full sm:w-48" />
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colLeads = leadsByStatus(col.key);
            return (
              <div key={col.key} className="flex-shrink-0 w-full lg:w-72">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${col.color}`} />
                  <h3 className="font-semibold text-sm text-gray-700">{col.label}</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{colLeads.length}</span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {colLeads.map((lead) => (
                    <div key={lead.id} onClick={() => setSelectedLead(lead)} className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{lead.name || 'Anonyme'}</p>
                          {lead.company && <p className="text-xs text-gray-500">{lead.company}</p>}
                        </div>
                        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{lead.score}</span>
                      </div>
                      {lead.email && <p className="text-xs text-gray-500 mt-1">{lead.email}</p>}
                      {lead.tags && lead.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {lead.tags.slice(0, 3).map((t) => <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-primary-50 text-primary-700">{t}</span>)}
                        </div>
                      )}
                      <select
                        value={lead.status}
                        onChange={(e) => { e.stopPropagation(); handleStatusChange(lead.id, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full mt-2 text-xs px-2 py-1 rounded border border-gray-200 text-gray-600"
                      >
                        {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </div>
                  ))}
                  {colLeads.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Aucun lead</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLead(null)}>
          <div className="bg-white rounded-2xl p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{selectedLead.name || 'Lead anonyme'}</h2>
              <button onClick={() => setSelectedLead(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              {selectedLead.email && <div><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedLead.email}</span></div>}
              {selectedLead.phone && <div><span className="text-gray-500">Téléphone:</span> <span className="font-medium">{selectedLead.phone}</span></div>}
              {selectedLead.company && <div><span className="text-gray-500">Entreprise:</span> <span className="font-medium">{selectedLead.company}</span></div>}
              <div><span className="text-gray-500">Score:</span> <span className="font-bold">{selectedLead.score}</span></div>
              <div><span className="text-gray-500">Source:</span> <span className="font-medium">{selectedLead.source || 'N/A'}</span></div>
              <div><span className="text-gray-500">Créé le:</span> <span className="font-medium">{new Date(selectedLead.createdAt).toLocaleDateString('fr-FR')}</span></div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Tags</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(selectedLead.tags || []).map((t) => (
                    <span key={t} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary-50 text-primary-700">
                      {t}
                      <button onClick={() => handleRemoveTag(t)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  {(selectedLead.tags || []).length === 0 && <span className="text-xs text-gray-400">Aucun tag</span>}
                </div>
                <div className="flex gap-2">
                  <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} placeholder="Ajouter un tag..." className="flex-1 px-2 py-1 rounded border border-gray-200 text-xs" />
                  <button onClick={handleAddTag} className="p-1.5 rounded bg-primary-50 text-primary-600 hover:bg-primary-100"><Plus className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div>
                <label className="text-gray-500">Notes</label>
                <textarea
                  value={selectedLead.notes || ''}
                  onChange={async (e) => {
                    const updated = { ...selectedLead, notes: e.target.value };
                    setSelectedLead(updated);
                    try { await leadsApi.update(selectedLead.id, { notes: e.target.value }); } catch {}
                  }}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  placeholder="Ajouter des notes..."
                />
              </div>
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
