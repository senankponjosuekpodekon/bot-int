'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Send, Loader2, MessageCircle, ArrowLeft } from 'lucide-react';
import Markdown from '@/components/Markdown';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getUtmParams() {
  if (typeof window === 'undefined') return {};
  const params: any = {};
  const sp = new URLSearchParams(window.location.search);
  ['source', 'medium', 'campaign', 'term', 'content'].forEach((k) => {
    const v = sp.get('utm_' + k);
    if (v) params[k] = v;
  });
  return params;
}

interface Msg {
  role: 'user' | 'agent';
  text: string;
  products?: any[];
}

export default function PublicChatPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('stiamond_visitor_id');
      if (!id) {
        id = 'v_' + Math.random().toString(36).substring(2, 12);
        localStorage.setItem('stiamond_visitor_id', id);
      }
      return id;
    }
    return 'v_anonymous';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/widget/config/${agentId}`)
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        const fromQuery = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('conversationId') : null;
        const saved = fromQuery || (typeof window !== 'undefined' ? localStorage.getItem(`stiamond_conversation_${agentId}`) : null);
        if (saved) {
          if (fromQuery && typeof window !== 'undefined') {
            localStorage.setItem(`stiamond_conversation_${agentId}`, saved);
          }
          setConversationId(saved);
          fetch(`${API_BASE}/widget/history/${saved}`)
            .then((r) => r.json())
            .then((history: any[]) => {
              const historyMessages = (history || [])
                .filter((m) => m.role === 'user' || m.role === 'assistant')
                .map((m) => ({ role: m.role === 'user' ? 'user' : 'agent' as 'user' | 'agent', text: m.content }));
              setMessages(historyMessages.length > 0 ? historyMessages : [{ role: 'agent' as const, text: data.iceBreakers?.[0] || `Bonjour ! Je suis ${data.name}. Comment puis-je vous aider ?` }]);
              setLoading(false);
            })
            .catch(() => setLoading(false));
        } else {
          const initial = data.iceBreakers?.[0] || `Bonjour ! Je suis ${data.name}. Comment puis-je vous aider ?`;
          setMessages([{ role: 'agent' as const, text: initial }]);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [agentId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/widget/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, message: text, visitorId, conversationId: conversationId || undefined, utmParams: getUtmParams(), referrerUrl: typeof window !== 'undefined' ? document.referrer : '', landingPageUrl: typeof window !== 'undefined' ? window.location.href : '' }),
      });
      const data = await res.json();
      if (data.conversationId) {
        setConversationId(data.conversationId);
        if (typeof window !== 'undefined') localStorage.setItem(`stiamond_conversation_${agentId}`, data.conversationId);
      }
      setMessages((m) => [...m, { role: 'agent', text: data.reply, products: data.products }]);
    } catch {
      setMessages((m) => [...m, { role: 'agent', text: 'Désolé, une erreur est survenue. Réessayez dans un instant.' }]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  const primaryColor = config?.personalityConfig?.primaryColor || '#6366f1';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </a>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: primaryColor }}>
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 text-sm">{config?.name || 'Assistant'}</h1>
            <p className="text-xs text-green-500">● En ligne</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                }`}
                style={msg.role === 'user' ? { background: primaryColor } : {}}
              >
                {msg.role === 'agent' ? (
                  <div className="text-sm">
                    <Markdown content={msg.text} />
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                )}
                {msg.products && msg.products.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                    {msg.products.map((p: any) => (
                      <a
                        key={p.id}
                        href={p.productUrl || p.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 w-32 bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {p.imageUrl && (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-20 object-cover" />
                        )}
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.price}{p.currency || '€'}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Écrivez votre message..."
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-sm focus:border-primary-500 outline-none"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
            style={{ background: primaryColor }}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
