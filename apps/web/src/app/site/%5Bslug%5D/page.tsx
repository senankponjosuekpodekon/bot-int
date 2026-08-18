'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Send, Loader2, MessageCircle, Phone, Mail, MapPin, Clock, Globe, ShoppingBag, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { siteApi } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function PublicSitePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [site, setSite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('stiamond_visitor_id');
      if (!id) { id = 'v_' + Math.random().toString(36).substring(2, 12); localStorage.setItem('stiamond_visitor_id', id); }
      return id;
    }
    return 'v_anon';
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    siteApi.public.getBySlug(slug)
      .then((data) => {
        setSite(data);
        if (data.agentId) {
          fetch(`${API_BASE}/widget/config/${data.agentId}`)
            .then((r) => r.json())
            .then((cfg) => {
              if (cfg.iceBreakers?.length > 0) {
                setMessages([{ role: 'agent', text: cfg.iceBreakers[0] }]);
              } else {
                setMessages([{ role: 'agent', text: `Bonjour ! Bienvenue chez ${data.businessName}. Comment puis-je vous aider ?` }]);
              }
            });
        }
        setLoading(false);
      })
      .catch((err) => { setError(err.message || 'Site introuvable'); setLoading(false); });
  }, [slug]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const send = async () => {
    if (!input.trim() || sending || !site?.agentId) return;
    const text = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/widget/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: site.agentId, message: text, visitorId, conversationId: conversationId || undefined }),
      });
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: 'agent', text: data.reply, products: data.products }]);
    } catch {
      setMessages((m) => [...m, { role: 'agent', text: 'Désolé, une erreur est survenue.' }]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 text-primary-600 animate-spin" /></div>;
  }

  if (error || !site) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Site introuvable</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  const theme = site.theme || {};
  const primary = theme.primaryColor || '#6366f1';
  const secondary = theme.secondaryColor || '#8b5cf6';
  const bg = theme.backgroundColor || '#ffffff';
  const text = theme.textColor || '#1f2937';
  const sections = site.sections || {};
  const contact = site.contact || {};

  return (
    <div className="min-h-screen" style={{ background: bg, color: text }}>
      {/* Cover */}
      {site.coverImageUrl && (
        <div className="w-full h-48 md:h-64 bg-cover bg-center" style={{ backgroundImage: `url(${site.coverImageUrl})` }} />
      )}

      {/* Header */}
      <header className="border-b" style={{ borderColor: primary + '20' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          {site.logoUrl ? (
            <img src={site.logoUrl} alt={site.businessName} className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: primary }}>
              <span className="text-white font-bold text-lg">{site.businessName?.[0] || 'B'}</span>
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold">{site.businessName}</h1>
            {site.tagline && <p className="text-sm opacity-60">{site.tagline}</p>}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* About */}
        {sections.showAbout && site.aboutText && (
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: primary }}>À propos</h2>
            <p className="text-sm leading-relaxed opacity-80">{site.aboutText}</p>
          </section>
        )}

        {/* Products */}
        {sections.showProducts && site.products?.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: primary }}>
              <ShoppingBag className="w-5 h-5" /> Nos produits
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {site.products.map((p: any) => (
                <a
                  key={p.id}
                  href={p.productUrl || p.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow bg-white"
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center" style={{ background: primary + '10' }}>
                      <ShoppingBag className="w-8 h-8" style={{ color: primary }} />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-bold" style={{ color: primary }}>{p.price}{p.currency || '€'}</span>
                      {p.stock !== undefined && p.stock > 0 && (
                        <span className="text-xs text-green-500">En stock</span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {sections.showFAQ && site.faqs?.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4" style={{ color: primary }}>Questions fréquentes</h2>
            <div className="space-y-2">
              {site.faqs.map((faq: any, i: number) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-medium">{faq.question}</span>
                    {openFaq === i ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-3 text-sm opacity-70">{faq.answer}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact + Hours */}
        {(sections.showContact || sections.showHours) && (
          <section>
            <h2 className="text-lg font-bold mb-4" style={{ color: primary }}>Contact & Horaires</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {sections.showContact && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm hover:opacity-70">
                      <Mail className="w-4 h-4" style={{ color: primary }} /> {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-sm hover:opacity-70">
                      <Phone className="w-4 h-4" style={{ color: primary }} /> {contact.phone}
                    </a>
                  )}
                  {contact.address && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4" style={{ color: primary }} /> {contact.address}
                    </div>
                  )}
                </div>
              )}
              {sections.showHours && contact.hours && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3 text-sm mb-2">
                    <Clock className="w-4 h-4" style={{ color: primary }} /> Horaires
                  </div>
                  <p className="text-sm opacity-70 whitespace-pre-wrap">{contact.hours}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Social */}
        {sections.showSocial && site.socialLinks?.length > 0 && (
          <section>
            <div className="flex gap-3">
              {site.socialLinks.map((s: any, i: number) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white hover:opacity-80"
                  style={{ background: secondary }}>
                  <Globe className="w-4 h-4" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Chat */}
        {sections.showChat && site.agentId && (
          <section>
            <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2" style={{ background: primary }}>
                <MessageCircle className="w-5 h-5 text-white" />
                <h2 className="text-white font-semibold text-sm">Discutez avec nous</h2>
              </div>

              {/* Messages */}
              <div className="h-80 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        msg.role === 'user' ? 'text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}
                      style={msg.role === 'user' ? { background: primary } : {}}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      {msg.products?.length > 0 && (
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                          {msg.products.map((p: any) => (
                            <a key={p.id} href={p.productUrl || p.url || '#'} target="_blank" rel="noopener noreferrer"
                              className="flex-shrink-0 w-24 bg-white rounded-lg border border-gray-200 overflow-hidden">
                              {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-14 object-cover" />}
                              <div className="p-1.5">
                                <p className="text-xs font-medium truncate">{p.name}</p>
                                <p className="text-xs opacity-60">{p.price}{p.currency || '€'}</p>
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
                    <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-100 px-3 py-3 flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Écrivez..."
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary-500 outline-none"
                />
                <button onClick={send} disabled={sending || !input.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
                  style={{ background: primary }}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t py-6 mt-8" style={{ borderColor: primary + '20' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs opacity-50">© {new Date().getFullYear()} {site.businessName}. Propulsé par Stiamond.</p>
        </div>
      </footer>
    </div>
  );
}
