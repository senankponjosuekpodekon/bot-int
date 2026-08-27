'use client';
import { useState, useEffect, useCallback } from 'react';
import { Headphones, MessageSquare, User, Clock, Send, ArrowLeft, Phone, Mail, FileText, Zap } from 'lucide-react';
import { chatApi, leadsApi } from '@/lib/api';

interface Conversation {
  id: string;
  status: string;
  visitorId: string;
  agentId: string;
  leadId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  metadata?: any;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouverte',
  handed_off: 'Transférée',
  closed: 'Fermée',
};

export default function OperatorPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('handed_off');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [lead, setLead] = useState<any>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await chatApi.conversations({ status: filter || undefined, limit: 50 });
      setConversations(data.data || data);
    } catch {
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const selectConversation = async (conv: Conversation) => {
    setSelected(conv);
    try {
      const history = await chatApi.history(conv.id);
      setMessages(history);
      if (conv.leadId) {
        const leads = await leadsApi.list();
        const found = leads.find((l: any) => l.id === conv.leadId);
        setLead(found || null);
      } else {
        setLead(null);
      }
    } catch {
      showToast('Erreur lors du chargement de l\'historique', 'error');
    }
  };

  const handleSend = async () => {
    if (!reply.trim() || !selected) return;
    try {
      await chatApi.operatorReply(selected.id, reply);
      setReply('');
      selectConversation(selected);
    } catch {
      showToast('Erreur lors de l\'envoi', 'error');
    }
  };

  const handleTakeOver = async () => {
    if (!selected) return;
    try {
      await chatApi.take(selected.id);
      await chatApi.updateStatus(selected.id, 'open');
      showToast('Conversation prise en charge');
      load();
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const handleClose = async () => {
    if (!selected) return;
    try {
      await chatApi.updateStatus(selected.id, 'closed');
      showToast('Conversation fermée');
      setSelected(null);
      load();
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar: conversations list */}
      <div className={`w-full lg:w-80 border-r border-gray-200 flex flex-col ${selected ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary-600" /> Opérateur
          </h1>
          <div className="flex gap-1 mt-3">
            {['handed_off', 'open', 'closed', ''].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-2 py-1 rounded-lg text-xs font-medium ${filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {s === '' ? 'Tous' : STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500 text-sm">Chargement...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucune conversation</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 ${selected?.id === conv.id ? 'bg-primary-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{conv.visitorId?.slice(0, 20) || 'Anonyme'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${conv.status === 'handed_off' ? 'bg-orange-100 text-orange-700' : conv.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[conv.status] || conv.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{new Date(conv.updatedAt).toLocaleString('fr-FR')}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main: chat area */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelected(null)} className="lg:hidden p-1 rounded-lg hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <p className="font-medium text-gray-900">{lead?.name || selected.visitorId?.slice(0, 20) || 'Visiteur'}</p>
                <p className="text-xs text-gray-400">ID: {selected.id.slice(0, 8)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleTakeOver} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100">
                <Zap className="w-3 h-3" /> Prendre en charge
              </button>
              <button onClick={handleClose} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                Fermer
              </button>
            </div>
          </div>

          {/* Lead info */}
          {lead && (
            <div className="p-3 bg-blue-50 border-b border-blue-100 flex flex-wrap items-center gap-4 text-sm">
              {lead.email && <span className="flex items-center gap-1 text-blue-700"><Mail className="w-3 h-3" /> {lead.email}</span>}
              {lead.phone && <span className="flex items-center gap-1 text-blue-700"><Phone className="w-3 h-3" /> {lead.phone}</span>}
              {lead.company && <span className="text-blue-700">{lead.company}</span>}
              {lead.score > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 text-xs font-medium">Score: {lead.score}</span>}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">Aucun message</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                    {msg.role === 'assistant' && msg.metadata?.isOperator && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-600 mb-1">
                        <Headphones className="w-3 h-3" /> Opérateur
                      </span>
                    )}
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-primary-200' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 flex gap-2 bg-white">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Répondre en tant qu'opérateur..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-primary-500"
            />
            <button onClick={handleSend} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
              <Send className="w-4 h-4" /> Envoyer
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <Headphones className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Sélectionnez une conversation pour commencer</p>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.msg}</div>
      )}
    </div>
  );
}
