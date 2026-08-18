'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { leadsApi, chatApi } from '@/lib/api';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Tag,
  Plus,
  X,
  Clock,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'new', label: 'Nouveau', badge: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'Contacté', badge: 'bg-amber-100 text-amber-700' },
  { value: 'qualified', label: 'Qualifié', badge: 'bg-purple-100 text-purple-700' },
  { value: 'converted', label: 'Converti', badge: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'Perdu', badge: 'bg-gray-100 text-gray-500' },
];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      leadsApi.getById(id).catch(() => null),
      chatApi.conversations({ limit: 100 }).catch(() => ({ data: [] })),
    ])
      .then(([leadData, convData]) => {
        setLead(leadData);
        const allConvs = convData?.data || convData || [];
        setConversations(allConvs.filter((c: any) => c.leadId === id));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (status: string) => {
    if (!lead || lead.status === status) return;
    setSavingStatus(true);
    const prev = lead.status;
    setLead({ ...lead, status });
    try {
      await leadsApi.update(id, { status });
      toast.success('Statut mis à jour');
    } catch {
      toast.error('Impossible de mettre à jour le statut');
      setLead({ ...lead, status: prev });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !lead) return;
    try {
      await leadsApi.addTag(id, newTag.trim());
      setLead({ ...lead, tags: [...(lead.tags || []), newTag.trim()] });
      setNewTag('');
      toast.success('Tag ajouté');
    } catch {
      toast.error('Impossible d\'ajouter le tag');
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!lead) return;
    try {
      await leadsApi.removeTag(id, tag);
      setLead({ ...lead, tags: (lead.tags || []).filter((t: string) => t !== tag) });
      toast.success('Tag supprimé');
    } catch {
      toast.error('Impossible de supprimer le tag');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8">
        <div className="card p-12 text-center">
          <p className="text-gray-500 font-medium">Lead introuvable</p>
        </div>
      </div>
    );
  }

  const statusOption = STATUS_OPTIONS.find((s) => s.value === lead.status);

  return (
    <div className="p-8 max-w-4xl">
      <button
        onClick={() => router.push('/dashboard/leads')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux leads
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lead.name || 'Sans nom'}</h1>
          <p className="text-sm text-gray-400 mt-1">#{lead.id.slice(0, 8)}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusOption?.badge}`}>
          {statusOption?.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Contact info + tags */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Coordonnées</h2>
            <div className="space-y-3">
              {lead.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${lead.email}`} className="text-gray-700 hover:text-primary-600">
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{lead.phone}</span>
                </div>
              )}
              {lead.company && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{lead.company}</span>
                </div>
              )}
              {lead.source && (
                <div className="flex items-center gap-3 text-sm">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{lead.source}</span>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Score</h2>
              <TrendingUp className="w-4 h-4 text-primary-600" />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-gray-900">{lead.score ?? 0}</div>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${Math.min((lead.score ?? 0) * 10, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {(lead.tags || []).map((tag: string) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full"
                >
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="text-gray-400 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {(lead.tags || []).length === 0 && (
                <p className="text-sm text-gray-400">Aucun tag</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                className="input text-sm"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Ajouter un tag..."
              />
              <button type="button" className="btn-secondary px-3" onClick={handleAddTag}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right column — Status + Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Statut du lead</h2>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(({ value, label, badge }) => (
                <button
                  key={value}
                  onClick={() => handleStatusChange(value)}
                  disabled={savingStatus}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    lead.status === value
                      ? `${badge} ring-2 ring-offset-1 ring-current`
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-4">
              <TimelineItem
                icon={Clock}
                title="Lead créé"
                date={lead.createdAt}
                color="bg-blue-500"
              />
              {lead.updatedAt && lead.updatedAt !== lead.createdAt && (
                <TimelineItem
                  icon={Clock}
                  title="Dernière modification"
                  date={lead.updatedAt}
                  color="bg-amber-500"
                />
              )}
              {conversations.map((conv) => (
                <TimelineItem
                  key={conv.id}
                  icon={MessageSquare}
                  title={`Conversation ${conv.status || ''}`}
                  date={conv.createdAt}
                  color="bg-green-500"
                  link={`/dashboard/chat?conversationId=${conv.id}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  title,
  date,
  color,
  link,
}: {
  icon: any;
  title: string;
  date: string;
  color: string;
  link?: string;
}) {
  const content = (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(date).toLocaleString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );

  if (link) {
    return (
      <a href={link} className="block hover:opacity-80 transition-opacity">
        {content}
      </a>
    );
  }
  return content;
}
