'use client';
import { useState, useEffect } from 'react';
import { MessageSquare, Users, Package, Bot, TrendingUp, Target, Zap, Clock } from 'lucide-react';
import { analyticsApi } from '@/lib/api';

interface DashboardData {
  conversations: { total: number; open: number; handedOff: number; closed: number; recent7d: number; leadCaptureRate: number };
  leads: { total: number; new: number; contacted: number; qualified: number; converted: number; lost: number; conversionRate: number; avgScore: number; recent7d: number };
  products: { total: number; active: number; outOfStock: number; categories: number };
  agents: { total: number; active: number; performance: { agentId: string; agentName: string; agentType: string; conversations: number; leads: number; conversions: number; conversionRate: number }[] };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [timeline, setTimeline] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [d, t] = await Promise.all([
          analyticsApi.dashboard(),
          analyticsApi.timeline(30),
        ]);
        setData(d);
        setTimeline(t);
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement des analytics...</div>;
  if (!data) return <div className="p-6 text-center text-gray-500">Erreur lors du chargement</div>;

  const stats = [
    { label: 'Conversations', value: data.conversations.total, sub: `${data.conversations.open} ouvertes • ${data.conversations.handedOff} transférées`, icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
    { label: 'Leads capturés', value: data.leads.total, sub: `Taux capture: ${data.conversations.leadCaptureRate}%`, icon: Users, color: 'text-green-600 bg-green-50' },
    { label: 'Taux conversion', value: `${data.leads.conversionRate}%`, sub: `${data.leads.converted} convertis`, icon: Target, color: 'text-purple-600 bg-purple-50' },
    { label: 'Score moyen', value: data.leads.avgScore, sub: `${data.leads.recent7d} nouveaux (7j)`, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
    { label: 'Produits', value: data.products.total, sub: `${data.products.active} actifs • ${data.products.outOfStock} rupture`, icon: Package, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Agents actifs', value: data.agents.active, sub: `${data.agents.total} au total`, icon: Bot, color: 'text-pink-600 bg-pink-50' },
  ];

  const maxTimeline = Math.max(...timeline.map((t) => t.count), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> Conversations (30 derniers jours)</h2>
          {timeline.length > 0 ? (
            <div className="flex items-end gap-1 h-40">
              {timeline.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                  <div className="w-full bg-primary-500 rounded-t hover:bg-primary-600 transition-colors" style={{ height: `${(t.count / maxTimeline) * 100}%`, minHeight: '2px' }} />
                  <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-gray-800 text-white px-2 py-0.5 rounded whitespace-nowrap">{t.count}</div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-gray-400" /> Performance des agents</h2>
          <div className="space-y-3">
            {data.agents.performance.map((a) => (
              <div key={a.agentId} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm text-gray-900">{a.agentName}</p>
                  <p className="text-xs text-gray-500">{a.agentType} • {a.conversations} conversations</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{a.conversionRate}%</p>
                  <p className="text-xs text-gray-500">{a.conversions}/{a.leads} convertis</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Répartition des leads</h2>
          <div className="space-y-2">
            {[
              { label: 'Nouveau', count: data.leads.new, color: 'bg-blue-500' },
              { label: 'Contacté', count: data.leads.contacted, color: 'bg-yellow-500' },
              { label: 'Qualifié', count: data.leads.qualified, color: 'bg-purple-500' },
              { label: 'Converti', count: data.leads.converted, color: 'bg-green-500' },
              { label: 'Perdu', count: data.leads.lost, color: 'bg-red-500' },
            ].map((s) => {
              const pct = data.leads.total > 0 ? (s.count / data.leads.total) * 100 : 0;
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-20">{s.label}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full flex items-center justify-end px-2`} style={{ width: `${pct}%` }}>
                      {pct > 10 && <span className="text-xs text-white font-medium">{s.count}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{s.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Catalogue produits</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-gray-50">
              <p className="text-3xl font-bold text-gray-900">{data.products.total}</p>
              <p className="text-xs text-gray-500 mt-1">Total produits</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50">
              <p className="text-3xl font-bold text-gray-900">{data.products.categories}</p>
              <p className="text-xs text-gray-500 mt-1">Catégories</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50">
              <p className="text-3xl font-bold text-green-600">{data.products.active}</p>
              <p className="text-xs text-gray-500 mt-1">Actifs</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-50">
              <p className="text-3xl font-bold text-red-600">{data.products.outOfStock}</p>
              <p className="text-xs text-gray-500 mt-1">Rupture stock</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
