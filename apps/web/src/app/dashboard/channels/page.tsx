'use client';
import { useState, useEffect } from 'react';
import { BarChart3, MessageSquare, Users, TrendingUp, Activity, Plus, Trash2, Webhook } from 'lucide-react';
import { analyticsApi, webhooksApi } from '@/lib/api';
import ChannelIntegrations from './ChannelIntegrations';

const CHANNEL_LABELS: Record<string, string> = {
  web: 'Web Chat',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  email: 'Email',
  api: 'API',
  sms: 'SMS',
  instagram: 'Instagram',
};

const CHANNEL_COLORS: Record<string, string> = {
  web: '#4f46e5',
  whatsapp: '#25D366',
  telegram: '#0088cc',
  email: '#ea4335',
  api: '#6b7280',
  sms: '#f59e0b',
  instagram: '#E1306C',
};

export default function ChannelAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState('message.replied,lead.created');
  const [webhookSubmitting, setWebhookSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    analyticsApi.channels(days)
      .then((data) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  const loadWebhooks = async () => {
    setWebhooksLoading(true);
    try {
      const res = await webhooksApi.list();
      setWebhooks(Array.isArray(res) ? res : res?.data ?? []);
    } catch {
      // error
    } finally {
      setWebhooksLoading(false);
    }
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) return;
    setWebhookSubmitting(true);
    try {
      await webhooksApi.create({
        url: webhookUrl.trim(),
        events: webhookEvents.split(',').map((e) => e.trim()).filter(Boolean),
      });
      setWebhookUrl('');
      setWebhookEvents('message.replied,lead.created');
      await loadWebhooks();
    } catch {
      // error
    } finally {
      setWebhookSubmitting(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Supprimer ce webhook ?')) return;
    try {
      await webhooksApi.delete(id);
      await loadWebhooks();
    } catch {
      // error
    }
  };

  if (loading) {
    return <div className="p-4 lg:p-6 text-center text-gray-400">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="p-4 lg:p-6 text-center text-gray-400">No data available</div>;
  }

  const maxConversations = Math.max(...(data.channels?.map((c: any) => c.conversations) || [1]), 1);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            Channel Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">Message volume, lead conversion, and performance by channel</p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input w-full sm:w-40">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <ChannelIntegrations />

      <div className="card p-4 lg:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Webhook className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Webhooks sortants</h2>
        </div>
        <form onSubmit={handleAddWebhook} className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://example.com/webhook"
            className="input lg:col-span-2"
            required
          />
          <input
            value={webhookEvents}
            onChange={(e) => setWebhookEvents(e.target.value)}
            placeholder="message.replied, lead.created"
            className="input"
          />
          <button
            type="submit"
            disabled={webhookSubmitting}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {webhookSubmitting ? '...' : <><Plus className="w-4 h-4" /> Ajouter</>}
          </button>
        </form>
        {webhooksLoading ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : webhooks.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun webhook enregistré.</p>
        ) : (
          <div className="space-y-2">
            {webhooks.map((wh) => (
              <div key={wh.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{wh.url}</p>
                  <p className="text-xs text-gray-500 truncate">{Array.isArray(wh.events) ? wh.events.join(', ') : wh.events}</p>
                </div>
                <button
                  onClick={() => handleDeleteWebhook(wh.id)}
                  className="p-2 text-red-400 hover:text-red-600"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={MessageSquare} label="Conversations" value={data.summary?.totalConversations || 0} color="text-blue-600" />
        <StatCard icon={Users} label="Leads Captured" value={data.summary?.totalLeads || 0} color="text-green-600" />
        <StatCard icon={Activity} label="Messages" value={data.summary?.totalMessages || 0} color="text-purple-600" />
        <StatCard icon={TrendingUp} label="Conversion Rate" value={`${data.summary?.avgConversionRate || 0}%`} color="text-orange-600" />
      </div>

      <div className="card p-4 lg:p-6 mb-6">
        <h2 className="font-medium mb-4">Channel Performance</h2>
        {data.channels?.length === 0 ? (
          <p className="text-gray-400 text-sm">No conversations in this period</p>
        ) : (
          <div className="space-y-3">
            {data.channels?.map((ch: any) => (
              <div key={ch.channel} className="flex items-center gap-4">
                <div className="w-28 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: CHANNEL_COLORS[ch.channel] || '#999' }} />
                  <span className="text-sm font-medium">{CHANNEL_LABELS[ch.channel] || ch.channel}</span>
                </div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg flex items-center justify-end px-2 text-xs text-white font-medium"
                      style={{
                        width: `${(ch.conversations / maxConversations) * 100}%`,
                        background: CHANNEL_COLORS[ch.channel] || '#999',
                        minWidth: '40px',
                      }}
                    >
                      {ch.conversations}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-gray-500 w-full sm:w-48 justify-end">
                  <span title="Leads">{ch.leads} leads</span>
                  <span title="Conversion rate">{ch.conversionRate}%</span>
                  <span title="Messages">{ch.messages} msgs</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data.dailyVolume?.length > 0 && (
        <div className="card p-4 lg:p-6">
          <h2 className="font-medium mb-4">Daily Conversation Volume</h2>
          <DailyChart data={data.dailyVolume} colors={CHANNEL_COLORS} labels={CHANNEL_LABELS} />
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-xl sm:text-2xl font-bold">{value}</div>
    </div>
  );
}

function DailyChart({ data, colors, labels }: { data: any[]; colors: Record<string, string>; labels: Record<string, string> }) {
  const dates = [...new Set(data.map((d) => d.date))].sort();
  const channels = [...new Set(data.map((d) => d.channel))];
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1 h-40 min-w-full" style={{ minWidth: `${dates.length * 30}px` }}>
        {dates.map((date) => {
          const dayData = data.filter((d) => d.date === date);
          const total = dayData.reduce((s, d) => s + d.count, 0);
          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-1 min-w-[20px]">
              <div className="flex flex-col-reverse w-full h-32 justify-start" title={`${date}: ${total} conversations`}>
                {channels.map((ch) => {
                  const item = dayData.find((d) => d.channel === ch);
                  if (!item) return null;
                  return (
                    <div
                      key={ch}
                      style={{
                        height: `${(item.count / maxCount) * 100}%`,
                        background: colors[ch] || '#999',
                        minHeight: '2px',
                      }}
                      className="w-full rounded-t"
                      title={`${labels[ch] || ch}: ${item.count}`}
                    />
                  );
                })}
              </div>
              <span className="text-[9px] text-gray-400 -rotate-45 origin-left whitespace-nowrap">
                {date.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-3 flex-wrap">
        {channels.map((ch) => (
          <span key={ch} className="flex items-center gap-1 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full" style={{ background: colors[ch] || '#999' }} />
            {labels[ch] || ch}
          </span>
        ))}
      </div>
    </div>
  );
}
