'use client';
import { useEffect, useState } from 'react';
import { Store, Loader2, Plus, Check, ArrowRight } from 'lucide-react';
import { marketplaceApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';

interface Template {
  id: string;
  name: string;
  description?: string;
  category?: string;
  industry?: string;
  agentType?: string;
}

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [installed, setInstalled] = useState<string | null>(null);
  const { accessToken, isAuthenticated } = useAuthStore();

  const authenticated = isAuthenticated();

  const load = async () => {
    setLoading(true);
    try {
      const res = await marketplaceApi.list({ limit: 50 });
      setTemplates(res.data || []);
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleInstall = async (id: string) => {
    if (!authenticated) return;
    setInstalling(id);
    try {
      await marketplaceApi.install(id);
      setInstalled(id);
      setTimeout(() => setInstalled(null), 2000);
    } catch {
      // error
    } finally {
      setInstalling(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Marketplace</h1>
              <p className="text-sm text-gray-500">Agents spécialisés prêts à l'emploi</p>
            </div>
          </div>
          {authenticated ? (
            <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Dashboard →
            </Link>
          ) : (
            <Link href="/login" className="btn-primary text-sm">
              Se connecter
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-gray-500 py-20">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement du marketplace...
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <Store className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun template public disponible.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{t.name}</h3>
                    {t.category && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {t.category}
                      </span>
                    )}
                  </div>
                  <Store className="w-5 h-5 text-indigo-500" />
                </div>
                <p className="text-sm text-gray-500 flex-1">{t.description || 'Aucune description'}</p>
                <div className="mt-4 flex items-center justify-between">
                  {t.industry ? <span className="text-xs text-gray-400">{t.industry}</span> : <span />}
                  {authenticated ? (
                    <button
                      onClick={() => handleInstall(t.id)}
                      disabled={!!installing || installed === t.id}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        installed === t.id
                          ? 'bg-green-50 text-green-600'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      } disabled:opacity-60`}
                    >
                      {installing === t.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : installed === t.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {installed === t.id ? 'Installé' : 'Installer'}
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      Se connecter <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
