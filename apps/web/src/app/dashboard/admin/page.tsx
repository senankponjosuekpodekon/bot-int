'use client';
import { useState, useEffect } from 'react';
import {
  Building2, Users, MessageSquare, Bot, TrendingUp, DollarSign,
  Search, Eye, ToggleLeft, ToggleRight, Trash2, Crown, UserCog,
  AlertCircle, Loader2, ChevronRight
} from 'lucide-react';
import { adminApi } from '@/lib/api';

type Tab = 'overview' | 'tenants' | 'users' | 'conversations';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (tab === 'tenants') loadTenants();
    if (tab === 'users') loadUsers();
    if (tab === 'conversations') loadConversations();
  }, [tab]);

  const loadStats = async () => {
    try {
      const s = await adminApi.stats();
      setStats(s);
    } catch {
      // not super admin
    } finally {
      setLoading(false);
    }
  };

  const loadTenants = async () => {
    try {
      const res = await adminApi.tenants(1, 50, search);
      setTenants(res.data);
    } catch {}
  };

  const loadUsers = async () => {
    try {
      const res = await adminApi.users(1, 50);
      setUsers(res.data);
    } catch {}
  };

  const loadConversations = async () => {
    try {
      const res = await adminApi.conversations(1, 50);
      setConversations(res.data);
    } catch {}
  };

  const handleToggleTenant = async (id: string) => {
    setActionLoading(id);
    try {
      await adminApi.toggleTenant(id);
      loadTenants();
    } catch {} finally {
      setActionLoading(null);
    }
  };

  const handleToggleUser = async (id: string) => {
    setActionLoading(id);
    try {
      await adminApi.toggleUser(id);
      loadUsers();
    } catch {} finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="p-4 lg:p-6 text-center text-gray-500">Chargement...</div>;

  if (!stats) {
    return (
      <div className="p-4 lg:p-6 max-w-2xl mx-auto text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Accès refusé</h2>
        <p className="text-gray-500">Vous devez être Super Admin pour accéder à cette page.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: "Vue d'ensemble", icon: TrendingUp },
    { id: 'tenants', label: 'Tenants', icon: Building2 },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Crown className="w-6 h-6 text-indigo-600" />
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Super Admin</h1>
      </div>
      <p className="text-gray-500 mb-8">Gestion horizontale et verticale de la plateforme</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-4 lg:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Tenants', value: stats.tenants.total, icon: Building2, color: 'bg-blue-50 text-blue-600' },
              { label: 'Utilisateurs', value: stats.users.total, icon: Users, color: 'bg-indigo-50 text-indigo-600' },
              { label: 'Agents', value: stats.agents.total, icon: Bot, color: 'bg-purple-50 text-purple-600' },
              { label: 'Conversations', value: stats.conversations.total, icon: MessageSquare, color: 'bg-green-50 text-green-600' },
              { label: 'Leads', value: stats.leads.total, icon: TrendingUp, color: 'bg-orange-50 text-orange-600' },
              { label: 'Subs actives', value: stats.subscriptions.active, icon: Crown, color: 'bg-yellow-50 text-yellow-600' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Revenue + Plan distribution */}
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 gap-4 lg:p-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Revenus estimés (MRR)</h3>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {(stats.revenue.estimatedMrr / 100).toLocaleString('fr-FR')}€
              </p>
              <div className="mt-4 space-y-2">
                {Object.entries(stats.revenue.byPlan).map(([plan, amount]) => (
                  <div key={plan} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-600">{plan}</span>
                    <span className="font-medium text-gray-900">{((amount as number) / 100).toLocaleString('fr-FR')}€</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Distribution des plans</h3>
              <div className="space-y-3">
                {Object.entries(stats.subscriptions.planDistribution).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between">
                    <span className="capitalize text-gray-600">{plan}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${(count as number / stats.subscriptions.total) * 100}%` }}
                        />
                      </div>
                      <span className="font-medium text-gray-900 text-sm w-6">{count as number}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Nouveaux tenants (30j)</span>
                  <span className="font-bold text-indigo-600">{stats.tenants.newLast30Days}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-500">Overage conversations</span>
                  <span className="font-bold text-orange-500">{stats.subscriptions.totalOverageConversations}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tenants */}
      {tab === 'tenants' && (
        <div>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un tenant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadTenants()}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button onClick={loadTenants} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium">
              Rechercher
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Tenant</th>
                  <th className="text-left px-4 py-3">Plan</th>
                  <th className="text-left px-4 py-3">Users</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3">Conversations</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium capitalize">
                        {t.subscription?.plan || 'free'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.userCount}</td>
                    <td className="px-4 py-3">
                      {t.isActive ? (
                        <span className="text-green-600 text-xs font-medium">Actif</span>
                      ) : (
                        <span className="text-red-500 text-xs font-medium">Suspendu</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.subscription?.conversationsThisMonth || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedTenant(t)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600"
                          title="Détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleTenant(t.id)}
                          disabled={actionLoading === t.id}
                          className="p-1.5 text-gray-400 hover:text-indigo-600"
                          title={t.isActive ? 'Suspendre' : 'Activer'}
                        >
                          {t.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Utilisateur</th>
                <th className="text-left px-4 py-3">Rôle</th>
                <th className="text-left px-4 py-3">Tenant</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === 'super_admin' ? 'bg-yellow-50 text-yellow-700' :
                      u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.tenantId.substring(0, 8)}</td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <span className="text-green-600 text-xs font-medium">Actif</span>
                    ) : (
                      <span className="text-red-500 text-xs font-medium">Désactivé</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleUser(u.id)}
                        disabled={actionLoading === u.id}
                        className="p-1.5 text-gray-400 hover:text-indigo-600"
                        title={u.isActive ? 'Désactiver' : 'Activer'}
                      >
                        {u.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Conversations */}
      {tab === 'conversations' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Agent</th>
                <th className="text-left px-4 py-3">Tenant</th>
                <th className="text-left px-4 py-3">Funnel</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {conversations.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.id.substring(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-900">{c.agent?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.tenantId.substring(0, 8)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600 capitalize">{c.funnelStage || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
