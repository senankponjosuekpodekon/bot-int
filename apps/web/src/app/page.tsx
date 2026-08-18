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

export default function LandingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { currency, formatPrice, formatOverage } = useCurrency();

  const features = [
    { icon: Bot, title: 'Autonomous AI Agents', desc: 'Create agents that qualify, recommend, book, and sell — not just chatbots.' },
    { icon: Filter, title: 'Native Funnel Tracking', desc: 'Awareness → Interest → Qualification → Decision. Track every conversation through the conversion funnel.' },
    { icon: Radio, title: 'Multi-Channel Attribution', desc: 'UTM, Meta Ads, Google Ads, QR codes, landing pages. Know exactly where your best leads come from.' },
    { icon: Brain, title: 'Long-Term Memory', desc: 'The agent recognizes returning visitors and personalizes greetings based on history.' },
    { icon: TrendingUp, title: 'Intent Scoring', desc: 'Real-time intent score (0-100) that accumulates with every message.' },
    { icon: Globe, title: 'Integrated Landing Pages', desc: 'Auto-generated storefront with embedded chat. Custom domain supported.' },
    { icon: BarChart3, title: 'ROI Analytics', desc: 'Conversion by channel, cost per qualified lead, revenue influenced by agent.' },
    { icon: Shield, title: 'Channel-Agnostic', desc: 'Web chat, email, SMS, Telegram, WhatsApp (optional). Zero Meta dependency.' },
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
      desc: 'To test and adopt',
      features: ['1 AI agent', '50 conversations/month', 'Web chat', 'Funnel tracking', '1 landing page'],
      cta: 'Start for free',
      highlight: false,
      overage: null,
    },
    {
      name: 'Starter',
      desc: 'For solopreneurs and micro-businesses',
      features: ['3 AI agents', '1,000 conversations/month', 'Web chat + email', 'Funnel tracking', 'Landing page', 'Email support'],
      cta: 'Start 14-day trial',
      highlight: false,
      overage: planPrices.Starter,
    },
    {
      name: 'Growth',
      desc: 'For growing SMBs',
      features: ['Unlimited agents', '5,000 conversations/month', 'Multi-channel (SMS, Telegram)', 'Acquisition analytics', 'Custom domain', 'API access', 'Stripe + Calendly'],
      cta: 'Start 14-day trial',
      highlight: true,
      overage: planPrices.Growth,
    },
    {
      name: 'Scale',
      desc: 'For mid-market teams',
      features: ['Everything in Growth +', '20,000 conversations/month', 'MCP Server included', 'Outcome tracking', 'White-label', 'API + webhooks', '99.9% SLA', 'Priority support'],
      cta: 'Start 14-day trial',
      highlight: false,
      overage: planPrices.Scale,
    },
    {
      name: 'Enterprise',
      desc: 'For large enterprises & agencies',
      features: ['Custom volume', 'Dedicated MCP', 'Outcome-based pricing', 'Full white-label', 'Custom SLA', 'Dedicated account manager'],
      cta: 'Contact sales',
      highlight: false,
      overage: null,
    },
  ];

  const stats = [
    { value: '42%', label: 'Visitor-to-qualified-lead conversion' },
    { value: '<2s', label: 'Average AI response time' },
    { value: '6+', label: 'Channels supported (web, email, SMS, Telegram, WhatsApp, API)' },
    { value: '8x', label: 'Cheaper than a junior sales rep' },
  ];

  const getPriceDisplay = (plan: typeof plans[number]) => {
    if (plan.name === 'Enterprise') return 'Custom';
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
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#how" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher currentLocale="en" />
            <button onClick={() => router.push('/login')} className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign in</button>
            <button onClick={() => router.push('/register')} className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors">
              Free trial
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 text-sm font-semibold mb-6 animate-pulse">
            <Zap className="w-4 h-4" />
            Launch offer: 14 days free + 50 conversations included, no credit card
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            Your AI agents sell while you sleep.
            <br />
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">42% conversion. 0% Meta dependency.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Stiamond creates AI agents that qualify your leads, recommend your products, book appointments, and influence sales — across web, email, SMS, and Telegram.
            <span className="font-semibold text-gray-900"> You keep full control of your channels and your data.</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-10 text-sm text-gray-600">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> 5-minute setup</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Cancel in 1 click</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> 100% your data</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => router.push('/register')} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors shadow-lg shadow-indigo-200 text-lg">
              Create my free agent <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3">
              See demo →
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            Trusted by 127+ businesses · 4.8/5 rating · EU-hosted data (GDPR compliant)
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
                    <p className="text-xs text-gray-400 mb-1">Conversations</p>
                    <p className="text-lg font-bold text-white">1,247</p>
                    <p className="text-xs text-green-400">+18% this week</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Qualified leads</p>
                    <p className="text-lg font-bold text-white">523</p>
                    <p className="text-xs text-green-400">42% rate</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Revenue influenced</p>
                    <p className="text-lg font-bold text-white">$48.2k</p>
                    <p className="text-xs text-green-400">+32% MoM</p>
                  </div>
                </div>
                <div className="mt-3 bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">Funnel breakdown</p>
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
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything you need to sell through conversation</h2>
            <p className="text-lg text-gray-600">Not a chatbot. An agent that acts.</p>
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
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Built for your industry</h2>
            <p className="text-lg text-gray-600">Specialized agents that understand your business.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Stethoscope, title: 'Aesthetic Clinics', desc: 'Patient qualification, consultation booking, treatment recommendations. +35% appointments.', metric: '+35% bookings' },
              { icon: Home, title: 'Real Estate', desc: 'Property matching, visit scheduling, lead scoring by budget and urgency. ROI doubled.', metric: 'ROI x2' },
              { icon: ShoppingBag, title: 'E-commerce', desc: 'Abandoned cart recovery, product recommendations, order tracking via chat. 40% recovery.', metric: '40% recovery' },
              { icon: Briefcase, title: 'B2B Services', desc: 'Lead qualification, automated quotes, meeting scheduling, CRM sync. 3x faster pipeline.', metric: '3x faster' },
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
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Stiamond?</h2>
            <p className="text-lg text-gray-600">Not a chatbot. Not a human. Something better.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-500">Chatbot</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-500">Human rep</th>
                  <th className="text-center py-4 px-4 font-bold text-indigo-600 bg-indigo-50 rounded-t-xl">Stiamond</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feat: 'Available 24/7', chatbot: true, human: false, stiamond: true },
                  { feat: 'Qualifies leads automatically', chatbot: false, human: true, stiamond: true },
                  { feat: 'Funnel tracking & attribution', chatbot: false, human: false, stiamond: true },
                  { feat: 'Recommends products', chatbot: false, human: true, stiamond: true },
                  { feat: 'Sends quotes & payment links', chatbot: false, human: true, stiamond: true },
                  { feat: 'Books appointments', chatbot: false, human: true, stiamond: true },
                  { feat: 'Multi-channel (web, email, SMS, Telegram)', chatbot: false, human: true, stiamond: true },
                  { feat: 'Long-term memory', chatbot: false, human: true, stiamond: true },
                  { feat: 'Cost per month', chatbot: '$10-50', human: '$3,000+', stiamond: '$49-399' },
                  { feat: 'Scales infinitely', chatbot: true, human: false, stiamond: true },
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
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" itemProp="name">How it works</h2>
            <p className="text-lg text-gray-600" itemProp="description">From ad to sale in 4 steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', icon: Radio, title: 'Attract', desc: 'Meta Ads, Google Ads, QR codes, organic. Every visitor is tracked with their source channel.', propName: 'Attract your visitors' },
              { step: '2', icon: Bot, title: 'Qualify', desc: 'The AI agent asks the right questions, detects budget, urgency, and need. Auto funnel stage.', propName: 'Qualify automatically' },
              { step: '3', icon: Target, title: 'Convert', desc: 'The agent proposes a quote, sends a Stripe payment link, books a Calendly appointment.', propName: 'Convert to revenue' },
              { step: '4', icon: BarChart3, title: 'Measure', desc: 'ROI by channel, conversion rate per funnel stage, revenue influenced by agent. Optimize.', propName: 'Measure and optimize' },
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
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-600">No per-conversation fees. No platform lock-in.</p>
          </div>
          <div className="flex items-center justify-center gap-4 mb-10">
            <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Monthly</button>
            <button onClick={() => setBillingCycle('yearly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Yearly <span className="text-xs opacity-75">(-20%)</span></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {plans.map((p) => (
              <div key={p.name} className={`bg-white rounded-2xl p-6 border-2 transition-all ${p.highlight ? 'border-indigo-600 shadow-xl shadow-indigo-100 lg:scale-105' : 'border-gray-100'}`}>
                {p.highlight && <div className="inline-block px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-medium mb-4">Most popular</div>}
                <h3 className="text-xl font-bold text-gray-900 mb-1">{p.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{p.desc}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  {p.name === 'Enterprise' ? (
                    <span className="text-3xl font-bold text-gray-900">Custom</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-gray-900">{getPriceDisplay(p)}</span>
                      <span className="text-gray-500">/mo</span>
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
          <p className="text-center text-sm text-gray-500 mt-8">All paid plans include: 14-day trial, no credit card required. Overage billed beyond included volume. Cancel anytime.</p>
          <div className="flex flex-col items-center mt-12 gap-4">
            <div className="flex items-center gap-3 bg-green-50 rounded-2xl px-6 py-4">
              <Shield className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="text-left">
                <p className="font-bold text-gray-900">30-day money-back guarantee</p>
                <p className="text-sm text-gray-600">No results? Full refund. No questions asked.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center mt-6 gap-4">
            <div className="flex items-center gap-3 bg-blue-50 rounded-2xl px-6 py-4">
              <Server className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <p className="font-bold text-gray-900">EU-hosted & GDPR compliant</p>
                <p className="text-sm text-gray-600">Your data stays in the European Union. Tenant-isolated, JWT-secured, GDPR-compliant. Perfect for serving EU customers with confidence.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">They generate revenue with Stiamond</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Sophie M.', role: 'Aesthetic Clinic, Paris', quote: 'The agent qualifies patients and books consultations automatically. +35% appointments in 3 months.', metric: '+35% bookings' },
              { name: 'Karim B.', role: 'Real Estate Agency, Lyon', quote: 'Funnel tracking showed me my Instagram Ads converted 3x better than Google. ROI doubled.', metric: 'ROI x2' },
              { name: 'Elodie R.', role: 'Fashion E-commerce, Bordeaux', quote: 'The agent recovers 40% of abandoned carts via chat. Performance-based pricing is perfect for us.', metric: '40% recovery' },
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
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: 'Does Stiamond depend on WhatsApp?', a: 'No. Stiamond is channel-agnostic. Web chat, email, SMS, Telegram, and WhatsApp as an option. You keep full control of your channels and data.' },
              { q: 'How does the AI agent work?', a: 'The agent uses an LLM (Ollama locally or via API) with your knowledge base, product catalog, and custom personality. It qualifies, recommends, books, and sells.' },
              { q: 'Can I use my own domain?', a: 'Yes. Every plan includes a customizable landing page with a subdomain. Growth+ supports custom domains.' },
              { q: 'What is funnel tracking?', a: 'Every conversation is automatically classified: Awareness → Interest → Qualification → Consideration → Decision. You see exactly where leads drop off.' },
              { q: 'Is there a free plan?', a: 'Yes, the Free plan includes 50 conversations/month with 1 agent. No credit card required. Upgrade anytime.' },
              { q: 'Can I sell or integrate via API?', a: 'Yes. The Growth plan includes API access with secure API keys. The Scale plan includes MCP Server (Model Context Protocol) to connect your agents to Claude, Cursor, or any MCP client.' },
              { q: 'What is MCP?', a: 'The Model Context Protocol is the open standard for connecting AI agents to external tools. Stiamond exposes your agents as an MCP Server: any MCP client can call them.' },
              { q: 'Is my data secure?', a: 'Yes. Your data is tenant-isolated, JWT-authenticated, Helmet headers, rate limiting, API keys hashed with bcrypt. EU-hosted, GDPR compliant. You own your data.' },
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
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to generate revenue through conversation?</h2>
          <p className="text-lg text-indigo-100 mb-8">Start in 5 minutes. No credit card.</p>
          <button onClick={() => router.push('/register')} className="inline-flex items-center gap-2 bg-white text-indigo-600 font-semibold px-8 py-4 rounded-xl hover:bg-indigo-50 transition-colors">
            Create my free account <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* GEO content block */}
      <section className="py-16 px-6 bg-gray-900 text-gray-300">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Stiamond at a glance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm leading-relaxed">
            <div>
              <h3 className="text-white font-semibold mb-3">What is Stiamond?</h3>
              <p>Stiamond is a French SaaS platform for autonomous conversational AI agents, founded in 2025. It enables SMBs to create agents that qualify leads, recommend products, generate quotes, send Stripe payment links, and book Calendly appointments — across web chat, email, SMS, and Telegram. Unlike traditional chatbots, Stiamond tracks every conversation through a conversion funnel (Awareness, Interest, Qualification, Consideration, Decision) and attributes revenue to acquisition channels.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Who is it for?</h3>
              <p>Stiamond targets SMBs and entrepreneurs: aesthetic clinics (+35% appointments), real estate agencies (ROI x2), e-commerce (40% abandoned cart recovery), B2B services, and independent professionals. The platform is used by 127+ businesses with an average rating of 4.8/5. Data is EU-hosted (GDPR compliant), tenant-isolated, with JWT authentication and hashed API keys.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Pricing</h3>
              <p>Stiamond offers 5 plans: Free ($0, 50 conversations/month), Starter ($49, 1,000 conversations), Growth ($149, 5,000 conversations + API), Scale ($399, 20,000 conversations + MCP Server), Enterprise (custom). Overage is billed beyond included volume: $0.09/conversation on Starter, $0.06 on Growth, $0.04 on Scale. 14-day free trial, no credit card. 30-day money-back guarantee.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Technology</h3>
              <p>Tech stack: NestJS (backend), TypeORM, PostgreSQL, Next.js 14 (frontend), TailwindCSS, installable PWA. AI: LLM via Ollama (local) or external API, vectorized knowledge base. Integrations: Stripe (payments), Calendly (booking), SendGrid (email), Twilio (SMS), Telegram Bot API. MCP Server (Model Context Protocol) for interoperability with Claude, Cursor, and any MCP client. REST API documented via Swagger/OpenAPI with API key authentication.</p>
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
              <p className="text-sm text-gray-500">The OS of revenue-oriented conversational agents.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-gray-900">Features</a></li>
                <li><a href="#pricing" className="hover:text-gray-900">Pricing</a></li>
                <li><a href="#how" className="hover:text-gray-900">How it works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#use-cases" className="hover:text-gray-900">Use cases</a></li>
                <li><a href="#faq" className="hover:text-gray-900">FAQ</a></li>
                <li><a href="/register" className="hover:text-gray-900">Get started</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="/terms" className="hover:text-gray-900">Terms</a></li>
                <li><a href="/privacy" className="hover:text-gray-900">Privacy</a></li>
                <li><a href="/gdpr" className="hover:text-gray-900">GDPR</a></li>
              </ul>
            </div>
          </div>

          {/* Newsletter capture */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 p-6 bg-gray-50 rounded-2xl">
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900 text-sm">Stay updated</p>
              <p className="text-xs text-gray-500">Product updates, AI sales tips, and early access to new features.</p>
            </div>
            <form className="flex gap-2 w-full sm:w-auto" onSubmit={(e) => { e.preventDefault(); router.push('/register'); }}>
              <input type="email" required placeholder="you@company.com" className="px-4 py-2 rounded-lg border border-gray-200 text-sm flex-1 sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap">Subscribe</button>
            </form>
          </div>

          <div className="pt-8 border-t border-gray-100 text-center text-sm text-gray-400">
            © 2026 Stiamond. All rights reserved. Built with ❤️ for SMBs.
          </div>
        </div>
      </footer>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white border-t border-gray-200 p-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-gray-500">14 days free · No credit card</p>
        </div>
        <button onClick={() => router.push('/register')} className="bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg whitespace-nowrap">
          Start free →
        </button>
      </div>
      <div className="h-16 md:hidden" />
    </div>
  );
}
