'use client';
import { useState, useEffect, useCallback } from 'react';
import { surveysApi, agentsApi } from '@/lib/api';
import { ClipboardList, Plus, Trash2, Save, BarChart3, Eye, Copy, X, ChevronDown, ChevronUp, Star, Download } from 'lucide-react';
import { toast } from 'sonner';

const QUESTION_TYPES = [
  { value: 'scale_1_5', label: 'Échelle 1-5' },
  { value: 'nps_1_10', label: 'NPS 1-10 (recommandation)' },
  { value: 'single_choice', label: 'Choix unique' },
  { value: 'multiple_choice', label: 'Choix multiple' },
  { value: 'text', label: 'Texte court' },
  { value: 'textarea', label: 'Texte long' },
  { value: 'demographic_age', label: 'Démographique - Âge' },
  { value: 'demographic_location', label: 'Démographique - Localisation' },
];

const AGE_OPTIONS = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const LOCATION_OPTIONS = ['Europe', 'Afrique', 'Amérique du Nord', 'Amérique du Sud', 'Asie', 'Océanie'];

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [resultsFor, setResultsFor] = useState<any>(null);
  const [results, setResults] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, ag] = await Promise.all([surveysApi.list(), agentsApi.list()]);
      setSurveys(data);
      setAgents(ag);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => {
    setEditing({
      title: '',
      description: '',
      type: 'pre_purchase',
      agentId: agents[0]?.id || '',
      questions: [],
      isActive: true,
      triggerConfig: {},
    });
    setShowBuilder(true);
  };

  const handleSave = async () => {
    if (!editing.title.trim()) { toast.error('Titre requis'); return; }
    if (editing.questions.length === 0) { toast.error('Au moins une question requise'); return; }
    try {
      if (editing.id) {
        await surveysApi.update(editing.id, editing);
        toast.success('Survey mis à jour');
      } else {
        await surveysApi.create(editing);
        toast.success('Survey créé');
      }
      setShowBuilder(false);
      setEditing(null);
      load();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce survey ?')) return;
    try {
      await surveysApi.delete(id);
      toast.success('Survey supprimé');
      load();
    } catch {
      toast.error('Erreur');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await surveysApi.toggle(id);
      load();
    } catch {
      toast.error('Erreur');
    }
  };

  const handleResults = async (survey: any) => {
    setResultsFor(survey);
    try {
      const data = await surveysApi.results(survey.id);
      setResults(data);
    } catch {
      toast.error('Erreur lors du chargement des résultats');
    }
  };

  const handleExportCsv = async (survey: any) => {
    try {
      const blob = await surveysApi.exportCsv(survey.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `survey-${survey.title.replace(/\s+/g, '_')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export CSV téléchargé');
    } catch {
      toast.error('Erreur lors de l\'export');
    }
  };

  const addQuestion = () => {
    setEditing({
      ...editing,
      questions: [...editing.questions, { id: `q_${Date.now()}`, type: 'scale_1_5', label: '', required: false, options: [] }],
    });
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    const questions = [...editing.questions];
    questions[idx] = { ...questions[idx], [field]: value };
    setEditing({ ...editing, questions });
  };

  const removeQuestion = (idx: number) => {
    setEditing({ ...editing, questions: editing.questions.filter((_: any, i: number) => i !== idx) });
  };

  const hasOptions = (type: string) => ['single_choice', 'multiple_choice'].includes(type);
  const isDemographic = (type: string) => ['demographic_age', 'demographic_location'].includes(type);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary-600" /> Sondages
          </h1>
          <p className="text-sm text-gray-500 mt-1">Collectez des feedbacks pre-purchase et post-purchase</p>
        </div>
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
          <Plus className="w-4 h-4" /> Créer un sondage
        </button>
      </div>

      {/* Survey list */}
      {loading ? (
        <p className="text-center text-gray-500 py-8">Chargement...</p>
      ) : surveys.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun sondage pour le moment</p>
          <p className="text-sm text-gray-400 mt-1">Créez votre premier sondage pour collecter des feedbacks</p>
        </div>
      ) : (
        <div className="space-y-3">
          {surveys.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.type === 'pre_purchase' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {s.type === 'pre_purchase' ? 'Pre-achat' : 'Post-achat'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{s.questions?.length || 0} question(s) · {s.responseCount} réponse(s)</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleResults(s)} className="p-2 rounded-lg hover:bg-gray-100" title="Voir les résultats">
                  <BarChart3 className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => handleExportCsv(s)} className="p-2 rounded-lg hover:bg-gray-100" title="Export CSV">
                  <Download className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => { setEditing(s); setShowBuilder(true); }} className="p-2 rounded-lg hover:bg-gray-100" title="Éditer">
                  <Eye className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => handleToggle(s.id)} className="p-2 rounded-lg hover:bg-gray-100" title="Activer/Désactiver">
                  <span className={`text-xs font-medium ${s.isActive ? 'text-green-600' : 'text-gray-400'}`}>{s.isActive ? 'ON' : 'OFF'}</span>
                </button>
                <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg hover:bg-gray-100" title="Supprimer">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Builder modal */}
      {showBuilder && editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{editing.id ? 'Éditer' : 'Créer'} un sondage</h2>
              <button onClick={() => { setShowBuilder(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Titre</label>
                <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Profil client" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Description (optionnel)</label>
                <input value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Aidez-nous à mieux vous connaître" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm">
                    <option value="pre_purchase">Pre-achat (dans le chat)</option>
                    <option value="post_purchase">Post-achat (par email)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Agent</label>
                  <select value={editing.agentId || ''} onChange={(e) => setEditing({ ...editing, agentId: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm">
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Questions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Questions</label>
                  <button onClick={addQuestion} className="flex items-center gap-1 text-xs text-primary-600 font-medium"><Plus className="w-3 h-3" /> Ajouter</button>
                </div>

                {editing.questions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">Aucune question. Cliquez sur "Ajouter".</p>
                ) : (
                  <div className="space-y-3">
                    {editing.questions.map((q: any, idx: number) => (
                      <div key={q.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500">Question {idx + 1}</span>
                          <button onClick={() => removeQuestion(idx)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <input value={q.label} onChange={(e) => updateQuestion(idx, 'label', e.target.value)} placeholder="Votre question..." className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm mb-2" />
                        <div className="flex gap-2 items-center">
                          <select value={q.type} onChange={(e) => updateQuestion(idx, 'type', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border border-gray-300 text-xs">
                            {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          <label className="flex items-center gap-1 text-xs text-gray-600">
                            <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(idx, 'required', e.target.checked)} /> Requis
                          </label>
                        </div>
                        {hasOptions(q.type) && (
                          <input
                            value={(q.options || []).join(', ')}
                            onChange={(e) => updateQuestion(idx, 'options', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                            placeholder="Option 1, Option 2, Option 3 (séparées par des virgules)"
                            className="w-full mt-2 px-3 py-1.5 rounded-lg border border-gray-300 text-xs"
                          />
                        )}
                        {isDemographic(q.type) && (
                          <p className="text-xs text-blue-600 mt-1">
                            Options automatiques: {q.type === 'demographic_age' ? AGE_OPTIONS.join(', ') : LOCATION_OPTIONS.join(', ')}
                          </p>
                        )}

                        {/* Skip logic */}
                        <div className="mt-2 border-t border-gray-100 pt-2">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Logique de saut conditionnel</summary>
                            <div className="mt-2 space-y-2 p-2 bg-gray-50 rounded">
                              <div className="flex gap-2">
                                <select
                                  value={q.skipLogic?.dependsOn || ''}
                                  onChange={(e) => updateQuestion(idx, 'skipLogic', { ...q.skipLogic, dependsOn: e.target.value, operator: q.skipLogic?.operator || 'equals', value: q.skipLogic?.value || '' })}
                                  className="flex-1 px-2 py-1 rounded border border-gray-200 text-xs"
                                >
                                  <option value="">Dépend de...</option>
                                  {editing.questions.filter((oq: any, oi: number) => oi !== idx).map((oq: any, oi: number) => (
                                    <option key={oq.id} value={oq.id}>{oq.label || `Question ${oi + 1}`}</option>
                                  ))}
                                </select>
                                <select
                                  value={q.skipLogic?.operator || 'equals'}
                                  onChange={(e) => updateQuestion(idx, 'skipLogic', { ...q.skipLogic, dependsOn: q.skipLogic?.dependsOn || '', operator: e.target.value, value: q.skipLogic?.value || '' })}
                                  className="px-2 py-1 rounded border border-gray-200 text-xs"
                                >
                                  <option value="equals">égal à</option>
                                  <option value="contains">contient</option>
                                  <option value="not_equals">différent de</option>
                                </select>
                                <input
                                  value={q.skipLogic?.value || ''}
                                  onChange={(e) => updateQuestion(idx, 'skipLogic', { ...q.skipLogic, dependsOn: q.skipLogic?.dependsOn || '', operator: q.skipLogic?.operator || 'equals', value: e.target.value })}
                                  placeholder="valeur"
                                  className="w-20 px-2 py-1 rounded border border-gray-200 text-xs"
                                />
                              </div>
                              {q.skipLogic?.dependsOn && (
                                <button
                                  onClick={() => updateQuestion(idx, 'skipLogic', undefined)}
                                  className="text-red-400 text-xs"
                                >Supprimer la condition</button>
                              )}
                            </div>
                          </details>
                        </div>

                        {/* A/B variant */}
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className="text-gray-500">Variante A/B:</span>
                          <select
                            value={q.variant || 'A'}
                            onChange={(e) => updateQuestion(idx, 'variant', e.target.value)}
                            className="px-2 py-0.5 rounded border border-gray-200 text-xs"
                          >
                            <option value="A">A (défaut)</option>
                            <option value="B">B (alternative)</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pre-purchase targeting config */}
              {editing.type === 'pre_purchase' && (
                <div className="bg-blue-50 rounded-lg p-3 space-y-3">
                  <p className="text-sm font-medium text-blue-800">Ciblage d'affichage (widget)</p>
                  <div>
                    <label className="text-xs text-gray-600">Afficher après X messages</label>
                    <input
                      type="number"
                      value={editing.triggerConfig?.showAfterMessages || 3}
                      onChange={(e) => setEditing({ ...editing, triggerConfig: { ...editing.triggerConfig, showAfterMessages: parseInt(e.target.value) || 3 } })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Pages où afficher (séparées par virgule, * = toutes)</label>
                    <input
                      value={(editing.triggerConfig?.showOnPages || []).join(', ')}
                      onChange={(e) => setEditing({ ...editing, triggerConfig: { ...editing.triggerConfig, showOnPages: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) } })}
                      placeholder="/checkout, /cart, /products/*"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Laisser vide = toutes les pages. * = wildcard (ex: /products/*)</p>
                  </div>
                </div>
              )}

              {/* Post-purchase email config */}
              {editing.type === 'post_purchase' && (
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800 mb-2">Configuration email post-achat</p>
                  <input value={editing.triggerConfig?.emailSubject || ''} onChange={(e) => setEditing({ ...editing, triggerConfig: { ...editing.triggerConfig, emailSubject: e.target.value } })} placeholder="Sujet de l'email (ex: Votre avis nous intéresse)" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm mb-2" />
                  <textarea value={editing.triggerConfig?.emailTemplate || ''} onChange={(e) => setEditing({ ...editing, triggerConfig: { ...editing.triggerConfig, emailTemplate: e.target.value } })} placeholder="Template email (optionnel). Lien du survey ajouté automatiquement." className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm h-20" />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700">
                  <Save className="w-4 h-4" /> Sauvegarder
                </button>
                <button onClick={() => { setShowBuilder(false); setEditing(null); }} className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results modal */}
      {resultsFor && results && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Résultats: {resultsFor.title}</h2>
              <button onClick={() => { setResultsFor(null); setResults(null); }} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            <div className="mb-4 p-3 bg-primary-50 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-primary-700">{results.totalResponses}</p>
              <p className="text-sm text-primary-600">réponses au total</p>
            </div>

            {/* A/B variant breakdown */}
            {results.variants && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-purple-800 mb-2">A/B Testing</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-purple-600">{results.variants.variantA.count}</p>
                    <p className="text-xs text-gray-500">Variante A</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-purple-600">{results.variants.variantB.count}</p>
                    <p className="text-xs text-gray-500">Variante B</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {results.analysis.map((a: any, idx: number) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900 text-sm mb-2">{a.label}</p>
                  <p className="text-xs text-gray-400 mb-2">{a.responseCount} réponse(s) · {a.type}</p>

                  {a.average && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-primary-600">{a.average}</span>
                      <span className="text-xs text-gray-500">moyenne</span>
                    </div>
                  )}

                  {a.nps !== undefined && (
                    <div className="flex items-center gap-4 mb-2">
                      <div className="text-center">
                        <p className="text-xl font-bold text-green-600">{a.nps}</p>
                        <p className="text-xs text-gray-500">NPS</p>
                      </div>
                      <div className="text-xs text-gray-500">
                        <p className="text-green-600">{a.promoters} promoteurs</p>
                        <p className="text-gray-400">{a.passives} passifs</p>
                        <p className="text-red-500">{a.detractors} détracteurs</p>
                      </div>
                    </div>
                  )}

                  {a.distribution && !a.average && !a.nps && (
                    <div className="space-y-1">
                      {Object.entries(a.distribution).map(([key, count]: any) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-32 truncate">{key}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                            <div className="bg-primary-500 h-full rounded-full" style={{ width: `${results.totalResponses > 0 ? (count / results.totalResponses) * 100 : 0}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {a.distribution && a.average && (
                    <div className="flex gap-1">
                      {Object.entries(a.distribution).map(([key, count]: any) => (
                        <div key={key} className="flex-1 text-center">
                          <div className="bg-primary-100 rounded-t" style={{ height: `${count * 8}px`, minHeight: '2px' }} />
                          <p className="text-xs text-gray-500 mt-1">{key}</p>
                          <p className="text-xs font-medium">{count}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {a.answers && a.answers.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {a.answers.slice(0, 5).map((ans: any, i: number) => (
                        <p key={i} className="text-xs text-gray-600 bg-gray-50 rounded p-2">{typeof ans === 'string' ? ans.slice(0, 150) : JSON.stringify(ans).slice(0, 150)}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
