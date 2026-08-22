'use client';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ClipboardList, CheckCircle2, Loader2, Star } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const QUESTION_TYPES: Record<string, string> = {
  scale_1_5: 'Échelle 1-5',
  nps_1_10: 'NPS 1-10',
  single_choice: 'Choix unique',
  multiple_choice: 'Choix multiple',
  text: 'Texte court',
  textarea: 'Texte long',
  demographic_age: 'Âge',
  demographic_location: 'Localisation',
};

const AGE_OPTIONS = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const LOCATION_OPTIONS = ['Europe', 'Afrique', 'Amérique du Nord', 'Amérique du Sud', 'Asie', 'Océanie'];

export default function PublicSurveyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const surveyId = params.surveyId as string;
  const leadId = searchParams.get('lead') || '';

  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [visibleQuestions, setVisibleQuestions] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/surveys/public/${surveyId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Survey not found');
        return r.json();
      })
      .then((data) => {
        setSurvey(data);
        setVisibleQuestions(data.questions || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Erreur');
        setLoading(false);
      });
  }, [surveyId]);

  const hasOptions = (type: string) => ['single_choice', 'multiple_choice'].includes(type);
  const isDemographic = (type: string) => ['demographic_age', 'demographic_location'].includes(type);
  const getOptions = (q: any) => {
    if (q.type === 'demographic_age') return AGE_OPTIONS;
    if (q.type === 'demographic_location') return LOCATION_OPTIONS;
    return q.options || [];
  };

  const setAnswer = (questionId: string, value: any) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    // Apply skip logic
    if (survey) {
      const updated = survey.questions.filter((q: any) => {
        if (!q.skipLogic) return true;
        const dep = newAnswers[q.skipLogic.dependsOn];
        if (dep === undefined) return false;
        const val = Array.isArray(dep) ? dep.join(',') : String(dep);
        if (q.skipLogic.operator === 'equals') return val === q.skipLogic.value;
        if (q.skipLogic.operator === 'contains') return val.includes(q.skipLogic.value);
        if (q.skipLogic.operator === 'not_equals') return val !== q.skipLogic.value;
        return true;
      });
      setVisibleQuestions(updated);
    }
  };

  const handleSubmit = async () => {
    const requiredMissing = visibleQuestions.filter((q: any) => q.required && answers[q.id] === undefined);
    if (requiredMissing.length > 0) {
      setError(`Veuillez répondre aux questions obligatoires (${requiredMissing.length})`);
      return;
    }

    setSubmitting(true);
    setError('');

    const answerArray = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));

    try {
      const res = await fetch(`${API_BASE}/surveys/public/${surveyId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: answerArray,
          leadId: leadId || undefined,
          source: 'public_link',
        }),
      });

      if (!res.ok) throw new Error('Erreur lors de la soumission');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Sondage introuvable ou inactif</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-4 lg:p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Merci !</h1>
          <p className="text-gray-500 text-sm">Vos réponses ont bien été enregistrées. Votre avis nous aide à améliorer notre service.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-4 lg:p-6 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{survey.title}</h1>
              <p className="text-xs text-gray-400">{survey.type === 'post_purchase' ? 'Post-achat' : 'Pre-achat'}</p>
            </div>
          </div>
          {survey.description && (
            <p className="text-sm text-gray-600">{survey.description}</p>
          )}
        </div>

        {/* Questions */}
        <div className="bg-white rounded-2xl shadow-sm p-4 lg:p-6 space-y-4 lg:space-y-6">
          {visibleQuestions.map((q: any, idx: number) => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                <span className="text-gray-400 mr-2">{idx + 1}.</span>
                {q.label}
                {q.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {/* Scale / NPS */}
              {(q.type === 'scale_1_5' || q.type === 'nps_1_10') && (
                <div>
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: q.type === 'scale_1_5' ? 5 : 10 }, (_, i) => i + 1).map((val) => (
                      <button
                        key={val}
                        onClick={() => setAnswer(q.id, val)}
                        className={`w-10 h-10 rounded-lg border-2 font-medium text-sm transition-all ${
                          answers[q.id] === val
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  {q.type === 'nps_1_10' && (
                    <div className="flex justify-between mt-2 text-xs text-gray-400">
                      <span>Peu probable</span>
                      <span>Très probable</span>
                    </div>
                  )}
                </div>
              )}

              {/* Single choice / Demographic */}
              {(q.type === 'single_choice' || isDemographic(q.type)) && (
                <div className="space-y-2">
                  {getOptions(q).map((opt: string) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        answers[q.id] === opt ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q_${q.id}`}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswer(q.id, opt)}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Multiple choice */}
              {q.type === 'multiple_choice' && (
                <div className="space-y-2">
                  {getOptions(q).map((opt: string) => {
                    const selected = Array.isArray(answers[q.id]) && answers[q.id].includes(opt);
                    return (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selected ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            const current = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                            if (selected) {
                              setAnswer(q.id, current.filter((v: string) => v !== opt));
                            } else {
                              setAnswer(q.id, [...current, opt]);
                            }
                          }}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Text / Textarea */}
              {(q.type === 'text' || q.type === 'textarea') && (
                q.type === 'textarea' ? (
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder={q.placeholder || 'Votre réponse...'}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 text-sm focus:border-primary-500 outline-none"
                    rows={4}
                  />
                ) : (
                  <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder={q.placeholder || 'Votre réponse...'}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 text-sm focus:border-primary-500 outline-none"
                  />
                )
              )}
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</>
            ) : (
              'Envoyer mes réponses'
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Vos réponses sont confidentielles et utilisées pour améliorer notre service.
        </p>
      </div>
    </div>
  );
}
