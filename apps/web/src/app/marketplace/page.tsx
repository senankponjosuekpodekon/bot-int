'use client';
import { useEffect, useState } from 'react';
import { Store, Loader2, Plus, Check, ArrowRight, Sparkles } from 'lucide-react';
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
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 hidden sm:block">Stiamond Agents</span>
          </Link>
          <div className="hidden md:flex items-center gap-4 lg:p-8 text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900 transition-colors">Accueil</Link>
            <Link href="/#pricing" className="hover:text-gray-900 transition-colors">Tarifs</Link>
            <Link href="/marketplace" className="text-indigo-600 font-medium transition-colors">Marketplace</Link>
            <Link href="/#faq" className="hover:text-gray-900 transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
            {authenticated ? (
              <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  Se connecter
                </Link>
                <Link href="/register" className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors">
                  Essai gratuit
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="h-16" />

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

      <footer className="border-t border-gray-200 bg-white py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Stiamond Agents</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-gray-900">Accueil</Link>
            <Link href="/marketplace" className="hover:text-gray-900">Marketplace</Link>
            <Link href="/login" className="hover:text-gray-900">Se connecter</Link>
            <Link href="/register" className="hover:text-gray-900">S'inscrire</Link>
          </div>
          <p>© {new Date().getFullYear()} Stiamond Agents</p>
        </div>
      </footer>
    </div>
  );
}
