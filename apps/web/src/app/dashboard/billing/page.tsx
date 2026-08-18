'use client';
import { useState, useEffect } from 'react';
import {
  CreditCard, Check, Zap, Crown, Building2, TrendingUp, AlertCircle,
  Calendar, X, Loader2, Sparkles
} from 'lucide-react';
import { billingApi } from '@/lib/api';

export default function BillingPage() {
  const [usage, setUsage] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [u, s] = await Promise.all([
          billingApi.usage(),
          billingApi.subscription(),
        ]);
        setUsage(u);
        setSub(s);
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement...</div>;

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      icon: Sparkles,
      color: 'gray',
      features: ['1 agent', '50 conv/mois', 'Web chat', 'Funnel tracking'],
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 49,
      icon: Zap,
      color: 'blue',
      features: ['3 agents', '1 000 conv/mois', 'Web + email', 'Funnel tracking', '0,08€/conv overage'],
    },
    {
      id: 'growth',
      name: 'Growth',
      price: 149,
      icon: Crown,
      color: 'indigo',
      features: ['Agents illimités', '5 000 conv/mois', 'Multi-canal', 'API access', 'Domaine custom', '0,05€/conv overage'],
    },
    {
      id: 'scale',
      name: 'Scale',
      price: 399,
      icon: Building2,
      color: 'purple',
      features: ['20 000 conv/mois', 'MCP Server', 'Outcome tracking', 'White-label', 'SLA 99.9%', '0,03€/conv overage'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: null,
      icon: Building2,
      color: 'dark',
      features: ['Volume custom', 'Dedicated MCP', 'Outcome pricing', 'White-label', 'Account manager'],
    },
  ];

  const currentPlan = sub?.plan || 'free';
  const usagePct = usage ? Math.min(100, (usage.conversationsUsed / usage.conversationsLimit) * 100) : 0;

  const handleCheckout = async (plan: string) => {
    setActionLoading(plan);
    try {
      const { url } = await billingApi.checkout(plan);
      window.location.href = url;
    } catch {
      // error
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Annuler votre abonnement ?')) return;
    setActionLoading('cancel');
    try {
      await billingApi.cancel();
      window.location.reload();
    } catch {
      // error
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Facturation & Abonnement</h1>
      <p className="text-gray-500 mb-8">Gérez votre plan et suivez votre consommation</p>

      {/* Current plan status */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-semibold text-gray-900 capitalize">{usage?.plan || currentPlan}</span>
              {usage?.status === 'trialing' && (
                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                  Essai {usage.trialDaysLeft}j restants
                </span>
              )}
              {usage?.status === 'active' && (
                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-xs font-medium">Actif</span>
              )}
              {usage?.status === 'past_due' && (
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-medium">Paiement en retard</span>
              )}
              {usage?.status === 'canceled' && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">Annulé</span>
              )}
            </div>
            {usage?.currentPeriodEnd && (
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Renouvellement le {new Date(usage.currentPeriodEnd).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
          {usage?.status !== 'canceled' && (
            <button
              onClick={handleCancel}
              disabled={actionLoading === 'cancel'}
              className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
            >
              {actionLoading === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Annuler
            </button>
          )}
        </div>

        {/* Usage bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Conversations ce mois</span>
            <span className="font-medium text-gray-900">
              {usage?.conversationsUsed || 0} / {usage?.conversationsLimit === 999999 ? '∞' : usage?.conversationsLimit || 0}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usagePct > 80 ? 'bg-red-500' : 'bg-indigo-500'}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          {usagePct > 80 && (
            <div className={`mt-3 p-3 rounded-xl text-sm flex items-center justify-between ${
              usagePct >= 100 ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
            }`}>
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {usagePct >= 100
                  ? 'Limite atteinte ! Vos conversations sont suspendues.'
                  : `Il vous reste ${usage?.conversationsRemaining || 0} conversations.`}
              </span>
              <button
                onClick={() => document.getElementById('plan-selection')?.scrollIntoView({ behavior: 'smooth' })}
                className="font-semibold underline hover:no-underline"
              >
                Upgrader →
              </button>
            </div>
          )}

          {/* Free plan specific nudge */}
          {usage?.plan === 'free' && usagePct < 80 && (
            <div className="mt-3 p-3 rounded-xl bg-indigo-50 text-indigo-700 text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Vous êtes sur le plan Free. Passez à Starter pour 1 000 conversations/mois.
              </span>
              <button
                onClick={() => document.getElementById('plan-selection')?.scrollIntoView({ behavior: 'smooth' })}
                className="font-semibold underline hover:no-underline"
              >
                Voir les plans →
              </button>
            </div>
          )}

          {/* Overage info */}
          {usage?.overageConversations > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-orange-50 text-orange-700 text-sm">
              <strong>{usage.overageConversations}</strong> conversations en overage — {(usage.overageCostCents / 100).toFixed(2)}€ facturés en sus.
            </div>
          )}
        </div>

        {/* Plan features */}
        {usage && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{usage.maxAgents === 999 ? '∞' : usage.maxAgents}</p>
              <p className="text-xs text-gray-500">Agents</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{usage.channels?.length || 0}</p>
              <p className="text-xs text-gray-500">Canaux</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{usage.customDomain ? '✓' : '✗'}</p>
              <p className="text-xs text-gray-500">Domaine custom</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{usage.apiAccess ? '✓' : '✗'}</p>
              <p className="text-xs text-gray-500">API access</p>
            </div>
          </div>
        )}
      </div>

      {/* Plan selection */}
      <h2 id="plan-selection" className="text-lg font-semibold text-gray-900 mb-4">Changer de plan</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {plans.map((p) => {
          const isCurrent = currentPlan === p.id;
          const colorMap: Record<string, string> = {
            blue: 'border-blue-200 bg-blue-50',
            indigo: 'border-indigo-600 bg-indigo-50',
            purple: 'border-purple-200 bg-purple-50',
          };
          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border-2 p-6 transition-all ${
                isCurrent ? 'border-green-500 shadow-lg' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[p.color] || 'bg-gray-50'}`}>
                  <p.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-500">{p.price === null ? 'Sur devis' : `${p.price}€/mois`}</p>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button disabled className="w-full py-3 rounded-xl bg-green-50 text-green-600 font-semibold cursor-default">
                  Plan actuel
                </button>
              ) : p.id === 'enterprise' ? (
                <a href="mailto:sales@stiamond.com" className="w-full py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                  Contacter les ventes
                </a>
              ) : (
                <button
                  onClick={() => handleCheckout(p.id)}
                  disabled={actionLoading === p.id}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {p.id === 'free' ? 'Passer au Free' : 'Upgrader'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
