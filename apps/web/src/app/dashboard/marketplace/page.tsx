'use client';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Store, Sparkles, Loader2, Plus, Check } from 'lucide-react';
import { marketplaceApi } from '@/lib/api';

interface Template {
  id: string;
  name: string;
  description?: string;
  category?: string;
  industry?: string;
  agentType?: string;
}

export default function MarketplacePage() {
  const [page, setPage] = useState(1);
  const { data, isLoading: loading } = useQuery({
    queryKey: ['marketplace', 'templates', page],
    queryFn: () => marketplaceApi.list({ page, limit: 20 }),
  });
  const templates: Template[] = data?.data || [];
  const pagination = {
    page: data?.page || 1,
    limit: data?.limit || 20,
    total: data?.total || 0,
    totalPages: data?.totalPages || 1,
  };
  const installTemplate = useMutation({
    mutationFn: (id: string) => marketplaceApi.install(id),
  });
  const installing = installTemplate.isPending ? installTemplate.variables : null;
  const [installed, setInstalled] = useState<string | null>(null);

  const handleInstall = async (id: string) => {
    try {
      await installTemplate.mutateAsync(id);
      setInstalled(id);
      setTimeout(() => setInstalled(null), 2000);
    } catch {
      // error
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 text-center text-gray-500 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Chargement du marketplace...
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Store className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-sm text-gray-500">Installez des agents spécialisés prêts à l'emploi</p>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="mt-8 p-8 text-center bg-white rounded-2xl border border-gray-200">
          <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun template public disponible pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
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
                <Sparkles className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-sm text-gray-500 flex-1">{t.description || 'Aucune description'}</p>
              <div className="mt-4 flex items-center justify-between">
                {t.industry && <span className="text-xs text-gray-400">{t.industry}</span>}
                <button
                  onClick={() => handleInstall(t.id)}
                  disabled={!!installing || installed === t.id}
                  className={`ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                p === pagination.page ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
