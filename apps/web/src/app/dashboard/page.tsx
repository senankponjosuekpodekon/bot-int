'use client';
import { useQuery } from '@tanstack/react-query';
import { agentsApi, leadsApi, chatApi } from '@/lib/api';
import { Bot, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { useUiLocale } from '@/lib/ui-locale';

export default function DashboardPage() {
  const { t } = useUiLocale();
  const { data: stats = { agents: 0, conversations: 0, leads: 0, qualifiedRate: '0%' }, isLoading: loading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const [agents, conversations, leads] = await Promise.all([
        agentsApi.list(),
        chatApi.conversations(),
        leadsApi.list(),
      ]);
      const leadList: any[] = leads.data ?? leads ?? [];
      const qualified = leadList.filter((l) => ['qualified', 'converted'].includes(l.status)).length;
      const qualifiedRate = leadList.length ? `${Math.round((qualified / leadList.length) * 100)}%` : '0%';
      return {
        agents: agents.data?.length ?? agents.length ?? 0,
        conversations: conversations.data?.length ?? conversations.length ?? 0,
        leads: leadList.length,
        qualifiedRate,
      };
    },
  });

  const cards = [
    { label: t('dash.card.agents'), value: stats.agents, icon: Bot, color: 'bg-blue-500' },
    { label: t('dash.card.conversations'), value: stats.conversations, icon: MessageSquare, color: 'bg-green-500' },
    { label: t('dash.card.leads'), value: stats.leads, icon: Users, color: 'bg-purple-500' },
    { label: t('dash.card.qualified'), value: stats.qualifiedRate, icon: TrendingUp, color: 'bg-orange-500' },
  ];

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dash.title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('dash.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:p-6 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">{label}</span>
              <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {loading && typeof value === 'number' ? '...' : value}
            </p>
          </div>
        ))}
      </div>

      <div className="card p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dash.quickstart')}</h2>
        <div className="space-y-3">
          {[
            { step: '1', title: t('dash.step1.title'), desc: t('dash.step1.desc'), href: '/dashboard/agents' },
            { step: '2', title: t('dash.step2.title'), desc: t('dash.step2.desc'), href: '/dashboard/knowledge' },
            { step: '3', title: t('dash.step3.title'), desc: t('dash.step3.desc'), href: '/dashboard/chat' },
          ].map(({ step, title, desc, href }) => (
            <a key={step} href={href} className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors group">
              <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                {step}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-primary-600">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
