'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api';
import { Users, Plus, X, Mail, Phone, Filter, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { useUiLocale } from '@/lib/ui-locale';

interface Lead {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  score: number;
  status: string;
  source?: string;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: 'new', badge: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', badge: 'bg-amber-100 text-amber-700' },
  { value: 'qualified', badge: 'bg-purple-100 text-purple-700' },
  { value: 'converted', badge: 'bg-green-100 text-green-700' },
  { value: 'lost', badge: 'bg-gray-100 text-gray-500' },
];

const emptyForm = { name: '', email: '', phone: '', source: '', score: 0, status: 'new' };
const PAGE_SIZE = 15;

export default function LeadsPage() {
  const { t } = useUiLocale();
  const queryClient = useQueryClient();
  const { data: leads = [], isLoading: loading } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => leadsApi.list().then((res: any) => res.data || res),
    refetchOnMount: 'always',
  });
  const createLead = useMutation({
    mutationFn: (data: typeof emptyForm) => leadsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
  const updateLeadStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => leadsApi.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      const previous = queryClient.getQueryData<Lead[]>(['leads']);
      queryClient.setQueryData<Lead[]>(['leads'], (old = []) =>
        old.map((lead) => (lead.id === id ? { ...lead, status } : lead)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['leads'], ctx?.previous);
      toast.error(t('lead.toast.statusError'));
    },
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null);

  const filteredLeads = useMemo(() => {
    if (filter === 'all') return leads;
    return leads.filter((lead) => lead.status === filter);
  }, [filter, leads]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const pagedLeads = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredLeads.slice(start, start + PAGE_SIZE);
  }, [filteredLeads, page]);

  useEffect(() => { setPage(1); }, [filter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const converted = leads.filter((l) => l.status === 'converted').length;
    const qualified = leads.filter((l) => l.status === 'qualified').length;
    return {
      total,
      converted,
      conversionRate: total ? Math.round((converted / total) * 100) : 0,
      qualified,
    };
  }, [leads]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const leadId = new URLSearchParams(window.location.search).get('leadId');
    if (leadId) setHighlightedLeadId(leadId);
  }, []);

  useEffect(() => {
    if (!highlightedLeadId || loading) return;
    if (!leads.some((lead) => lead.id === highlightedLeadId)) return;
    setFilter('all');
    highlightedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedLeadId, loading, leads]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createLead.mutateAsync(form);
      toast.success(t('lead.toast.created'));
      setShowForm(false);
      setForm(emptyForm);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('lead.toast.createError'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    const current = leads.find((lead) => lead.id === id);
    if (!current || current.status === status) return;
    try {
      await updateLeadStatus.mutateAsync({ id, status });
      toast.success(t('lead.toast.statusUpdated'));
    } catch { /* optimistic rollback handled by onError */ }
  };

  return (
    <div className="p-4 lg:p-8 space-y-4 lg:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('lead.title')}</h1>
          <p className="text-sm text-gray-500">{t('lead.subtitle')}</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> {t('lead.new')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('lead.stats.total')}</p>
            <p className="text-xl sm:text-2xl font-bold">{loading ? '...' : stats.total}</p>
          </div>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">{t('lead.stats.qualified')}</p>
          <p className="text-xl sm:text-2xl font-bold">{loading ? '...' : stats.qualified}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">{t('lead.stats.converted')}</p>
          <p className="text-xl sm:text-2xl font-bold">{loading ? '...' : stats.converted}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{t('lead.stats.conversionRate')}</p>
            <ArrowUpRight className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold">{loading ? '...' : `${stats.conversionRate}%`}</p>
        </div>
      </div>

      <div className="card">
        <div className="p-5 flex flex-wrap items-center gap-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="w-4 h-4" /> {t('lead.filter')}
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', ...STATUS_OPTIONS.map((s) => s.value)].map((value) => (
              <button
                key={value}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  filter === value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
                onClick={() => setFilter(value)}
              >
                {value === 'all' ? t('lead.filter.all') : t(`lead.status.${value}`)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-4 lg:p-8 text-center text-gray-400">{t('common.loading')}</div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-4 lg:p-8 text-center text-gray-400">{t('lead.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100 text-gray-500">
                  <th className="p-4 font-medium">{t('lead.col.lead')}</th>
                  <th className="p-4 font-medium">{t('lead.col.contact')}</th>
                  <th className="p-4 font-medium">{t('lead.col.score')}</th>
                  <th className="p-4 font-medium">{t('lead.col.source')}</th>
                  <th className="p-4 font-medium">{t('lead.col.createdAt')}</th>
                  <th className="p-4 font-medium">{t('lead.col.status')}</th>
                </tr>
              </thead>
              <tbody>
                {pagedLeads.map((lead) => {
                  const isHighlighted = lead.id === highlightedLeadId;
                  return (
                    <tr
                      key={lead.id}
                      ref={isHighlighted ? highlightedRowRef : undefined}
                      className={`border-b border-gray-50 hover:bg-gray-50/60 ${
                        isHighlighted ? 'bg-primary-50/70 ring-1 ring-inset ring-primary-200' : ''
                      }`}
                    >
                      <td className="p-4">
                        <a href={`/dashboard/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                          {lead.name || t('lead.unnamed')}
                        </a>
                        <p className="text-xs text-gray-400">#{lead.id.slice(0, 8)}</p>
                      </td>
                      <td className="p-4 space-y-1 text-gray-600">
                        {lead.email && (
                          <p className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5" /> {lead.email}
                          </p>
                        )}
                        {lead.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5" /> {lead.phone}
                          </p>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-gray-900">{lead.score}</td>
                      <td className="p-4 text-gray-600">{lead.source || '—'}</td>
                      <td className="p-4 text-gray-500">
                        {new Date(lead.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4">
                        <select
                          className="input text-xs py-1 h-9"
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        >
                          {STATUS_OPTIONS.map(({ value }) => (
                            <option key={value} value={value}>
                              {t(`lead.status.${value}`)}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm disabled:opacity-50"
            >
              {t('lead.prev')}
            </button>
            <span className="text-sm text-gray-600">{t('lead.page')} {page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm disabled:opacity-50"
            >
              {t('lead.next')}
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card p-4 lg:p-6 w-full max-w-lg relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setShowForm(false)}>
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('lead.new')}</h2>
            <p className="text-sm text-gray-500 mb-4">{t('lead.form.subtitle')}</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">{t('lead.form.name')}</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('lead.form.email')}</label>
                  <input
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t('lead.form.phone')}</label>
                  <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('lead.form.source')}</label>
                  <input className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder={t('lead.form.sourcePlaceholder')} />
                </div>
                <div>
                  <label className="label">{t('lead.form.score')}</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={form.score}
                    onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="label">{t('lead.form.status')}</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTIONS.map(({ value }) => (
                    <option key={value} value={value}>
                      {t(`lead.status.${value}`)}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={saving}>
                {saving ? t('lead.form.creating') : t('lead.form.submit')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
