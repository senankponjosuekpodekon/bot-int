'use client';
import { useState, useEffect, useCallback } from 'react';
import { Brain, AlertCircle, TrendingUp, Lightbulb, Check, RefreshCw, Zap, Target, Globe, Sparkles } from 'lucide-react';
import { intelligenceApi } from '@/lib/api';

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  data: Record<string, any>;
  resolved: boolean;
  confidence: number;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  unanswered: { icon: AlertCircle, color: 'text-red-600 bg-red-50', label: 'Question non répondue' },
  trend: { icon: TrendingUp, color: 'text-blue-600 bg-blue-50', label: 'Tendance' },
  lead_pattern: { icon: Target, color: 'text-purple-600 bg-purple-50', label: 'Pattern de conversion' },
  suggestion: { icon: Lightbulb, color: 'text-yellow-600 bg-yellow-50', label: 'Suggestion' },
  performance: { icon: Zap, color: 'text-green-600 bg-green-50', label: 'Performance' },
};

export default function IntelligencePage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [showResolved, setShowResolved] = useState(false);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [platform, setPlatform] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, i, p, recs] = await Promise.all([
        intelligenceApi.dashboard(),
        intelligenceApi.insights({ type: filter || undefined, resolved: showResolved ? 'true' : 'false' }),
        intelligenceApi.platformDashboard().catch(() => null),
        intelligenceApi.platformRecommendations().catch(() => []),
      ]);
      setDashboard(d);
      setInsights(i);
      setPlatform(p);
      setRecommendations(recs);
    } catch {
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, showResolved]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id: string) => {
    try {
      await intelligenceApi.resolve(id);
      showToast('Insight résolu');
      load();
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const handleAutoEnrich = async (keyword: string) => {
    setEnriching(keyword);
    try {
      const result = await intelligenceApi.autoEnrich(keyword);
      showToast(result.message);
      load();
    } catch {
      showToast('Erreur lors de l\'enrichissement', 'error');
    } finally {
      setEnriching(null);
    }
  };

  const stats = dashboard ? [
    { label: 'Conversations analysées', value: dashboard.totalAnalyzed, icon: Brain, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Questions non répondues', value: dashboard.unansweredCount, icon: AlertCircle, color: 'text-red-600 bg-red-50' },
    { label: 'Tendances détectées', value: dashboard.trendsCount, icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
    { label: 'Taux de non-réponse', value: `${dashboard.unansweredRate}%`, icon: Zap, color: 'text-orange-600 bg-orange-50' },
    { label: 'Taux de conversion', value: `${dashboard.conversionRate}%`, icon: Target, color: 'text-green-600 bg-green-50' },
    { label: 'Suggestions', value: dashboard.suggestionsCount, icon: Lightbulb, color: 'text-yellow-600 bg-yellow-50' },
  ] : [];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary-600" /> Intelligence
          </h1>
          <p className="text-sm text-gray-500 mt-1">Auto-apprentissage en arrière-plan — plus le bot tourne, plus il devient pertinent</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {dashboard?.topIntents?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gray-400" /> Intentions les plus détectées</h2>
          <div className="flex flex-wrap gap-2">
            {dashboard.topIntents.map((t: any) => (
              <span key={t.intent} className="text-sm px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 font-medium">
                {t.intent} <span className="text-primary-400">({t.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm">
          <option value="">Tous les types</option>
          <option value="unanswered">Questions non répondues</option>
          <option value="trend">Tendances</option>
          <option value="lead_pattern">Patterns de conversion</option>
          <option value="suggestion">Suggestions</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="rounded" />
          Afficher résolus
        </label>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : insights.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun insight. Le module apprend automatiquement en arrière-plan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => {
            const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.suggestion;
            const Icon = config.icon;
            return (
              <div key={insight.id} className={`bg-white rounded-xl border p-5 ${insight.resolved ? 'opacity-60' : 'border-gray-200'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{insight.title}</h3>
                        <span className="text-xs text-gray-400">{config.label} • {new Date(insight.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                      {insight.confidence > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {Math.round(insight.confidence * 100)}% confiance
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{insight.description}</p>

                    {insight.data.sampleMessages && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-gray-400 font-medium">Exemples:</p>
                        {insight.data.sampleMessages.map((msg: string, i: number) => (
                          <p key={i} className="text-xs text-gray-500 italic bg-gray-50 px-2 py-1 rounded">"{msg}"</p>
                        ))}
                      </div>
                    )}

                    {insight.data.autoSearchUrl && (
                      <a href={insight.data.autoSearchUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">
                        Rechercher sur le web →
                      </a>
                    )}

                    <div className="flex gap-2 mt-3">
                      {!insight.resolved && (
                        <>
                          <button onClick={() => handleResolve(insight.id)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                            <Check className="w-3 h-3" /> Résoudre
                          </button>
                          {insight.type === 'unanswered' || insight.type === 'suggestion' ? (
                            <button
                              onClick={() => handleAutoEnrich(insight.data.keyword)}
                              disabled={enriching === insight.data.keyword}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 disabled:opacity-50"
                            >
                              <Zap className="w-3 h-3" /> {enriching === insight.data.keyword ? 'Enrichissement...' : 'Auto-enrichir la base'}
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {platform && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Intelligence plateforme (anonyme)</h2>
            <span className="text-xs text-gray-400">— apprentissage global, aucune donnée personnelle</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{platform.totalMetrics}</p>
              <p className="text-xs text-gray-500 mt-1">Métriques agrégées</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{platform.totalSamples}</p>
              <p className="text-xs text-gray-500 mt-1">Échantillons collectés</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{platform.flowCompletion?.length || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Flows analysés</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{platform.conversionFactors?.length || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Facteurs de conversion</p>
            </div>
          </div>

          {platform.conversionFactors?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-gray-400" /> Facteurs de conversion globaux</h3>
              <div className="space-y-2">
                {platform.conversionFactors.map((cf: any) => (
                  <div key={cf.key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{cf.key.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-100 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(cf.value, 100)}%` }} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-12 text-right">{Math.round(cf.value)}%</span>
                      <span className="text-xs text-gray-400">({cf.samples})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {platform.intentDistribution?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gray-400" /> Distribution des intentions (tous tenants)</h3>
              <div className="flex flex-wrap gap-2">
                {platform.intentDistribution.map((intent: any) => (
                  <span key={intent.key} className="text-sm px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-medium">
                    {intent.key} <span className="text-indigo-400">({Math.round(intent.value)}% — {intent.samples})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-500" /> Recommandations de la plateforme</h3>
              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <div key={i} className="border-l-2 border-yellow-400 pl-3">
                    <p className="text-sm font-medium text-gray-900">{rec.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                    <span className="text-xs text-gray-400">Confiance: {Math.round(rec.confidence * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.msg}</div>
      )}
    </div>
  );
}
