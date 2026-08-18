'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot, MessageSquare, BarChart3, Globe, Zap, Shield, Brain, TrendingUp,
  Users, Package, Clock, Target, Filter, Radio, Check, ArrowRight, Star,
  Sparkles, Code2, Phone, Mail, MapPin, ChevronDown, Server,
  Stethoscope, Home, ShoppingBag, Briefcase, X, Building2
} from 'lucide-react';
import { useCurrency } from '@/components/CurrencyProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

export default function LandingPageDE() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { currency, formatPrice, formatOverage } = useCurrency();

  const features = [
    { icon: Bot, title: 'Autonome KI-Agenten', desc: 'Erstellen Sie Agenten, die qualifizieren, empfehlen, buchen und verkaufen — keine bloßen Chatbots.' },
    { icon: Filter, title: 'Natives Funnel-Tracking', desc: 'Awareness → Interest → Qualification → Decision. Verfolgen Sie jede Konversation im Conversion-Funnel.' },
    { icon: Radio, title: 'Multi-Channel-Attribution', desc: 'UTM, Meta Ads, Google Ads, QR-Codes, Landingpages. Wissen Sie genau, woher Ihre besten Leads kommen.' },
    { icon: Brain, title: 'Langzeitgedächtnis', desc: 'Der Agent erkennt wiederkehrende Besucher und personalisiert die Begrüßung basierend auf dem Verlauf.' },
    { icon: TrendingUp, title: 'Intent-Scoring', desc: 'Echtzeit-Intent-Score (0-100), der sich mit jeder Nachricht aufbaut.' },
    { icon: Globe, title: 'Integrierte Landingpages', desc: 'Auto-generierter Storefront mit eingebettetem Chat. Custom Domain unterstützt.' },
    { icon: BarChart3, title: 'ROI-Analytics', desc: 'Conversion nach Kanal, Kosten pro qualifiziertem Lead, durch Agent beeinflusster Umsatz.' },
    { icon: Shield, title: 'Kanal-Agnostisch', desc: 'Web-Chat, E-Mail, SMS, Telegram, WhatsApp (optional). Keine Meta-Abhängigkeit.' },
  ];

  const planPrices: Record<string, { monthly: number; yearly: number; overageCents: number }> = {
    Free: { monthly: 0, yearly: 0, overageCents: 0 },
    Starter: { monthly: 49, yearly: 39, overageCents: 8 },
    Growth: { monthly: 149, yearly: 119, overageCents: 5 },
    Scale: { monthly: 399, yearly: 319, overageCents: 3 },
  };

  const plans = [
    {
      name: 'Free',
      desc: 'Zum Testen und Ausprobieren',
      features: ['1 KI-Agent', '50 Konversationen/Monat', 'Web-Chat', 'Funnel-Tracking', '1 Landingpage'],
      cta: 'Kostenlos starten',
      highlight: false,
      overage: null,
    },
    {
      name: 'Starter',
      desc: 'Für Solo-Unternehmer und Kleinbetriebe',
      features: ['3 KI-Agenten', '1.000 Konversationen/Monat', 'Web-Chat + E-Mail', 'Funnel-Tracking', 'Landingpage', 'E-Mail-Support'],
      cta: '14 Tage testen',
      highlight: false,
      overage: planPrices.Starter,
    },
    {
      name: 'Growth',
      desc: 'Für wachsende KMU',
      features: ['Unbegrenzte Agenten', '5.000 Konversationen/Monat', 'Multi-Channel (SMS, Telegram)', 'Akquisitions-Analytics', 'Custom Domain', 'API-Zugriff', 'Stripe + Calendly'],
      cta: '14 Tage testen',
      highlight: true,
      overage: planPrices.Growth,
    },
    {
      name: 'Scale',
      desc: 'Für mittelständische Teams',
      features: ['Alles aus Growth +', '20.000 Konversationen/Monat', 'MCP Server inklusive', 'Outcome-Tracking', 'White-Label', 'API + Webhooks', '99,9% SLA', 'Priority-Support'],
      cta: '14 Tage testen',
      highlight: false,
      overage: planPrices.Scale,
    },
    {
      name: 'Enterprise',
      desc: 'Für Großunternehmen & Agenturen',
      features: ['Custom-Volumen', 'Dedicated MCP', 'Outcome-basiertes Pricing', 'Vollständiges White-Label', 'Custom SLA', 'Dedicated Account Manager'],
      cta: 'Vertrieb kontaktieren',
      highlight: false,
      overage: null,
    },
  ];

  const stats = [
    { value: '42%', label: 'Visitor-to-qualified-lead Konversion' },
    { value: '<2s', label: 'Durchschn. KI-Antwortzeit' },
    { value: '6+', label: 'Kanäle (Web, E-Mail, SMS, Telegram, WhatsApp, API)' },
    { value: '8x', label: 'Günstiger als ein Junior-Vertriebler' },
  ];

  const getPriceDisplay = (plan: typeof plans[number]) => {
    if (plan.name === 'Enterprise') return 'Auf Anfrage';
    if (plan.name === 'Free') return formatPrice(0);
    const p = planPrices[plan.name];
    return formatPrice(billingCycle === 'monthly' ? p.monthly : p.yearly);
  };

  const getOverageDisplay = (plan: typeof plans[number]) => {
    if (!plan.overage) return null;
    return formatOverage(plan.overage.overageCents);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">Stiamond</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Funktionen</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Preise</a>
            <a href="#how" className="hover:text-gray-900 transition-colors">So funktioniert's</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher currentLocale="de" />
            <button onClick={() => router.push('/login')} className="text-sm font-medium text-gray-600 hover:text-gray-900">Anmelden</button>
            <button onClick={() => router.push('/register')} className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors">
              Gratis testen
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 text-sm font-semibold mb-6 animate-pulse">
            <Zap className="w-4 h-4" />
            Einführungsangebot: 14 Tage gratis + 50 Konversationen inklusive, keine Kreditkarte
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            Ihre KI-Agenten verkaufen, während Sie schlafen.
            <br />
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">42% Konversion. 0% Meta-Abhängigkeit.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Stiamond erstellt KI-Agenten, die Ihre Leads qualifizieren, Produkte empfehlen, Termine buchen und Verkäufe beeinflussen — über Web, E-Mail, SMS und Telegram.
            <span className="font-semibold text-gray-900"> Sie behalten die volle Kontrolle über Ihre Kanäle und Daten.</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-10 text-sm text-gray-600">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Keine Kreditkarte</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Setup in 5 Minuten</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Kündigung in 1 Klick</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> 100% Ihre Daten</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => router.push('/register')} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors shadow-lg shadow-indigo-200 text-lg">
              KI-Agent gratis erstellen <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3">
              Demo ansehen →
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            127+ Unternehmen vertrauen uns · 4,8/5 Bewertung · EU-gehostete Daten (DSGVO-konform)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1 max-w-[140px] mx-auto">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Product visual */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="bg-gray-900 rounded-2xl p-2 shadow-2xl shadow-indigo-200">
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-gray-400">stiamond.com/dashboard</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Konversationen</p>
                    <p className="text-lg font-bold text-white">1.247</p>
                    <p className="text-xs text-green-400">+18% diese Woche</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Qualifizierte Leads</p>
                    <p className="text-lg font-bold text-white">523</p>
                    <p className="text-xs text-green-400">42% Rate</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Beeinflusster Umsatz</p>
                    <p className="text-lg font-bold text-white">48,2k€</p>
                    <p className="text-xs text-green-400">+32% MoM</p>
                  </div>
                </div>
                <div className="mt-3 bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">Funnel-Verteilung</p>
                    <p className="text-xs text-indigo-400">Awareness → Decision</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-6 bg-indigo-500 rounded-l flex items-center justify-center text-[10px] text-white font-bold" style={{ width: '100%' }}>A</div>
                    <div className="h-6 bg-indigo-400 flex items-center justify-center text-[10px] text-white font-bold" style={{ width: '72%' }}>I</div>
                    <div className="h-6 bg-indigo-300 flex items-center justify-center text-[10px] text-white font-bold" style={{ width: '52%' }}>Q</div>
                    <div className="h-6 bg-indigo-200 flex items-center justify-center text-[10px] text-indigo-900 font-bold" style={{ width: '35%' }}>C</div>
                    <div className="h-6 bg-green-500 rounded-r flex items-center justify-center text-[10px] text-white font-bold" style={{ width: '22%' }}>D</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Alles, was Sie für verkaufsorientierte Konversationen brauchen</h2>
            <p className="text-lg text-gray-600">Kein Chatbot. Ein Agent, der handelt.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Für Ihre Branche entwickelt</h2>
            <p className="text-lg text-gray-600">Spezialisierte Agenten, die Ihr Geschäft verstehen.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Stethoscope, title: 'Ästhetikkliniken', desc: 'Patientenqualifizierung, Konsultationsbuchungen, Behandlungsempfehlungen. +35% Termine.', metric: '+35% Termine' },
              { icon: Home, title: 'Immobilien', desc: 'Objekt-Matching, Besichtigungsplanung, Lead-Scoring nach Budget und Dringlichkeit. ROI verdoppelt.', metric: 'ROI x2' },
              { icon: ShoppingBag, title: 'E-Commerce', desc: 'Warenkorbabbruch-Recovery, Produktempfehlungen, Bestellverfolgung via Chat. 40% Recovery.', metric: '40% Recovery' },
              { icon: Briefcase, title: 'B2B-Dienstleistungen', desc: 'Lead-Qualifizierung, automatisierte Angebote, Meeting-Planung, CRM-Sync. 3x schnellere Pipeline.', metric: '3x schneller' },
            ].map((u) => (
              <div key={u.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  <u.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{u.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{u.desc}</p>
                <span className="inline-block px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">{u.metric}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Warum Stiamond?</h2>
            <p className="text-lg text-gray-600">Kein Chatbot. Kein Mensch. Etwas Besseres.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Funktion</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-500">Chatbot</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-500">Vertriebler</th>
                  <th className="text-center py-4 px-4 font-bold text-indigo-600 bg-indigo-50 rounded-t-xl">Stiamond</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feat: '24/7 verfügbar', chatbot: true, human: false, stiamond: true },
                  { feat: 'Qualifiziert Leads automatisch', chatbot: false, human: true, stiamond: true },
                  { feat: 'Funnel-Tracking & Attribution', chatbot: false, human: false, stiamond: true },
                  { feat: 'Empfiehlt Produkte', chatbot: false, human: true, stiamond: true },
                  { feat: 'Sendet Angebote & Zahlungslinks', chatbot: false, human: true, stiamond: true },
                  { feat: 'Bucht Termine', chatbot: false, human: true, stiamond: true },
                  { feat: 'Multi-Channel (Web, E-Mail, SMS, Telegram)', chatbot: false, human: true, stiamond: true },
                  { feat: 'Langzeitgedächtnis', chatbot: false, human: true, stiamond: true },
                  { feat: 'Kosten pro Monat', chatbot: '10-50€', human: '3.000€+', stiamond: '49-399€' },
                  { feat: 'Skaliert unendlich', chatbot: true, human: false, stiamond: true },
                ].map((row) => (
                  <tr key={row.feat} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-700 font-medium">{row.feat}</td>
                    <td className="py-3 px-4 text-center">
                      {typeof row.chatbot === 'boolean' ? (
                        row.chatbot ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-red-400 mx-auto" />
                      ) : <span className="text-gray-500">{row.chatbot}</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {typeof row.human === 'boolean' ? (
                        row.human ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-red-400 mx-auto" />
                      ) : <span className="text-gray-500">{row.human}</span>}
                    </td>
                    <td className="py-3 px-4 text-center bg-indigo-50">
                      {typeof row.stiamond === 'boolean' ? (
                        row.stiamond ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-red-400 mx-auto" />
                      ) : <span className="text-indigo-600 font-bold">{row.stiamond}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-6" itemScope itemType="https://schema.org/HowTo">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" itemProp="name">So funktioniert's</h2>
            <p className="text-lg text-gray-600" itemProp="description">Von der Anzeige zum Verkauf in 4 Schritten</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', icon: Radio, title: 'Anziehen', desc: 'Meta Ads, Google Ads, QR-Codes, Organic. Jeder Besucher wird mit seinem Quellkanal getrackt.', propName: 'Besucher anziehen' },
              { step: '2', icon: Bot, title: 'Qualifizieren', desc: 'Der KI-Agent stellt die richtigen Fragen, erkennt Budget, Dringlichkeit und Bedarf. Auto-Funnel-Stage.', propName: 'Automatisch qualifizieren' },
              { step: '3', icon: Target, title: 'Konvertieren', desc: 'Der Agent schlägt ein Angebot vor, sendet einen Stripe-Zahlungslink, bucht einen Calendly-Termin.', propName: 'Zu Umsatz konvertieren' },
              { step: '4', icon: BarChart3, title: 'Messen', desc: 'ROI nach Kanal, Conversion-Rate pro Funnel-Stage, durch Agent beeinflusster Umsatz. Optimieren.', propName: 'Messen und optimieren' },
            ].map((s) => (
              <div key={s.step} className="relative" itemProp="step" itemScope itemType="https://schema.org/HowToStep">
                <meta itemProp="position" content={s.step} />
                <meta itemProp="name" content={s.propName} />
                <meta itemProp="text" content={s.desc} />
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center mb-4">
                  {s.step}
                </div>
                <s.icon className="w-6 h-6 text-indigo-500 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Einfache, transparente Preise</h2>
            <p className="text-lg text-gray-600">Keine Pro-Konversation-Gebühren. Keine Plattform-Bindung.</p>
          </div>
          <div className="flex items-center justify-center gap-4 mb-10">
            <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Monatlich</button>
            <button onClick={() => setBillingCycle('yearly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Jährlich <span className="text-xs opacity-75">(-20%)</span></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {plans.map((p) => (
              <div key={p.name} className={`bg-white rounded-2xl p-6 border-2 transition-all ${p.highlight ? 'border-indigo-600 shadow-xl shadow-indigo-100 lg:scale-105' : 'border-gray-100'}`}>
                {p.highlight && <div className="inline-block px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-medium mb-4">Beliebteste Wahl</div>}
                <h3 className="text-xl font-bold text-gray-900 mb-1">{p.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{p.desc}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  {p.name === 'Enterprise' ? (
                    <span className="text-3xl font-bold text-gray-900">Auf Anfrage</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-gray-900">{getPriceDisplay(p)}</span>
                      <span className="text-gray-500">/Mo</span>
                    </>
                  )}
                </div>
                {getOverageDisplay(p) && <p className="text-xs text-indigo-500 mb-4 font-medium">Overage: {getOverageDisplay(p)}</p>}
                <button onClick={() => router.push('/register')} className={`w-full py-3 rounded-xl font-semibold transition-colors mb-6 ${p.highlight ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>{p.cta}</button>
                <ul className="space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-8">Alle kostenpflichtigen Pläne inkludieren: 14 Tage Test, keine Kreditkarte. Overage wird über das inkludierte Volumen hinaus abgerechnet. Jederzeit kündbar.</p>
          <div className="flex flex-col items-center mt-12 gap-4">
            <div className="flex items-center gap-3 bg-green-50 rounded-2xl px-6 py-4">
              <Shield className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="text-left">
                <p className="font-bold text-gray-900">30 Tage Geld-zurück-Garantie</p>
                <p className="text-sm text-gray-600">Keine Ergebnisse? Volle Rückerstattung. Ohne Rückfragen.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center mt-6 gap-4">
            <div className="flex items-center gap-3 bg-blue-50 rounded-2xl px-6 py-4">
              <Server className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <p className="font-bold text-gray-900">EU-gehostet & DSGVO-konform</p>
                <p className="text-sm text-gray-600">Ihre Daten bleiben in der Europäischen Union. Tenant-isoliert, JWT-gesichert, DSGVO-konform. Perfekt für EU-Kunden.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Sie generieren Umsatz mit Stiamond</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Sophie M.', role: 'Ästhetikklinik, Paris', quote: 'Der Agent qualifiziert Patienten und bucht Konsultationen automatisch. +35% Termine in 3 Monaten.', metric: '+35% Termine' },
              { name: 'Karim B.', role: 'Immobilienagentur, Lyon', quote: 'Funnel-Tracking zeigte mir, dass meine Instagram Ads 3x besser konvertierten als Google. ROI verdoppelt.', metric: 'ROI x2' },
              { name: 'Elodie R.', role: 'Fashion E-Commerce, Bordeaux', quote: 'Der Agent recovered 40% der Warenkorbabbrüche via Chat. Performance-basiertes Pricing ist perfekt für uns.', metric: '40% Recovery' },
            ].map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-gray-700 mb-4 italic">"{t.quote}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                  <span className="text-sm font-bold text-indigo-600">{t.metric}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 bg-gray-50" itemScope itemType="https://schema.org/FAQPage">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Häufig gestellte Fragen</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: 'Hängt Stiamond von WhatsApp ab?', a: 'Nein. Stiamond ist kanal-agnostisch. Web-Chat, E-Mail, SMS, Telegram und WhatsApp optional. Sie behalten die volle Kontrolle.' },
              { q: 'Wie funktioniert der KI-Agent?', a: 'Der Agent nutzt ein LLM (Ollama lokal oder via API) mit Ihrer Wissensbasis, Ihrem Produktkatalog und Ihrer Persönlichkeit. Er qualifiziert, empfiehlt, bucht und verkauft.' },
              { q: 'Kann ich meine eigene Domain verwenden?', a: 'Ja. Jeder Plan inkludiert eine anpassbare Landingpage mit Subdomain. Growth+ unterstützt Custom Domains.' },
              { q: 'Was ist Funnel-Tracking?', a: 'Jede Konversation wird automatisch klassifiziert: Awareness → Interest → Qualification → Consideration → Decision. Sie sehen genau, wo Leads abbrechen.' },
              { q: 'Gibt es einen kostenlosen Plan?', a: 'Ja, der Free-Plan inkludiert 50 Konversationen/Monat mit 1 Agent. Keine Kreditkarte. Upgrade jederzeit.' },
              { q: 'Kann ich über die API verkaufen oder integrieren?', a: 'Ja. Der Growth-Plan inkludiert API-Zugriff mit sicheren API-Schlüsseln. Der Scale-Plan inkludiert MCP Server (Model Context Protocol) für Claude, Cursor oder jeden MCP-Client.' },
              { q: 'Was ist MCP?', a: 'Das Model Context Protocol ist der offene Standard zur Verbindung von KI-Agenten mit externen Tools. Stiamond stellt Ihre Agenten als MCP Server bereit.' },
              { q: 'Sind meine Daten sicher?', a: 'Ja. Ihre Daten sind tenant-isoliert, JWT-authentifiziert, Helmet-Header, Rate-Limiting, API-Schlüssel mit bcrypt gehasht. EU-gehostet, DSGVO-konform. Sie besitzen Ihre Daten.' },
            ].map((item) => (
              <details key={item.q} className="group bg-white rounded-xl border border-gray-100 p-5" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
                <meta itemProp="name" content={item.q} />
                <summary className="flex items-center justify-between cursor-pointer font-medium text-gray-900">
                  {item.q}
                  <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 text-sm text-gray-600" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
                  <span itemProp="text">{item.a}</span>
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Bereit, Umsatz durch Konversation zu generieren?</h2>
          <p className="text-lg text-indigo-100 mb-8">Starten Sie in 5 Minuten. Keine Kreditkarte.</p>
          <button onClick={() => router.push('/register')} className="inline-flex items-center gap-2 bg-white text-indigo-600 font-semibold px-8 py-4 rounded-xl hover:bg-indigo-50 transition-colors">
            Konto gratis erstellen <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* GEO content block */}
      <section className="py-16 px-6 bg-gray-900 text-gray-300">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Stiamond auf einen Blick</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm leading-relaxed">
            <div>
              <h3 className="text-white font-semibold mb-3">Was ist Stiamond?</h3>
              <p>Stiamond ist eine französische SaaS-Plattform für autonome konversationelle KI-Agenten, gegründet 2025. Sie ermöglicht KMU, Agenten zu erstellen, die Leads qualifizieren, Produkte empfehlen, Angebote generieren, Stripe-Zahlungslinks senden und Calendly-Termine buchen — über Web-Chat, E-Mail, SMS und Telegram. Im Gegensatz zu traditionellen Chatbots verfolgt Stiamond jede Konversation durch einen Conversion-Funnel (Awareness, Interest, Qualification, Consideration, Decision) und ordnet den Umsatz den Akquisitionskanälen zu.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Für wen?</h3>
              <p>Stiamond richtet sich an KMU und Unternehmer: Ästhetikkliniken (+35% Termine), Immobilienagenturen (ROI x2), E-Commerce (40% Warenkabbruch-Recovery), B2B-Dienstleistungen und Freiberufler. Die Plattform wird von 127+ Unternehmen mit einer Durchschnittsnote von 4,8/5 genutzt. Daten sind EU-gehostet (DSGVO-konform), tenant-isoliert, mit JWT-Authentifizierung und gehashten API-Schlüsseln.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Preise</h3>
              <p>Stiamond bietet 5 Pläne: Free (0€, 50 Konversationen/Monat), Starter (49€, 1.000 Konversationen), Growth (149€, 5.000 Konversationen + API), Scale (399€, 20.000 Konversationen + MCP Server), Enterprise (auf Anfrage). Overage wird über das inkludierte Volumen hinaus abgerechnet: 0,08€/Konversation auf Starter, 0,05€ auf Growth, 0,03€ auf Scale. 14 Tage gratis testen, keine Kreditkarte. 30 Tage Geld-zurück-Garantie.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Technologie</h3>
              <p>Tech-Stack: NestJS (Backend), TypeORM, PostgreSQL, Next.js 14 (Frontend), TailwindCSS, installierbare PWA. KI: LLM via Ollama (lokal) oder externe API, vektorisierte Wissensbasis. Integrationen: Stripe (Zahlungen), Calendly (Booking), SendGrid (E-Mail), Twilio (SMS), Telegram Bot API. MCP Server (Model Context Protocol) für Interoperabilität mit Claude, Cursor und jedem MCP-Client. REST API dokumentiert via Swagger/OpenAPI mit API-Schlüssel-Authentifizierung.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900">Stiamond</span>
              </div>
              <p className="text-sm text-gray-500">Das OS umsatzorientierter konversationeller Agenten.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Produkt</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-gray-900">Funktionen</a></li>
                <li><a href="#pricing" className="hover:text-gray-900">Preise</a></li>
                <li><a href="#how" className="hover:text-gray-900">So funktioniert's</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Unternehmen</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#use-cases" className="hover:text-gray-900">Anwendungsfälle</a></li>
                <li><a href="#faq" className="hover:text-gray-900">FAQ</a></li>
                <li><a href="/register" className="hover:text-gray-900">Loslegen</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Rechtliches</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="/terms" className="hover:text-gray-900">AGB</a></li>
                <li><a href="/privacy" className="hover:text-gray-900">Datenschutz</a></li>
                <li><a href="/gdpr" className="hover:text-gray-900">DSGVO</a></li>
              </ul>
            </div>
          </div>

          {/* Newsletter capture */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 p-6 bg-gray-50 rounded-2xl">
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900 text-sm">Auf dem Laufenden bleiben</p>
              <p className="text-xs text-gray-500">Produkt-Updates, KI-Verkaufstipps und Early Access zu neuen Funktionen.</p>
            </div>
            <form className="flex gap-2 w-full sm:w-auto" onSubmit={(e) => { e.preventDefault(); router.push('/register'); }}>
              <input type="email" required placeholder=" Sie@firma.de" className="px-4 py-2 rounded-lg border border-gray-200 text-sm flex-1 sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap">Abonnieren</button>
            </form>
          </div>

          <div className="pt-8 border-t border-gray-100 text-center text-sm text-gray-400">
            © 2026 Stiamond. Alle Rechte vorbehalten. Mit ❤️ für KMU gebaut.
          </div>
        </div>
      </footer>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white border-t border-gray-200 p-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-gray-500">14 Tage gratis · Keine Kreditkarte</p>
        </div>
        <button onClick={() => router.push('/register')} className="bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg whitespace-nowrap">
          Gratis starten →
        </button>
      </div>
      <div className="h-16 md:hidden" />
    </div>
  );
}
