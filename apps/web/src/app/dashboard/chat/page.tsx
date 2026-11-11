'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { agentsApi, chatApi, leadsApi } from '@/lib/api';
import { Send, Bot, User, RefreshCw, MessageSquare, ArrowUpRight, Info, Copy, CheckCircle2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useUiLocale } from '@/lib/ui-locale';
import Markdown from '@/components/Markdown';

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
  { label: 'chat.filter.all', value: 'all' },
  { label: 'chat.filter.open', value: 'open' },
  { label: 'chat.filter.handedOff', value: 'handed_off' },
  { label: 'chat.filter.closed', value: 'closed' },
];

const HAS_LEAD_FILTERS: Array<{ label: string; value: ConversationFilters['hasLead'] }> = [
  { label: 'chat.hasLead.all', value: 'all' },
  { label: 'chat.hasLead.with', value: 'with' },
  { label: 'chat.hasLead.without', value: 'without' },
];

const LEAD_STATUS_OPTIONS: Array<{ label: string; value: ConversationFilters['leadStatus'] }> = [
  { label: 'chat.leadStatus.all', value: 'all' },
  { label: 'chat.leadStatus.new', value: 'new' },
  { label: 'chat.leadStatus.contacted', value: 'contacted' },
  { label: 'chat.leadStatus.qualified', value: 'qualified' },
  { label: 'chat.leadStatus.converted', value: 'converted' },
  { label: 'chat.leadStatus.lost', value: 'lost' },
];

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface ConversationsPage {
  data: any[];
  meta: { total?: number; page: number; limit: number; hasMore: boolean };
}

