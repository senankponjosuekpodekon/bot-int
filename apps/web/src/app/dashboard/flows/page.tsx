'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { List, Play, Settings, Trash2, Plus, Loader2, Activity } from 'lucide-react';
import { flowsApi } from '@/lib/api';
import { toast } from 'sonner';
import FlowForm from './FlowForm';

interface Flow {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  agentId?: string;
  fields?: any[];
  actions?: any[];
}

interface Agent {
  id: string;
  name: string;
}

interface FlowExecution {
  id: string;
  status: 'success' | 'error' | 'pending';
  triggeredBy: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  errorMessage?: string;
  createdAt: string;
}

function FlowExecutions({ flowId }: { flowId: string }) {
  const { data: execs, isLoading } = useQuery<FlowExecution[]>({
    queryKey: ['flows', flowId, 'executions'],
    queryFn: async () => {
      try {
        const res = await flowsApi.executionsByFlow(flowId, { page: 1, limit: 20 });
        return (res.data || []) as FlowExecution[];
      } catch {
        return [];
      }
    },
  });

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Play className="w-4 h-4 text-gray-400" /> Dernières exécutions
      </h4>
      {isLoading || !execs ? (
        <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Chargement...</p>
      ) : execs.length === 0 ? (
        <p className="text-sm text-gray-400">Aucune exécution.</p>
      ) : (
        <div className="space-y-2">
          {execs.map((exec) => (
            <div key={exec.id} className="p-3 rounded-lg bg-gray-50 text-sm">
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  exec.status === 'success' ? 'bg-green-50 text-green-700' :
                  exec.status === 'error' ? 'bg-red-50 text-red-700' :
                  'bg-yellow-50 text-yellow-700'
                }`}>
                  {exec.status}
                </span>
                <span className="text-xs text-gray-400">{new Date(exec.createdAt).toLocaleString('fr-FR')}</span>
              </div>
              <p className="mt-1 text-gray-600">{exec.triggeredBy}</p>
              {exec.errorMessage && <p className="text-xs text-red-500 mt-1">{exec.errorMessage}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FlowsPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Flow | null>(null);

  const { data: flows = [], isLoading: loading, isError } = useQuery<Flow[]>({
    queryKey: ['flows'],
    queryFn: async () => {
      const res = await flowsApi.list();
      return Array.isArray(res) ? res : res?.data ?? [];
    },
  });

  useEffect(() => {
    if (isError) toast.error('Erreur lors du chargement des flux');
  }, [isError]);

  const deleteFlow = useMutation({
    mutationFn: (id: string) => flowsApi.delete(id),
    onSuccess: () => {
      toast.success('Flux supprimé');
      queryClient.invalidateQueries({ queryKey: ['flows'] });
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const saveFlow = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: any }) =>
      id ? flowsApi.update(id, data) : flowsApi.create(data),
    onSuccess: (_res, { id }) => {
      toast.success(id ? 'Flux mis à jour' : 'Flux créé');
      setShowForm(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['flows'] });
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  const toggleExecutions = (flowId: string) => {
    setExpanded({ ...expanded, [flowId]: !expanded[flowId] });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer ce flux ?')) return;
    deleteFlow.mutate(id);
  };

  const handleEdit = (flow: Flow) => {
    setEditing(flow);
    setShowForm(true);
  };

  const handleSave = (data: any) => {
    saveFlow.mutate({ id: editing?.id, data });
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 text-center text-gray-500 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Chargement des flux...
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <List className="w-6 h-6 text-primary-600" />
            Flux (chat flows)
          </h1>
          <p className="text-gray-500 text-sm mt-1">Formulaires conversationnels et audit d'exécution</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Flow
        </button>
      </div>

      {showForm && (
        <FlowForm flow={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
      )}

      {flows.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <List className="w-12 h-12 mx-auto mb-3 opacity-30" />
          Aucun flux pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {flows.map((flow) => (
            <div key={flow.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{flow.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${flow.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {flow.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  {flow.description && <p className="text-gray-500 text-sm mt-1">{flow.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{flow.fields?.length || 0} champs</span>
                    <span>{flow.actions?.length || 0} actions</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleExecutions(flow.id)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                    title="Executions"
                  >
                    <Activity className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(flow)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Edit"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(flow.id)}
                    className="p-2 text-red-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expanded[flow.id] && <FlowExecutions flowId={flow.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
