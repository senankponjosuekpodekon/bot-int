'use client';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { agentsApi, chatApi, leadsApi } from '@/lib/api';
import { Send, Bot, User, RefreshCw, MessageSquare, ArrowUpRight, Info, Copy, CheckCircle2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';

const CONVERSATION_PAGE_SIZE = 12;

type ConversationFilters = {
  status: 'all' | 'open' | 'handed_off' | 'closed';
  agentId: string;
  leadStatus: 'all' | 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  hasLead: 'all' | 'with' | 'without';
};

const DEFAULT_FILTERS: ConversationFilters = {
  status: 'all',
  agentId: 'all',
  leadStatus: 'all',
  hasLead: 'all',
};

const STATUS_FILTERS: Array<{ label: string; value: ConversationFilters['status'] }> = [
  { label: 'Toutes', value: 'all' },
  { label: 'Ouvertes', value: 'open' },
  { label: 'Transférées', value: 'handed_off' },
  { label: 'Closes', value: 'closed' },
];

const HAS_LEAD_FILTERS: Array<{ label: string; value: ConversationFilters['hasLead'] }> = [
  { label: 'Tous les leads', value: 'all' },
  { label: 'Avec lead', value: 'with' },
  { label: 'Sans lead', value: 'without' },
];

const LEAD_STATUS_OPTIONS: Array<{ label: string; value: ConversationFilters['leadStatus'] }> = [
  { label: 'Statut du lead', value: 'all' },
  { label: 'Nouveau', value: 'new' },
  { label: 'Contacté', value: 'contacted' },
  { label: 'Qualifié', value: 'qualified' },
  { label: 'Converti', value: 'converted' },
  { label: 'Perdu', value: 'lost' },
];

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [captureLead, setCaptureLead] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeadToAttach, setSelectedLeadToAttach] = useState('');
  const [attachingLead, setAttachingLead] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [copiedConversationId, setCopiedConversationId] = useState<string | null>(null);
  const [conversationFilters, setConversationFilters] = useState<ConversationFilters>({
    ...DEFAULT_FILTERS,
  });
  const [conversationMeta, setConversationMeta] = useState({
    total: 0,
    page: 1,
    limit: CONVERSATION_PAGE_SIZE,
    hasMore: true,
  });
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const [pendingDeepLinkId, setPendingDeepLinkId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversationListRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadConversations = useCallback(
    async (page = 1, append = false) => {
      const params: Record<string, any> = { page, limit: CONVERSATION_PAGE_SIZE };
      if (conversationFilters.status !== 'all') params.status = conversationFilters.status;
      if (conversationFilters.agentId !== 'all') params.agentId = conversationFilters.agentId;
      if (conversationFilters.leadStatus !== 'all') params.leadStatus = conversationFilters.leadStatus;
      if (conversationFilters.hasLead !== 'all') {
        params.hasLead = conversationFilters.hasLead === 'with';
      }

      if (append) {
        setLoadingMoreConversations(true);
      } else {
        setLoadingConversations(true);
      }

      try {
        const response = await chatApi.conversations(params);
        const { data = [], meta = {} } = response;
        const incoming = Array.isArray(data) ? data : [];
        setConversationMeta((prevMeta) => {
          const total = meta.total ?? (append ? prevMeta.total : incoming.length);
          return {
            total,
            page: meta.page ?? page,
            limit: meta.limit ?? CONVERSATION_PAGE_SIZE,
            hasMore: meta.hasMore ?? incoming.length === CONVERSATION_PAGE_SIZE,
          };
        });
        setConversations((prev) => {
          if (!append) return incoming;
          const existingIds = new Set(prev.map((c) => c.id));
          const deduped = incoming.filter((c: any) => !existingIds.has(c.id));
          return [...prev, ...deduped];
        });
      } catch (error) {
        console.error(error);
        toast.error('Impossible de charger les conversations');
      } finally {
        if (append) {
          setLoadingMoreConversations(false);
        } else {
          setLoadingConversations(false);
        }
      }
    },
    [conversationFilters],
  );

  useEffect(() => {
    agentsApi.list().then((data) => {
      setAgents(data);
      if (data.length > 0) setSelectedAgent(data[0].id);
    });
  }, []);

  useEffect(() => {
    loadConversations(1, false);
  }, [loadConversations]);

  useEffect(() => {
    leadsApi.list().then(setLeads).catch(() => {
      toast.error('Impossible de charger les leads');
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const deepLinkId = new URLSearchParams(window.location.search).get('conversationId');
    if (deepLinkId) setPendingDeepLinkId(deepLinkId);
  }, []);

  useEffect(() => {
    if (!pendingDeepLinkId || loadingConversations) return;
    setPendingDeepLinkId(null);
    handleSelectConversation(pendingDeepLinkId);
  }, [pendingDeepLinkId, loadingConversations]);

  useEffect(() => {
    const scrollRoot = conversationListRef.current;
    observerRef.current?.disconnect();
    const sentinel = loadMoreTriggerRef.current;
    if (!sentinel || !scrollRoot) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry?.isIntersecting &&
          conversationMeta.hasMore &&
          !loadingConversations &&
          !loadingMoreConversations
        ) {
          loadConversations((conversationMeta.page ?? 1) + 1, true);
        }
      },
      { root: scrollRoot, threshold: 0.2 },
    );
    observerRef.current.observe(sentinel);
    return () => observerRef.current?.disconnect();
  }, [conversationMeta.hasMore, conversationMeta.page, loadingConversations, loadingMoreConversations, loadConversations]);

  const loadHistory = async (id: string) => {
    setLoadingHistory(true);
    try {
      const history = await chatApi.history(id);
      const formatted = history.map((msg: any) => ({
        id: msg.id,
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
        createdAt: msg.createdAt,
      }));
      setMessages(formatted);
    } catch (error) {
      console.error(error);
      toast.error('Conversation introuvable');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpdateStatus = async (status: 'open' | 'handed_off' | 'closed') => {
    if (!selectedConversation) return;
    setStatusUpdating(true);
    try {
      await chatApi.updateStatus(selectedConversation, status);
      await loadConversations(1, false);
      toast.success(
        status === 'closed' ? 'Conversation fermée' : 'Conversation ré-ouverte',
      );
    } catch (error) {
      console.error(error);
      toast.error('Impossible de mettre à jour le statut');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleCopyConversationLink = async () => {
    if (!selectedConversation) return;
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('conversationId', selectedConversation);
    await navigator.clipboard.writeText(url.toString());
    setCopiedConversationId(selectedConversation);
    toast.success('Lien de conversation copié');
    setTimeout(() => {
      setCopiedConversationId(null);
    }, 3000);
  };

  const handleSelectConversation = async (id: string) => {
    const convo = conversations.find((c) => c.id === id);
    if (convo) {
      setSelectedAgent(convo.agentId);
    }
    setSelectedConversation(id);
    setConversationId(id);
    setMessages([]);
    await loadHistory(id);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent || sending) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);
    try {
      const data = await chatApi.send({
        agentId: selectedAgent,
        message: userMsg,
        conversationId,
        captureLead,
      });
      setConversationId(data.conversationId);
      setSelectedConversation(data.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      await loadConversations(1, false);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "⚠️ Erreur — vérifiez qu'Ollama est démarré." },
      ]);
      toast.error("Échec de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = () => {
    setConversationId(undefined);
    setSelectedConversation(null);
    setMessages([]);
    setSelectedLeadToAttach('');
  };

  const getAgentName = (agentId: string) => agents.find((a) => a.id === agentId)?.name || 'Agent';

  const formatConversationDate = (date: string) =>
    new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const ConversationSkeleton = () => (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="h-16 rounded-xl bg-gray-100" />
      ))}
    </div>
  );

  const selectedConversationData = useMemo(
    () => conversations.find((c) => c.id === selectedConversation),
    [conversations, selectedConversation],
  );

  const leadInfo = selectedConversationData?.lead;

  const filtersAreDefault = useMemo(() => {
    return (
      conversationFilters.status === DEFAULT_FILTERS.status &&
      conversationFilters.agentId === DEFAULT_FILTERS.agentId &&
      conversationFilters.leadStatus === DEFAULT_FILTERS.leadStatus &&
      conversationFilters.hasLead === DEFAULT_FILTERS.hasLead
    );
  }, [conversationFilters]);

  const resetFilters = () => {
    setConversationFilters({ ...DEFAULT_FILTERS });
  };

  const totalConversationsLabel = conversationMeta.total ?? conversations.length;
  const hasMoreConversations = conversationMeta.hasMore;

  const isConversationClosed = selectedConversationData?.status === 'closed';
  const isHandedOff = selectedConversationData?.status === 'handed_off';

  const leadStatusStyle = (status?: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-50 text-blue-700';
      case 'contacted':
        return 'bg-amber-50 text-amber-700';
      case 'qualified':
        return 'bg-emerald-50 text-emerald-700';
      case 'converted':
        return 'bg-green-100 text-green-700';
      case 'lost':
        return 'bg-rose-50 text-rose-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const openLeadDetails = () => {
    if (!leadInfo?.id) return;
    router.push(`/dashboard/leads?leadId=${leadInfo.id}`);
  };

  const handleAttachLead = async () => {
    if (!selectedConversation || !selectedLeadToAttach) return;
    setAttachingLead(true);
    try {
      await chatApi.attachLead(selectedConversation, selectedLeadToAttach);
      toast.success('Lead associé à la conversation');
      setSelectedLeadToAttach('');
      await loadConversations(1, false);
      await loadHistory(selectedConversation);
    } catch (error) {
      console.error(error);
      toast.error("Impossible d'associer le lead");
    } finally {
      setAttachingLead(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test des agents</h1>
          <p className="text-gray-500 text-sm mt-1">Discutez avec vos agents en temps réel</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input w-52"
            value={selectedAgent}
            onChange={(e) => {
              setSelectedAgent(e.target.value);
              handleNewConversation();
            }}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button onClick={handleNewConversation} className="btn-secondary text-sm">
            Nouvelle conv.
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        <aside className="w-72 card p-4 flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Conversations</p>
              <p className="text-xs text-gray-400">{totalConversationsLabel} suivies</p>
            </div>
            <button
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-primary-200 transition-colors"
              onClick={() => loadConversations(1, false)}
              aria-label="Rafraîchir"
            >
              <RefreshCw className={clsx('w-4 h-4', { 'animate-spin': loadingConversations })} />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={captureLead}
                onChange={(e) => setCaptureLead(e.target.checked)}
                className="rounded border-gray-300"
              />
              Capturer automatiquement les leads
            </label>
          </div>

          <div className="mt-4 space-y-3 text-xs text-gray-500">
            <div className="flex items-center justify-between uppercase tracking-wide">
              <span>Filtres</span>
              <button
                className={clsx('text-primary-600 transition-colors disabled:text-gray-300')}
                disabled={filtersAreDefault}
                onClick={resetFilters}
              >
                Réinitialiser
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map(({ label, value }) => (
                <button
                  key={value}
                  className={clsx(
                    'px-3 py-1 rounded-full border text-[11px] font-medium transition-colors',
                    conversationFilters.status === value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:border-primary-200',
                  )}
                  onClick={() =>
                    setConversationFilters((prev) => ({
                      ...prev,
                      status: value,
                    }))
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              className="input text-xs"
              value={conversationFilters.agentId}
              onChange={(e) =>
                setConversationFilters((prev) => ({
                  ...prev,
                  agentId: e.target.value,
                }))
              }
            >
              <option value="all">Tous les agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <select
              className="input text-xs"
              value={conversationFilters.leadStatus}
              onChange={(e) =>
                setConversationFilters((prev) => ({
                  ...prev,
                  leadStatus: e.target.value as ConversationFilters['leadStatus'],
                }))
              }
            >
              {LEAD_STATUS_OPTIONS.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="input text-xs"
              value={conversationFilters.hasLead}
              onChange={(e) =>
                setConversationFilters((prev) => ({
                  ...prev,
                  hasLead: e.target.value as ConversationFilters['hasLead'],
                }))
              }
            >
              {HAS_LEAD_FILTERS.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div
            ref={conversationListRef}
            className="mt-4 flex-1 overflow-y-auto space-y-3 border-t border-gray-50 pt-4"
          >
            {loadingConversations ? (
              <ConversationSkeleton />
            ) : conversations.length === 0 ? (
              <div className="text-center text-gray-400 text-sm mt-12">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 text-gray-200" />
                Aucune conversation pour l’instant
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={clsx(
                    'w-full text-left border rounded-xl p-3 transition-all',
                    conv.id === selectedConversation
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-100 hover:border-primary-200',
                  )}
                >
                  <p className="text-sm font-semibold text-gray-900">{getAgentName(conv.agentId)}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    {conv.visitorId ? `Visiteur #${conv.visitorId}` : 'Widget Web'} ·
                    {formatConversationDate(conv.createdAt)}
                  </p>
                  {conv.lead && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className={clsx('px-2 py-1 rounded-full font-medium', leadStatusStyle(conv.lead.status))}>
                        Lead {conv.lead.status}
                      </span>
                      {conv.lead.metadata?.autoCaptured && (
                        <span className="text-gray-400">Auto</span>
                      )}
                    </div>
                  )}
                </button>
              ))
            )}
            {hasMoreConversations && !loadingConversations && (
              <div ref={loadMoreTriggerRef} className="h-6" />
            )}
            {loadingMoreConversations && (
              <div className="text-center text-xs text-gray-400 py-2">Chargement…</div>
            )}
          </div>
        </aside>

        <section className="flex-1 flex flex-col gap-4 min-h-0">
          {selectedConversationData && (
            <div className="card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Conversation #{selectedConversationData.id.slice(0, 8)}</p>
                  <p className="text-base font-semibold text-gray-900">
                    {getAgentName(selectedConversationData.agentId)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    {selectedConversationData.visitorId ? `Visiteur ${selectedConversationData.visitorId}` : 'Widget web'}
                  </div>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wide',
                      selectedConversationData.status === 'open'
                        ? 'bg-emerald-50 text-emerald-600'
                        : selectedConversationData.status === 'handed_off'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-gray-200 text-gray-600',
                    )}
                  >
                    {selectedConversationData.status === 'open'
                      ? 'Ouverte'
                      : selectedConversationData.status === 'handed_off'
                      ? 'Transférée'
                      : 'Clôturée'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  className={clsx(
                    'btn-secondary text-xs flex items-center gap-1',
                    statusUpdating && 'opacity-70 pointer-events-none',
                  )}
                  onClick={() => handleUpdateStatus(isConversationClosed ? 'open' : 'closed')}
                  disabled={statusUpdating}
                >
                  {isConversationClosed ? 'Ré-ouvrir' : 'Clôturer'}
                </button>
                <button
                  className="btn-tertiary text-xs flex items-center gap-1"
                  onClick={handleCopyConversationLink}
                >
                  {copiedConversationId === selectedConversation ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Copié
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copier le lien
                    </>
                  )}
                </button>
              </div>

              {leadInfo ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', leadStatusStyle(leadInfo.status))}>
                    Lead {leadInfo.status}
                  </span>
                  <span className="text-sm text-gray-600">
                    {leadInfo.email || leadInfo.phone || 'Coordonnées inconnues'}
                  </span>
                  {leadInfo.metadata?.autoCaptured && (
                    <span className="text-xs text-gray-400">Capturé automatiquement</span>
                  )}
                  <button
                    onClick={openLeadDetails}
                    className="btn-secondary text-xs flex items-center gap-1"
                  >
                    Ouvrir le lead <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-gray-500">Aucun lead associé.</span>
                  <select
                    className="input w-48 text-sm"
                    value={selectedLeadToAttach}
                    onChange={(e) => setSelectedLeadToAttach(e.target.value)}
                  >
                    <option value="">Choisir un lead</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.name || lead.email || lead.phone || lead.id.slice(0, 6)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAttachLead}
                    disabled={!selectedLeadToAttach || attachingLead}
                    className="btn-primary text-xs"
                  >
                    {attachingLead ? 'Association...' : 'Associer ce lead'}
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex-1 card overflow-y-auto p-4 space-y-4 min-h-0 relative">
            {loadingHistory && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center text-sm text-gray-500">
                Chargement de l’historique…
              </div>
            )}
            {messages.length === 0 && !loadingHistory && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bot className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm">Sélectionnez une conversation ou envoyez un message</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={clsx('flex items-start gap-3', msg.role === 'user' && 'flex-row-reverse')}>
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    msg.role === 'user' ? 'bg-primary-600' : 'bg-gray-200',
                  )}
                >
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div
                  className={clsx(
                    'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm',
                  )}
                >
                  {msg.content}
                  {msg.role === 'assistant' && selectedConversation && (
                    <button
                      onClick={() => {
                        const corrected = prompt('Corrigez la réponse de l\'agent. Cette correction sera apprise par l\'IA:', msg.content);
                        if (corrected && corrected.trim() !== msg.content) {
                          const prevMsg = messages[i - 1];
                          chatApi.feedback({
                            agentId: selectedAgent || agents[0]?.id || '',
                            userMessage: prevMsg?.content || '',
                            originalReply: msg.content,
                            correctedReply: corrected.trim(),
                          }).then(() => toast.success('Correction enregistrée. L\'agent apprendra de cette erreur.'))
                            .catch(() => toast.error('Erreur lors de l\'enregistrement'));
                        }
                      }}
                      className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600"
                    >
                      <Pencil className="w-3 h-3" /> Corriger
                    </button>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <span className="text-gray-400 text-sm">En train de répondre...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {isHandedOff && (
            <div className="card p-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border-amber-100">
              <Info className="w-4 h-4 flex-shrink-0" />
              Cette conversation a été transférée à un agent humain.
            </div>
          )}

          {messages.length === 0 && !loadingHistory && selectedAgent && (
            <div className="flex flex-wrap gap-2 px-1">
              {(['Bonjour, j\'aimerais des informations', 'Quels sont vos tarifs ?', 'Je souhaite être contacté', '/help'] as string[]).map((ice) => (
                <button
                  key={ice}
                  onClick={() => setInput(ice)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs hover:border-primary-200 hover:text-primary-700 transition-colors"
                >
                  {ice}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 flex-shrink-0">
            <textarea
              className="input flex-1 resize-none"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écrivez votre message... (/help pour les commandes)"
              disabled={!selectedAgent || sending || isHandedOff}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !selectedAgent || sending || isHandedOff}
              className="btn-primary px-5 self-end"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
