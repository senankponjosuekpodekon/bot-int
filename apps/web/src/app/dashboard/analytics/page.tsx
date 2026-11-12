'use client';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Users, Package, Bot, TrendingUp, Target, Zap, Clock, Filter, Radio, ArrowRight } from 'lucide-react';
import { analyticsApi } from '@/lib/api';
import { useUiLocale } from '@/lib/ui-locale';

interface DashboardData {
  conversations: { total: number; open: number; handedOff: number; closed: number; recent7d: number; leadCaptureRate: number };
  leads: { total: number; new: number; contacted: number; qualified: number; converted: number; lost: number; conversionRate: number; avgScore: number; recent7d: number };
  products: { total: number; active: number; outOfStock: number; categories: number };
  agents: { total: number; active: number; performance: { agentId: string; agentName: string; agentType: string; conversations: number; leads: number; conversions: number; conversionRate: number }[] };
}

export default function AnalyticsPage() {
  const { t } = useUiLocale();
  const { data: bundle, isLoading: loading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async () => {
        const [d, tl, f, a] = await Promise.all([
          analyticsApi.dashboard(),
          analyticsApi.timeline(30),
          analyticsApi.funnel(),
          analyticsApi.acquisition(),
        ]);

        const mappedPerformance = d.agents.performance.map((agent: any) => ({
          agentId: agent.agentId,
          agentName: agent.name || 'Agent',
          agentType: agent.agentType || '',
          conversations: agent.conversations,
          leads: agent.conversations,
          conversions: agent.leads,
          conversionRate: agent.conversionRate,
        }));
        const outData = { ...d, agents: { ...d.agents, performance: mappedPerformance } };
        const outTimeline = tl;

        const stageColors: Record<string, string> = {
          awareness: '#3b82f6',
          consideration: '#8b5cf6',
          decision: '#f59e0b',
          closed_won: '#10b981',
          closed_lost: '#ef4444',
        };
        const mappedStages = f.stages?.map((s: any, i: number) => {
          const prev = i > 0 ? f.stages[i - 1].count : null;
          const dropoffRate = prev && prev > 0 ? Math.round(((prev - s.count) / prev) * 100) : 0;
          return {
            key: s.stage,
            label: s.stage,
            color: stageColors[s.stage] || '#9ca3af',
            count: s.count,
            avgIntentScore: s.avgIntentScore,
            dropoffRate,
          };
        }) || [];
        const outFunnel = { ...f, stages: mappedStages };

        const channelColors: Record<string, string> = {
          web: '#3b82f6',
          whatsapp: '#10b981',
          instagram: '#8b5cf6',
          api: '#f59e0b',
          unknown: '#9ca3af',
        };
        const mappedChannels = a.channels?.map((c: any) => ({
          key: c.channel,
          label: c.channel,
          color: channelColors[c.channel] || '#9ca3af',
          count: c.count,
          conversions: c.leads,
          conversionRate: c.conversionRate,
          avgIntentScore: c.avgIntentScore,
        })) || [];
        const outAcquisition = { ...a, channels: mappedChannels };
        return { data: outData, timeline: outTimeline, funnel: outFunnel, acquisition: outAcquisition };
    },
  });
  const data = bundle?.data || null;
  const timeline = bundle?.timeline || [];
  const funnel = bundle?.funnel || null;
  const acquisition = bundle?.acquisition || null;

  if (loading) return <div className="p-4 lg:p-6 text-center text-gray-500">{t('ana.loading')}</div>;
  if (!data) return <div className="p-4 lg:p-6 text-center text-gray-500">{t('ana.loadError')}</div>;

  const stats = [
    { label: t('ana.conversations'), value: data.conversations.total, sub: `${data.conversations.open} ${t('ana.open')} • ${data.conversations.handedOff} ${t('ana.handedOff')}`, icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
    { label: t('ana.leadsCaptured'), value: data.leads.total, sub: `${t('ana.captureRate')}: ${data.conversations.leadCaptureRate}%`, icon: Users, color: 'text-green-600 bg-green-50' },
    { label: t('ana.convRate'), value: `${data.leads.conversionRate}%`, sub: `${data.leads.converted} ${t('ana.converted')}`, icon: Target, color: 'text-purple-600 bg-purple-50' },
    { label: t('ana.avgScore'), value: data.leads.avgScore, sub: `${data.leads.recent7d} ${t('ana.new7d')}`, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
    { label: t('ana.products'), value: data.products.total, sub: `${data.products.active} ${t('ana.active')} • ${data.products.outOfStock} ${t('ana.outOfStock')}`, icon: Package, color: 'text-indigo-600 bg-indigo-50' },
    { label: t('ana.activeAgents'), value: data.agents.active, sub: `${data.agents.total} ${t('ana.total')}`, icon: Bot, color: 'text-pink-600 bg-pink-50' },
  ];

  const maxTimeline = Math.max(...timeline.map((t) => t.count), 1);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> {t('ana.conv30d')}</h2>
          {timeline.length > 0 ? (
            <div className="flex items-end gap-1 h-40">
              {timeline.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                  <div className="w-full bg-primary-500 rounded-t hover:bg-primary-600 transition-colors" style={{ height: `${(t.count / maxTimeline) * 100}%`, minHeight: '2px' }} />
                  <div className="absolute -top-4 lg:p-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-gray-800 text-white px-2 py-0.5 rounded whitespace-nowrap">{t.count}</div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">{t('ana.noData')}</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-gray-400" /> {t('ana.agentPerf')}</h2>
          <div className="space-y-3">
            {data.agents.performance.map((a) => (
              <div key={a.agentId} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm text-gray-900">{a.agentName}</p>
                  <p className="text-xs text-gray-500">{a.agentType} • {a.conversations} conversations</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{a.conversionRate}%</p>
                  <p className="text-xs text-gray-500">{a.conversions}/{a.leads} {t('ana.converted')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">{t('ana.leadDist')}</h2>
          <div className="space-y-2">
            {[
              { label: t('pipe.col.new'), count: data.leads.new, color: 'bg-blue-500' },
              { label: t('pipe.col.contacted'), count: data.leads.contacted, color: 'bg-yellow-500' },
              { label: t('pipe.col.qualified'), count: data.leads.qualified, color: 'bg-purple-500' },
              { label: t('pipe.col.converted'), count: data.leads.converted, color: 'bg-green-500' },
              { label: t('pipe.col.lost'), count: data.leads.lost, color: 'bg-red-500' },
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
          <h2 className="font-semibold text-gray-900 mb-4">{t('ana.catalog')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-gray-50">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{data.products.total}</p>
              <p className="text-xs text-gray-500 mt-1">{t('ana.totalProducts')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{data.products.categories}</p>
              <p className="text-xs text-gray-500 mt-1">{t('ana.categories')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50">
              <p className="text-2xl sm:text-3xl font-bold text-green-600">{data.products.active}</p>
              <p className="text-xs text-gray-500 mt-1">{t('ana.active')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-50">
              <p className="text-2xl sm:text-3xl font-bold text-red-600">{data.products.outOfStock}</p>
              <p className="text-xs text-gray-500 mt-1">{t('ana.outOfStock')}</p>
            </div>
          </div>
        </div>

        {/* Funnel Analytics */}
        {funnel && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Filter className="w-4 h-4 text-gray-400" /> {t('ana.funnel')}</h2>
            <div className="space-y-2">
              {funnel.stages.map((s: any, i: number) => {
                const maxCount = Math.max(...funnel.stages.map((x: any) => x.count), 1);
                const width = s.count > 0 ? (s.count / maxCount) * 100 : 0;
                return (
                  <div key={s.stage}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{t('ana.stage.' + s.key)}</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{funnel.summary.conversionRate}%</p>
                <p className="text-xs text-gray-500">{t('ana.conversion')}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{funnel.summary.wonCount}</p>
                <p className="text-xs text-gray-500">{t('ana.won')}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-400">{funnel.summary.lostCount}</p>
                <p className="text-xs text-gray-500">{t('ana.lost')}</p>
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
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Radio className="w-4 h-4 text-gray-400" /> {t('ana.channels')}</h2>
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
                          <span className="font-medium text-gray-700">{t('ana.ch.' + c.key)}</span>
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
                    <p className="text-xs font-medium text-gray-500 mb-2">{t('ana.topUtm')}</p>
                    <div className="flex flex-wrap gap-2">
                      {acquisition.topCampaigns.map((c: any) => (
                        <span key={c.campaign} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                          {c.campaign} — {c.count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
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
            ) : <p className="text-sm text-gray-400 text-center py-8">{t('ana.noAcquisition')}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