export default function ChatPage() {
  const { t, locale } = useUiLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [captureLead, setCaptureLead] = useState(true);
  const [selectedLeadToAttach, setSelectedLeadToAttach] = useState('');
  const [copiedConversationId, setCopiedConversationId] = useState<string | null>(null);
  const [conversationFilters, setConversationFilters] = useState<ConversationFilters>({
    ...DEFAULT_FILTERS,
  });
  const [pendingDeepLinkId, setPendingDeepLinkId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversationListRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const { data: agents = [] } = useQuery<any[]>({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list().then((res: any) => res.data || res),
  });
  const leadsQuery = useQuery<any[]>({
    queryKey: ['leads'],
    queryFn: () =>
      leadsApi.list().then((res: any) => (Array.isArray(res) ? res : res?.data ?? [])),
  });
  const leads = leadsQuery.data ?? [];

  const conversationsQuery = useInfiniteQuery({
    queryKey: ['conversations', conversationFilters],
    queryFn: async ({ pageParam }): Promise<ConversationsPage> => {
      const params: Record<string, any> = { page: pageParam, limit: CONVERSATION_PAGE_SIZE };
      if (conversationFilters.status !== 'all') params.status = conversationFilters.status;
      if (conversationFilters.agentId !== 'all') params.agentId = conversationFilters.agentId;
      if (conversationFilters.leadStatus !== 'all') params.leadStatus = conversationFilters.leadStatus;
      if (conversationFilters.hasLead !== 'all') {
        params.hasLead = conversationFilters.hasLead === 'with';
      }
      const response = await chatApi.conversations(params);
      const payload = Array.isArray(response) ? { data: response } : response;
      const incoming = Array.isArray(payload?.data) ? payload.data : [];
      const meta = payload?.meta ?? {};
      return {
        data: incoming,
        meta: {
          total: meta.total,
          page: meta.page ?? pageParam,
          limit: meta.limit ?? CONVERSATION_PAGE_SIZE,
          hasMore: meta.hasMore ?? incoming.length === CONVERSATION_PAGE_SIZE,
        },
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined),
  });

  const conversations = useMemo(() => {
    const pages = conversationsQuery.data?.pages ?? [];
    const seen = new Set<string>();
    const flat: any[] = [];
    for (const page of pages) {
      for (const c of page.data) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          flat.push(c);
        }
      }
    }
    return flat;
  }, [conversationsQuery.data]);

  const lastPageMeta =
    conversationsQuery.data?.pages?.[conversationsQuery.data.pages.length - 1]?.meta;
  const loadingConversations =
    conversationsQuery.isFetching && !conversationsQuery.isFetchingNextPage;
  const loadingMoreConversations = conversationsQuery.isFetchingNextPage;
  const hasMoreConversations = !!conversationsQuery.hasNextPage;
  const totalConversationsLabel = lastPageMeta?.total ?? conversations.length;

  const historyQuery = useQuery<any[]>({
    queryKey: ['chat', 'history', selectedConversation],
    queryFn: () =>
      chatApi
        .history(selectedConversation as string)
        .then((history) => (Array.isArray(history) ? history : history?.data ?? [])),
    enabled: !!selectedConversation,
    staleTime: 0,
  });
  const loadingHistory = historyQuery.isFetching;
  const historyData = historyQuery.data;

  const sendMessage = useMutation({
    mutationFn: (payload: {
      agentId: string;
      message: string;
      conversationId?: string;
      captureLead: boolean;
    }) => chatApi.send(payload),
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setSelectedConversation(data.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('chat.ollamaError') },
      ]);
      toast.error(t('chat.sendError'));
    },
  });
  const sending = sendMessage.isPending;

  const updateStatus = useMutation({
    mutationFn: (status: 'open' | 'handed_off' | 'closed') =>
      chatApi.updateStatus(selectedConversation as string, status),
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(
        status === 'closed' ? t('chat.closedToast') : t('chat.reopenedToast'),
      );
    },
    onError: () => toast.error(t('chat.statusUpdateError')),
  });
  const statusUpdating = updateStatus.isPending;

  const attachLead = useMutation({
    mutationFn: ({ conversationId, leadId }: { conversationId: string; leadId: string }) =>
      chatApi.attachLead(conversationId, leadId),
    onSuccess: () => {
      toast.success(t('chat.leadAttached'));
      setSelectedLeadToAttach('');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (selectedConversation) {
        queryClient.invalidateQueries({ queryKey: ['chat', 'history', selectedConversation] });
      }
    },
    onError: () => toast.error(t('chat.leadAttachError')),
  });
  const attachingLead = attachLead.isPending;

  const sendFeedback = useMutation({
    mutationFn: (data: {
      agentId: string;
      userMessage: string;
      originalReply: string;
      correctedReply: string;
    }) => chatApi.feedback(data),
    onSuccess: () =>
      toast.success(t('chat.feedbackSaved')),
    onError: () => toast.error(t('chat.feedbackError')),
  });

  useEffect(() => {
    if (!selectedAgent && agents.length > 0) setSelectedAgent(agents[0].id);
  }, [agents, selectedAgent]);

  useEffect(() => {
    if (leadsQuery.isError) toast.error(t('chat.leadsLoadError'));
  }, [leadsQuery.isError]);

  useEffect(() => {
    if (conversationsQuery.isError) toast.error(t('chat.conversationsLoadError'));
  }, [conversationsQuery.isError]);

  useEffect(() => {
    if (historyQuery.isError) toast.error(t('chat.conversationNotFound'));
  }, [historyQuery.isError]);

  // Sync loaded history into the local message list
  useEffect(() => {
    if (!selectedConversation || !historyData) return;
    setMessages(
      historyData.map((msg: any) => ({
        id: msg.id,
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
        createdAt: msg.createdAt,
      })),
    );
  }, [historyData, selectedConversation]);

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
          hasMoreConversations &&
          !loadingConversations &&
          !loadingMoreConversations
        ) {
          conversationsQuery.fetchNextPage();
        }
      },
      { root: scrollRoot, threshold: 0.2 },
    );
    observerRef.current.observe(sentinel);
    return () => observerRef.current?.disconnect();
  }, [hasMoreConversations, loadingConversations, loadingMoreConversations, conversationsQuery.fetchNextPage]);

  const handleUpdateStatus = (status: 'open' | 'handed_off' | 'closed') => {
    if (!selectedConversation) return;
    updateStatus.mutate(status);
  };

  const handleCopyConversationLink = async () => {
    if (!selectedConversation) return;
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('conversationId', selectedConversation);
    await navigator.clipboard.writeText(url.toString());
    setCopiedConversationId(selectedConversation);
    toast.success(t('chat.linkCopied'));
    setTimeout(() => {
      setCopiedConversationId(null);
    }, 3000);
  };

  const handleSelectConversation = (id: string) => {
    const convo = conversations.find((c) => c.id === id);
    if (convo) {
      setSelectedAgent(convo.agentId);
    }
    setSelectedConversation(id);
    setConversationId(id);
    setMessages([]);
  };

  const handleSend = () => {
    if (!input.trim() || !selectedAgent || sending) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    sendMessage.mutate({ agentId: selectedAgent, message: userMsg, conversationId, captureLead });
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
    new Date(date).toLocaleString(locale === 'en' ? 'en-US' : 'fr-FR', {
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

  const handleAttachLead = () => {
    if (!selectedConversation || !selectedLeadToAttach) return;
    attachLead.mutate({ conversationId: selectedConversation, leadId: selectedLeadToAttach });
  };

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('chat.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('chat.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input w-full sm:w-52"
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
            {t('chat.newConversation')}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-4 min-h-0">
        <aside className="w-full lg:w-72 card p-4 flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">{t('chat.conversations')}</p>
              <p className="text-xs text-gray-400">{totalConversationsLabel} {t('chat.tracked')}</p>
            </div>
            <button
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-primary-200 transition-colors"
              onClick={() => conversationsQuery.refetch()}
              aria-label={t('chat.refresh')}
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
              {t('chat.captureLeads')}
            </label>
          </div>

          <div className="mt-4 space-y-3 text-xs text-gray-500">
            <div className="flex items-center justify-between uppercase tracking-wide">
              <span>{t('chat.filters')}</span>
              <button
                className={clsx('text-primary-600 transition-colors disabled:text-gray-300')}
                disabled={filtersAreDefault}
                onClick={resetFilters}
              >
                {t('chat.reset')}
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
                  {t(label)}
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
              <option value="all">{t('chat.allAgents')}</option>
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
                  {t(label)}
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
                  {t(label)}
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
                {t('chat.emptyConversations')}
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
                    {conv.visitorId ? `${t('chat.visitor')} #${conv.visitorId}` : t('chat.widgetWeb')} ·
                    {formatConversationDate(conv.createdAt)}
                  </p>
                  {conv.lead && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className={clsx('px-2 py-1 rounded-full font-medium', leadStatusStyle(conv.lead.status))}>
                        {t('chat.lead')} {conv.lead.status}
                      </span>
                      {conv.lead.metadata?.autoCaptured && (
                        <span className="text-gray-400">{t('chat.auto')}</span>
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
              <div className="text-center text-xs text-gray-400 py-2">{t('common.loading')}</div>
            )}
          </div>
        </aside>

        <section className="flex-1 flex flex-col gap-4 min-h-0">
          {selectedConversationData && (
            <div className="card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('chat.conversation')} #{selectedConversationData.id.slice(0, 8)}</p>
                  <p className="text-base font-semibold text-gray-900">
                    {getAgentName(selectedConversationData.agentId)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    {selectedConversationData.visitorId ? `${t('chat.visitor')} ${selectedConversationData.visitorId}` : t('chat.widgetWeb')}
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
                      ? t('chat.status.open')
                      : selectedConversationData.status === 'handed_off'
                      ? t('chat.status.handedOff')
                      : t('chat.status.closed')}
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
                  {isConversationClosed ? t('chat.reopen') : t('chat.close')}
                </button>
                <button
                  className="btn-tertiary text-xs flex items-center gap-1"
                  onClick={handleCopyConversationLink}
                >
                  {copiedConversationId === selectedConversation ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> {t('chat.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> {t('chat.copyLink')}
                    </>
                  )}
                </button>
              </div>

              {leadInfo ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', leadStatusStyle(leadInfo.status))}>
                    {t('chat.lead')} {leadInfo.status}
                  </span>
                  <span className="text-sm text-gray-600">
                    {leadInfo.email || leadInfo.phone || t('chat.unknownContact')}
                  </span>
                  {leadInfo.metadata?.autoCaptured && (
                    <span className="text-xs text-gray-400">{t('chat.autoCaptured')}</span>
                  )}
                  <button
                    onClick={openLeadDetails}
                    className="btn-secondary text-xs flex items-center gap-1"
                  >
                    {t('chat.openLead')} <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-gray-500">{t('chat.noLead')}</span>
                  <select
                    className="input w-full sm:w-48 text-sm"
                    value={selectedLeadToAttach}
                    onChange={(e) => setSelectedLeadToAttach(e.target.value)}
                  >
                    <option value="">{t('chat.chooseLead')}</option>
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
                    {attachingLead ? t('chat.attaching') : t('chat.attachLead')}
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex-1 card overflow-y-auto p-4 space-y-4 min-h-0 relative">
            {loadingHistory && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center text-sm text-gray-500">
                {t('chat.loadingHistory')}
              </div>
            )}
            {messages.length === 0 && !loadingHistory && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bot className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm">{t('chat.emptyMessages')}</p>
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
                  data-testid={msg.role === 'assistant' ? 'assistant-message' : 'user-message'}
                  className={clsx(
                    'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm',
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <Markdown content={msg.content} />
                  ) : (
                    msg.content
                  )}
                  {msg.role === 'assistant' && selectedConversation && (
                    <button
                      onClick={() => {
                        const corrected = prompt(t('chat.correctPrompt'), msg.content);
                        if (corrected && corrected.trim() !== msg.content) {
                          const prevMsg = messages[i - 1];
                          sendFeedback.mutate({
                            agentId: selectedAgent || agents[0]?.id || '',
                            userMessage: prevMsg?.content || '',
                            originalReply: msg.content,
                            correctedReply: corrected.trim(),
                          });
                        }
                      }}
                      className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600"
                    >
                      <Pencil className="w-3 h-3" /> {t('chat.correct')}
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
                  <span className="text-gray-400 text-sm">{t('chat.responding')}</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {isHandedOff && (
            <div className="card p-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border-amber-100">
              <Info className="w-4 h-4 flex-shrink-0" />
              {t('chat.handedOffBanner')}
            </div>
          )}

          {messages.length === 0 && !loadingHistory && selectedAgent && (
            <div className="flex flex-wrap gap-2 px-1">
              {([t('chat.ice1'), t('chat.ice2'), t('chat.ice3'), '/help'] as string[]).map((ice) => (
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
              placeholder={t('chat.inputPlaceholder')}
              disabled={!selectedAgent || sending || isHandedOff}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !selectedAgent || sending || isHandedOff}
              className="btn-primary px-5 self-end"
              aria-label={t('chat.send')}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
