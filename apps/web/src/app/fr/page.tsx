'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot, MessageSquare, BarChart3, Globe, Zap, Shield, Brain, TrendingUp,
  Users, Package, Clock, Target, Filter, Radio, Check, ArrowRight, Star,
  Sparkles, Code2, Phone, Mail, MapPin, ChevronDown, Server
} from 'lucide-react';
import { useCurrency } from '@/components/CurrencyProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

export default function LandingPageFR() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { currency, formatPrice, formatOverage } = useCurrency();

  const features = [
    { icon: Bot, title: 'Agents IA autonomes', desc: 'Créez des agents qui qualifient, recommandent, bookent et vendent — pas de simples chatbots.' },
    { icon: Filter, title: 'Funnel tracking natif', desc: 'Awareness → Interest → Qualification → Decision. Suivez chaque conversation dans le tunnel de conversion.' },
    { icon: Radio, title: 'Attribution multi-canal', desc: 'UTM, Meta Ads, Google Ads, QR codes, landing pages. Sachez exactement d\'où viennent vos meilleurs leads.' },
    { icon: Brain, title: 'Mémoire long-terme', desc: 'L\'agent reconnaît les visiteurs de retour et personnalise l\'accueil selon l\'historique.' },
    { icon: TrendingUp, title: 'Intent scoring', desc: 'Score d\'intention en temps réel (0-100) qui s\'accumule à chaque message.' },
    { icon: Globe, title: 'Landing pages intégrées', desc: 'Vitrine auto-générée avec chat intégré. Domaine personnalisé supporté.' },
    { icon: BarChart3, title: 'Analytics ROI', desc: 'Conversion par canal, coût par lead qualifié, revenus influencés par agent.' },
    { icon: Shield, title: 'Channel-agnostic', desc: 'Web chat, email, SMS, Telegram, WhatsApp (optionnel). Aucune dépendance à Meta.' },
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
      desc: 'Pour tester et adopter',
      features: ['1 agent IA', '50 conversations/mois', 'Web chat', 'Funnel tracking', '1 landing page'],
      cta: 'Commencer gratuitement',
      highlight: false,
      overage: null,
    },
    {
      name: 'Starter',
      desc: 'Pour les solopreneurs et TPE',
      features: ['3 agents IA', '1 000 conversations/mois', 'Web chat + email', 'Funnel tracking', 'Landing page', 'Support email'],
      cta: 'Essayer 14 jours',
      highlight: false,
      overage: planPrices.Starter,
    },
    {
      name: 'Growth',
      desc: 'Pour les PME en croissance',
      features: ['Agents illimités', '5 000 conversations/mois', 'Multi-canal (SMS, Telegram)', 'Acquisition analytics', 'Domaine personnalisé', 'API access', 'Stripe + Calendly'],
      cta: 'Essayer 14 jours',
      highlight: true,
      overage: planPrices.Growth,
    },
    {
      name: 'Scale',
      desc: 'Pour le mid-market',
      features: ['Tout Growth +', '20 000 conversations/mois', 'MCP Server inclus', 'Outcome tracking', 'White-label', 'API + webhooks', 'SLA 99.9%', 'Priority support'],
      cta: 'Essayer 14 jours',
      highlight: false,
      overage: planPrices.Scale,
    },
    {
      name: 'Enterprise',
      desc: 'Pour les grandes entreprises & agences',
      features: ['Volume custom', 'Dedicated MCP', 'Outcome-based pricing', 'White-label complet', 'SLA custom', 'Account manager dédié'],
      cta: 'Contacter',
      highlight: false,
      overage: null,
    },
  ];

  const stats = [
    { value: '42%', label: 'Taux de conversion moyen' },
    { value: '<2s', label: 'Temps de réponse IA' },
    { value: '6+', label: 'Canaux supportés' },
    { value: '0%', label: 'Dépendance Meta' },
  ];

  const getPriceDisplay = (plan: typeof plans[number]) => {
    if (plan.name === 'Enterprise') return 'Sur devis';
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
            <a href="#features" className="hover:text-gray-900 transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Tarifs</a>
            <a href="#how" className="hover:text-gray-900 transition-colors">Comment ça marche</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher currentLocale="fr" />
            <button onClick={() => router.push('/login')} className="text-sm font-medium text-gray-600 hover:text-gray-900">Connexion</button>
            <button onClick={() => router.push('/register')} className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors">
              Essai gratuit
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 text-sm font-semibold mb-6 animate-pulse">
            <Zap className="w-4 h-4" />
            Offre lancement : 14 jours gratuits + 50 conversations offertes sans CB
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            Vos agents IA vendent pendant que vous dormez.
            <br />
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">42% de conversion. 0% de dépendance Meta.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Stiamond crée des agents IA qui qualifient vos leads, recommandent vos produits, prennent des rendez-vous et influencent vos ventes — sur web, email, SMS et Telegram.
            <span className="font-semibold text-gray-900"> Vous gardez le contrôle total de vos canaux et de vos données.</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-10 text-sm text-gray-600">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Sans carte bancaire</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Setup en 5 minutes</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Annulation en 1 clic</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Données 100% à vous</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => router.push('/register')} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors shadow-lg shadow-indigo-200 text-lg">
              Créer mon agent gratuit <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3">
              Voir la démo →
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            Déjà 127+ entreprises nous font confiance · Note 4.8/5 · Données hébergées en UE (RGPD)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tout ce dont vous avez besoin pour vendre par la conversation</h2>
            <p className="text-lg text-gray-600">Pas un chatbot. Un agent qui agit.</p>
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

      {/* How it works */}
      <section id="how" className="py-20 px-6" itemScope itemType="https://schema.org/HowTo">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" itemProp="name">Comment ça marche</h2>
            <p className="text-lg text-gray-600" itemProp="description">De la pub à la vente en 4 étapes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', icon: Radio, title: 'Attirez', desc: 'Meta Ads, Google Ads, QR code, organique. Chaque visiteur est tracé avec son canal d\'origine.', propName: 'Attirez vos visiteurs' },
              { step: '2', icon: Bot, title: 'Qualifiez', desc: "L'agent IA pose les bonnes questions, détecte le budget, l'urgence, le besoin. Funnel stage auto.", propName: 'Qualifiez automatiquement' },
              { step: '3', icon: Target, title: 'Convertissez', desc: "L'agent propose un devis, envoie un lien de paiement Stripe, booke un RDV Calendly.", propName: 'Convertissez en revenus' },
              { step: '4', icon: BarChart3, title: 'Mesurez', desc: 'ROI par canal, taux de conversion par étape, revenus influencés par agent. Optimisez.', propName: 'Mesurez et optimisez' },
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
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tarifs simples, transparents</h2>
            <p className="text-lg text-gray-600">Pas de frais par conversation. Pas de dépendance plateforme.</p>
          </div>
          <div className="flex items-center justify-center gap-4 mb-10">
            <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Mensuel</button>
            <button onClick={() => setBillingCycle('yearly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Annuel <span className="text-xs opacity-75">(-20%)</span></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div key={p.name} className={`bg-white rounded-2xl p-8 border-2 transition-all ${p.highlight ? 'border-indigo-600 shadow-xl shadow-indigo-100 scale-105' : 'border-gray-100'}`}>
                {p.highlight && <div className="inline-block px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-medium mb-4">Le plus populaire</div>}
                <h3 className="text-xl font-bold text-gray-900 mb-1">{p.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{p.desc}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  {p.name === 'Enterprise' ? (
                    <span className="text-3xl font-bold text-gray-900">Sur devis</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-gray-900">{getPriceDisplay(p)}</span>
                      <span className="text-gray-500">/mois</span>
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
          <p className="text-center text-sm text-gray-500 mt-8">Tous les plans payants incluent : essai 14 jours, sans carte bancaire. Overage facturé au-delà du volume inclus. Annulation à tout moment.</p>
          <div className="flex flex-col items-center mt-12 gap-4">
            <div className="flex items-center gap-3 bg-green-50 rounded-2xl px-6 py-4">
              <Shield className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="text-left">
                <p className="font-bold text-gray-900">Garantie 30 jours satisfait ou remboursé</p>
                <p className="text-sm text-gray-600">Pas de résultats ? Vous êtes remboursé intégralement. Sans questions.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center mt-6 gap-4">
            <div className="flex items-center gap-3 bg-blue-50 rounded-2xl px-6 py-4">
              <Server className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <p className="font-bold text-gray-900">Hébergement UE & conforme RGPD</p>
                <p className="text-sm text-gray-600">Vos données restent dans l'Union Européenne. Isolées par tenant, sécurisées par JWT, conformes RGPD. Idéal pour servir vos clients européens en toute confiance.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Ils génèrent du revenu avec Stiamond</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Sophie M.', role: 'Clinique esthétique, Paris', quote: 'L\'agent qualifie les patients et booke les consultations automatiquement. +35% de RDV depuis 3 mois.', metric: '+35% RDV' },
              { name: 'Karim B.', role: 'Agence immobilière, Lyon', quote: 'Le funnel tracking m\'a montré que mes Ads Instagram convertissaient 3x mieux que Google. ROI x2.', metric: 'ROI x2' },
              { name: 'Élodie R.', role: 'E-commerce mode, Bordeaux', quote: 'L\'agent récupère 40% des paniers abandonnés via chat. Le pricing au résultat est parfait pour nous.', metric: '40% récup' },
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
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Questions fréquentes</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: 'Est-ce que ça dépend de WhatsApp ?', a: 'Non. Stiamond est channel-agnostic. Web chat, email, SMS, Telegram, et WhatsApp en option. Vous gardez le contrôle total.' },
              { q: 'Comment fonctionne l\'agent IA ?', a: 'L\'agent utilise un LLM (Ollama en local ou API) avec votre base de connaissances, catalogue produits et personnalité. Il qualifie, recommande, book et vend.' },
              { q: 'Puis-je utiliser mon propre domaine ?', a: 'Oui. Chaque plan inclut une landing page personnalisable avec sous-domaine. Growth+ supporte les domaines personnalisés.' },
              { q: 'Qu\'est-ce que le funnel tracking ?', a: 'Chaque conversation est automatiquement classée: Awareness → Interest → Qualification → Consideration → Decision. Vous voyez exactement où les leads décrochent.' },
              { q: 'Y a-t-il un plan gratuit ?', a: 'Oui, le plan Free inclut 50 conversations/mois avec 1 agent. Sans carte bancaire. Upgradez quand vous voulez.' },
              { q: 'Puis-je vendre ou intégrer l\'API ?', a: 'Oui. Le plan Growth inclut l\'API access avec clés API sécurisées. Le plan Scale inclut le MCP Server (Model Context Protocol) pour brancher vos agents sur Claude, Cursor, ou tout client MCP.' },
              { q: 'Qu\'est-ce que le MCP ?', a: 'Le Model Context Protocol est le standard ouvert pour connecter les agents IA à des outils externes. Stiamond expose vos agents comme MCP Server : n\'importe quel client MCP peut les appeler.' },
              { q: 'Mes données sont-elles sécurisées ?', a: 'Oui. Vos données sont isolées par tenant, JWT auth, Helmet headers, rate limiting, API keys hashées. Hébergées en UE, conformes RGPD. Vous êtes propriétaire de vos données.' },
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
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Prêt à générer du revenu par la conversation ?</h2>
          <p className="text-lg text-indigo-100 mb-8">Démarrez en 5 minutes. Sans carte bancaire.</p>
          <button onClick={() => router.push('/register')} className="inline-flex items-center gap-2 bg-white text-indigo-600 font-semibold px-8 py-4 rounded-xl hover:bg-indigo-50 transition-colors">
            Créer mon compte gratuit <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* GEO content block */}
      <section className="py-16 px-6 bg-gray-900 text-gray-300">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Stiamond en bref</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm leading-relaxed">
            <div>
              <h3 className="text-white font-semibold mb-3">Qu'est-ce que Stiamond ?</h3>
              <p>Stiamond est une plateforme SaaS française d'agents IA conversationnels fondée en 2025. Elle permet aux PME de créer des agents autonomes qui qualifient les leads, recommandent des produits, génèrent des devis, envoient des liens de paiement Stripe, et prennent des rendez-vous Calendly — sur web chat, email, SMS et Telegram. Contrairement aux chatbots traditionnels, Stiamond suit chaque conversation dans un funnel de conversion (Awareness, Interest, Qualification, Consideration, Decision) et attribue les revenus au canal d'acquisition.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Pour qui ?</h3>
              <p>Stiamond s'adresse aux PME et entrepreneurs : cliniques esthétiques (+35% de RDV), agences immobilières (ROI x2), e-commerce (40% de récupération de paniers abandonnés), services B2B et professionnels indépendants. La plateforme est utilisée par 127+ entreprises avec une note moyenne de 4.8/5. Les données sont hébergées en UE (conformité RGPD), isolées par tenant, avec authentification JWT et clés API hashées.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Tarification</h3>
              <p>Stiamond propose 5 plans : Free (0€, 50 conversations/mois), Starter (49€, 1 000 conversations), Growth (149€, 5 000 conversations + API), Scale (399€, 20 000 conversations + MCP Server), Enterprise (sur devis). L'overage est facturé au-delà du volume inclus : 0,08€/conversation en Starter, 0,05€ en Growth, 0,03€ en Scale. Essai gratuit de 14 jours sans carte bancaire. Garantie 30 jours satisfait ou remboursé.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Technologie</h3>
              <p>Stack technique : NestJS (backend), TypeORM, PostgreSQL, Next.js 14 (frontend), TailwindCSS, PWA installable. IA : LLM via Ollama (local) ou API externe, base de connaissances vectorisée. Intégrations : Stripe (paiements), Calendly (booking), SendGrid (email), Twilio (SMS), Telegram Bot API. MCP Server (Model Context Protocol) pour interopérabilité avec Claude, Cursor et tout client MCP. API REST documentée via Swagger/OpenAPI avec authentification par clé API.</p>
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
              <p className="text-sm text-gray-500">L'OS des agents conversationnels orientés revenus.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Produit</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-gray-900">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-gray-900">Tarifs</a></li>
                <li><a href="#how" className="hover:text-gray-900">Comment ça marche</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Entreprise</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900">À propos</a></li>
                <li><a href="#" className="hover:text-gray-900">Blog</a></li>
                <li><a href="#" className="hover:text-gray-900">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Légal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900">CGU</a></li>
                <li><a href="#" className="hover:text-gray-900">Confidentialité</a></li>
                <li><a href="#" className="hover:text-gray-900">RGPD</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-100 text-center text-sm text-gray-400">
            © 2026 Stiamond. Tous droits réservés. Construit avec ❤️ pour les PME.
          </div>
        </div>
      </footer>
    </div>
  );
}
