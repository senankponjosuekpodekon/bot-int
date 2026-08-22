'use client';
import { useState, useEffect } from 'react';
import { MessageSquare, Users, Package, Bot, TrendingUp, Target, Zap, Clock, Filter, Radio, ArrowRight } from 'lucide-react';
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
  const [funnel, setFunnel] = useState<any>(null);
  const [acquisition, setAcquisition] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [d, t, f, a] = await Promise.all([
          analyticsApi.dashboard(),
          analyticsApi.timeline(30),
          analyticsApi.funnel(),
          analyticsApi.acquisition(),
        ]);
        setData(d);
        setTimeline(t);
        setFunnel(f);
        setAcquisition(a);
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="p-4 lg:p-6 text-center text-gray-500">Chargement des analytics...</div>;
  if (!data) return <div className="p-4 lg:p-6 text-center text-gray-500">Erreur lors du chargement</div>;

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
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> Conversations (30 derniers jours)</h2>
          {timeline.length > 0 ? (
            <div className="flex items-end gap-1 h-40">
              {timeline.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                  <div className="w-full bg-primary-500 rounded-t hover:bg-primary-600 transition-colors" style={{ height: `${(t.count / maxTimeline) * 100}%`, minHeight: '2px' }} />
                  <div className="absolute -top-4 lg:p-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-gray-800 text-white px-2 py-0.5 rounded whitespace-nowrap">{t.count}</div>
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

        {/* Funnel Analytics */}
        {funnel && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Filter className="w-4 h-4 text-gray-400" /> Funnel de conversion</h2>
            <div className="space-y-2">
              {funnel.stages.map((s: any, i: number) => {
                const maxCount = Math.max(...funnel.stages.map((x: any) => x.count), 1);
                const width = s.count > 0 ? (s.count / maxCount) * 100 : 0;
                return (
                  <div key={s.stage}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{s.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-bold">{s.count}</span>
                        {s.dropoffRate > 0 && (
                          <span className="text-xs text-red-400">−{s.dropoffRate}%</span>
                        )}
                        {s.avgIntentScore > 0 && (
                          <span className="text-xs text-orange-500">Intent: {s.avgIntentScore}</span>
                        )}
                      </div>
                    </div>
                    <div className="h-7 bg-gray-100 rounded-lg overflow-hidden">
                      <div className="h-full rounded-lg flex items-center px-2 transition-all" style={{ width: `${Math.max(width, s.count > 0 ? 5 : 0)}%`, background: s.color }}>
                        {width > 15 && <span className="text-xs text-white font-medium">{s.count}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{funnel.summary.conversionRate}%</p>
                <p className="text-xs text-gray-500">Conversion</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{funnel.summary.wonCount}</p>
                <p className="text-xs text-gray-500">Gagné</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-400">{funnel.summary.lostCount}</p>
                <p className="text-xs text-gray-500">Perdu</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-orange-500">{funnel.summary.highIntentLeads}</p>
                <p className="text-xs text-gray-500">Hot leads</p>
              </div>
            </div>
          </div>
        )}

        {/* Acquisition Channel Analytics */}
        {acquisition && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Radio className="w-4 h-4 text-gray-400" /> Canaux d'acquisition</h2>
            {acquisition.channels.length > 0 ? (
              <div className="space-y-3">
                {acquisition.channels.map((c: any) => {
                  const maxCount = Math.max(...acquisition.channels.map((x: any) => x.count), 1);
                  const width = (c.count / maxCount) * 100;
                  return (
                    <div key={c.channel}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ background: c.color }} />
                          <span className="font-medium text-gray-700">{c.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-900 font-bold">{c.count}</span>
                          {c.conversions > 0 && (
                            <span className="text-xs text-green-600 flex items-center gap-0.5">
                              <ArrowRight className="w-3 h-3" />{c.conversions} ({c.conversionRate}%)
                            </span>
                          )}
                          {c.avgIntentScore > 0 && (
                            <span className="text-xs text-orange-500">Intent: {c.avgIntentScore}</span>
                          )}
                        </div>
                      </div>
                      <div className="h-6 bg-gray-100 rounded-lg overflow-hidden">
                        <div className="h-full rounded-lg" style={{ width: `${width}%`, background: c.color }} />
                      </div>
                    </div>
                  );
                })}
                {acquisition.topCampaigns.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Top campagnes UTM</p>
                    <div className="flex flex-wrap gap-2">
                      {acquisition.topCampaigns.map((c: any) => (
                        <span key={c.campaign} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                          {c.campaign} — {c.count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">{acquisition.summary.totalTracked}</p>
                    <p className="text-xs text-gray-500">Tracked</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-400">{acquisition.summary.totalUntracked}</p>
                    <p className="text-xs text-gray-500">Untracked</p>
                  </div>
                </div>
              </div>
            ) : <p className="text-sm text-gray-400 text-center py-8">Aucune donnée d'acquisition</p>}
          </div>
        )}
      </div>
    </div>
  );
}
