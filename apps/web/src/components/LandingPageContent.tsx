'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Bot, BarChart3, Globe, Zap, Shield, Brain, TrendingUp,
  Users, Target, Filter, Radio, Check, ArrowRight, Star,
  Sparkles, Mail, MapPin, ChevronDown, Server,
  Stethoscope, Home, ShoppingBag, Briefcase, X
} from 'lucide-react';
import { useCurrency } from '@/components/CurrencyProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import WidgetEmbed from '@/components/WidgetEmbed';

const planPrices: Record<string, { monthly: number; yearly: number; overageCents: number }> = {
  Free: { monthly: 0, yearly: 0, overageCents: 0 },
  Starter: { monthly: 49, yearly: 39, overageCents: 8 },
  Growth: { monthly: 149, yearly: 119, overageCents: 5 },
  Scale: { monthly: 399, yearly: 319, overageCents: 3 },
};

const featureIcons = [Bot, Filter, Radio, Brain, TrendingUp, Globe, BarChart3, Shield];
const useCaseIcons = [Stethoscope, Home, ShoppingBag, Briefcase];
const useCaseMetrics = ['+35% bookings', 'ROI x2', '40% recovery', '3x faster'];
const howSteps = [
  { step: '1', icon: Radio },
  { step: '2', icon: Bot },
  { step: '3', icon: Target },
  { step: '4', icon: BarChart3 },
];
const comparisonRows = [
  { chatbot: true, human: false, stiamond: true },
  { chatbot: false, human: true, stiamond: true },
  { chatbot: false, human: false, stiamond: true },
  { chatbot: false, human: true, stiamond: true },
  { chatbot: false, human: true, stiamond: true },
  { chatbot: false, human: true, stiamond: true },
  { chatbot: false, human: true, stiamond: true },
  { chatbot: false, human: true, stiamond: true },
  { chatbot: '$10-50', human: '$3,000+', stiamond: '$49-399' },
  { chatbot: true, human: false, stiamond: true },
];

export default function LandingPageContent({ locale }: { locale: 'en' | 'fr' | 'de' }) {
  const router = useRouter();
  const t = useTranslations();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { currency, formatPrice, formatOverage } = useCurrency();

  const planNames = ['Free', 'Starter', 'Growth', 'Scale', 'Enterprise'] as const;

  const getPriceDisplay = (planName: string) => {
    if (planName === 'Enterprise') return t('pricing.custom');
    if (planName === 'Free') return formatPrice(0);
    const p = planPrices[planName];
    return formatPrice(billingCycle === 'monthly' ? p.monthly : p.yearly);
  };

  const getOverageDisplay = (planName: string) => {
    if (planName === 'Free' || planName === 'Enterprise') return null;
    const p = planPrices[planName];
    if (!p) return null;
    return formatOverage(p.overageCents);
  };

  const legalPrefix = locale === 'en' ? '' : `/${locale}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">Stiamond Agents</span>
          </div>
          <div className="hidden md:flex items-center gap-4 lg:p-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">{t('nav.features')}</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">{t('nav.pricing')}</a>
            <a href="#how" className="hover:text-gray-900 transition-colors">{t('nav.how')}</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">{t('nav.faq')}</a>
          </div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher currentLocale={locale} />
            <button onClick={() => router.push('/login')} className="text-sm font-medium text-gray-600 hover:text-gray-900">{t('nav.signin')}</button>
            <button onClick={() => router.push('/register')} className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors">
              {t('nav.freetrial')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 text-sm font-semibold mb-6 animate-pulse">
            <Zap className="w-4 h-4" />
            {t('hero.badge')}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            {t('hero.title1')}
            <br />
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">{t('hero.title2')}</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            {t('hero.subtitle')}
            <span className="font-semibold text-gray-900">{t('hero.subtitleHighlight')}</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-10 text-sm text-gray-600">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> {t('hero.check1')}</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> {t('hero.check2')}</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> {t('hero.check3')}</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> {t('hero.check4')}</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => router.push('/register')} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors shadow-lg shadow-indigo-200 text-lg">
              {t('hero.cta')} <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3">
              {t('hero.ctaDemo')}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-6">{t('hero.trust')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:p-6 mt-20">
            {[
              { value: t('hero.stat1value'), label: t('hero.stat1label') },
              { value: t('hero.stat2value'), label: t('hero.stat2label') },
              { value: t('hero.stat3value'), label: t('hero.stat3label') },
              { value: t('hero.stat4value'), label: t('hero.stat4label') },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1 max-w-[140px] mx-auto">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Product visual */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="bg-gray-900 rounded-2xl p-2 shadow-2xl shadow-indigo-200">
              <div className="bg-gray-800 rounded-xl p-4 lg:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-gray-400">{t('hero.dashboard')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">{t('hero.conversations')}</p>
                    <p className="text-lg font-bold text-white">1,247</p>
                    <p className="text-xs text-green-400">+18%</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">{t('hero.qualifiedLeads')}</p>
                    <p className="text-lg font-bold text-white">523</p>
                    <p className="text-xs text-green-400">42%</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">{t('hero.revenueInfluenced')}</p>
                    <p className="text-lg font-bold text-white">$48.2k</p>
                    <p className="text-xs text-green-400">+32% MoM</p>
                  </div>
                </div>
                <div className="mt-3 bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">{t('hero.funnelBreakdown')}</p>
                    <p className="text-xs text-indigo-400">{t('hero.funnelStages')}</p>
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
            <h2 className="text-2xl sm:text-3xl md:text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('features.title')}</h2>
            <p className="text-lg text-gray-600">{t('features.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:p-6">
            {featureIcons.map((Icon, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 lg:p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{t(`features.items.${i}.title`)}</h3>
                <p className="text-sm text-gray-600">{t(`features.items.${i}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('useCases.title')}</h2>
            <p className="text-lg text-gray-600">{t('useCases.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:p-6">
            {useCaseIcons.map((Icon, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 lg:p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{t(`useCases.items.${i}.title`)}</h3>
                <p className="text-sm text-gray-600 mb-3">{t(`useCases.items.${i}.desc`)}</p>
                <span className="inline-block px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">{t(`useCases.items.${i}.metric`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('comparison.title')}</h2>
            <p className="text-lg text-gray-600">{t('comparison.subtitle')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">{t('comparison.feature')}</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-500">{t('comparison.chatbot')}</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-500">{t('comparison.human')}</th>
                  <th className="text-center py-4 px-4 font-bold text-indigo-600 bg-indigo-50 rounded-t-xl">{t('comparison.stiamond')}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-700 font-medium">{t(`comparison.rows.${i}`)}</td>
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
            <h2 className="text-2xl sm:text-3xl md:text-3xl sm:text-4xl font-bold text-gray-900 mb-4" itemProp="name">{t('howItWorks.title')}</h2>
            <p className="text-lg text-gray-600" itemProp="description">{t('howItWorks.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:p-8">
            {howSteps.map((s) => (
              <div key={s.step} className="relative" itemProp="step" itemScope itemType="https://schema.org/HowToStep">
                <meta itemProp="position" content={s.step} />
                <meta itemProp="name" content={t(`howItWorks.steps.${parseInt(s.step) - 1}.title`)} />
                <meta itemProp="text" content={t(`howItWorks.steps.${parseInt(s.step) - 1}.desc`)} />
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center mb-4">
                  {s.step}
                </div>
                <s.icon className="w-6 h-6 text-indigo-500 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{t(`howItWorks.steps.${parseInt(s.step) - 1}.title`)}</h3>
                <p className="text-sm text-gray-600">{t(`howItWorks.steps.${parseInt(s.step) - 1}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('pricing.title')}</h2>
            <p className="text-lg text-gray-600">{t('pricing.subtitle')}</p>
          </div>
          <div className="flex items-center justify-center gap-4 mb-10">
            <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{t('pricing.monthly')}</button>
            <button onClick={() => setBillingCycle('yearly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{t('pricing.yearly')} <span className="text-xs opacity-75">{t('pricing.yearlyDiscount')}</span></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {planNames.map((name) => {
              const highlight = name === 'Growth';
              const overage = getOverageDisplay(name);
              const features = t.raw(`pricing.plans.${name}.features`) as string[];
              return (
                <div key={name} className={`bg-white rounded-2xl p-4 lg:p-6 border-2 transition-all ${highlight ? 'border-indigo-600 shadow-xl shadow-indigo-100 lg:scale-105' : 'border-gray-100'}`}>
                  {highlight && <div className="inline-block px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-medium mb-4">{t('pricing.mostPopular')}</div>}
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{t(`pricing.plans.${name}.desc`)}</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    {name === 'Enterprise' ? (
                      <span className="text-2xl sm:text-3xl font-bold text-gray-900">{t('pricing.custom')}</span>
                    ) : (
                      <>
                        <span className="text-3xl sm:text-4xl font-bold text-gray-900">{getPriceDisplay(name)}</span>
                        <span className="text-gray-500">{t('pricing.perMonth')}</span>
                      </>
                    )}
                  </div>
                  {overage && <p className="text-xs text-indigo-500 mb-4 font-medium">{t('pricing.overage', { value: overage })}</p>}
                  <button onClick={() => router.push('/register')} className={`w-full py-3 rounded-xl font-semibold transition-colors mb-6 ${highlight ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>{t(`pricing.plans.${name}.cta`)}</button>
                  <ul className="space-y-3">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="text-center text-sm text-gray-500 mt-8">{t('pricing.footer')}</p>
          <div className="flex flex-col items-center mt-12 gap-4">
            <div className="flex items-center gap-3 bg-green-50 rounded-2xl px-6 py-4">
              <Shield className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="text-left">
                <p className="font-bold text-gray-900">{t('pricing.guaranteeTitle')}</p>
                <p className="text-sm text-gray-600">{t('pricing.guaranteeDesc')}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center mt-6 gap-4">
            <div className="flex items-center gap-3 bg-blue-50 rounded-2xl px-6 py-4">
              <Server className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <p className="font-bold text-gray-900">{t('pricing.euTitle')}</p>
                <p className="text-sm text-gray-600">{t('pricing.euDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('testimonials.title')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:p-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 lg:p-6 border border-gray-100">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-gray-700 mb-4 italic">"{t(`testimonials.items.${i}.quote`)}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{t(`testimonials.items.${i}.name`)}</p>
                    <p className="text-xs text-gray-500">{t(`testimonials.items.${i}.role`)}</p>
                  </div>
                  <span className="text-sm font-bold text-indigo-600">{t(`testimonials.items.${i}.metric`)}</span>
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
            <h2 className="text-2xl sm:text-3xl md:text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('faq.title')}</h2>
          </div>
          <div className="space-y-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <details key={i} className="group bg-white rounded-xl border border-gray-100 p-5" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
                <meta itemProp="name" content={t(`faq.items.${i}.q`)} />
                <summary className="flex items-center justify-between cursor-pointer font-medium text-gray-900">
                  {t(`faq.items.${i}.q`)}
                  <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 text-sm text-gray-600" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
                  <span itemProp="text">{t(`faq.items.${i}.a`)}</span>
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-12">
          <h2 className="text-2xl sm:text-3xl md:text-3xl sm:text-4xl font-bold text-white mb-4">{t('cta.title')}</h2>
          <p className="text-lg text-indigo-100 mb-8">{t('cta.subtitle')}</p>
          <button onClick={() => router.push('/register')} className="inline-flex items-center gap-2 bg-white text-indigo-600 font-semibold px-8 py-4 rounded-xl hover:bg-indigo-50 transition-colors">
            {t('cta.button')} <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* GEO content block */}
      <section className="py-16 px-6 bg-gray-900 text-gray-300">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">{t('geoBlock.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 gap-4 lg:p-8 text-sm leading-relaxed">
            <div>
              <h3 className="text-white font-semibold mb-3">{t('geoBlock.col1Title')}</h3>
              <p>{t('geoBlock.col1Body')}</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('geoBlock.col2Title')}</h3>
              <p>{t('geoBlock.col2Body')}</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('geoBlock.col3Title')}</h3>
              <p>{t('geoBlock.col3Body')}</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('geoBlock.col4Title')}</h3>
              <p>{t('geoBlock.col4Body')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:p-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900">Stiamond Agents</span>
              </div>
              <p className="text-sm text-gray-500">{t('footer.tagline')}</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">{t('footer.product')}</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-gray-900">{t('footer.features')}</a></li>
                <li><a href="#pricing" className="hover:text-gray-900">{t('footer.pricing')}</a></li>
                <li><a href="#how" className="hover:text-gray-900">{t('footer.how')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">{t('footer.company')}</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#use-cases" className="hover:text-gray-900">{t('footer.useCases')}</a></li>
                <li><a href="#faq" className="hover:text-gray-900">{t('footer.faq')}</a></li>
                <li><a href="/register" className="hover:text-gray-900">{t('footer.getStarted')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">{t('footer.legal')}</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href={`${legalPrefix}/terms`} className="hover:text-gray-900">{t('footer.terms')}</a></li>
                <li><a href={`${legalPrefix}/privacy`} className="hover:text-gray-900">{t('footer.privacy')}</a></li>
                <li><a href={`${legalPrefix}/gdpr`} className="hover:text-gray-900">{t('footer.gdpr')}</a></li>
              </ul>
            </div>
          </div>

          {/* Newsletter capture */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 p-4 lg:p-6 bg-gray-50 rounded-2xl">
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900 text-sm">{t('footer.newsletterTitle')}</p>
              <p className="text-xs text-gray-500">{t('footer.newsletterDesc')}</p>
            </div>
            <form className="flex gap-2 w-full sm:w-auto" onSubmit={(e) => { e.preventDefault(); router.push('/register'); }}>
              <input type="email" required placeholder={t('footer.newsletterPlaceholder')} className="px-4 py-2 rounded-lg border border-gray-200 text-sm flex-1 sm:w-full lg:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap">{t('footer.subscribe')}</button>
            </form>
          </div>

          <div className="pt-8 border-t border-gray-100 text-center text-sm text-gray-400">
            {t('footer.copyright')}
          </div>
        </div>
      </footer>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white border-t border-gray-200 p-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-gray-500">{t('mobileCta.trial')}</p>
        </div>
        <button onClick={() => router.push('/register')} className="bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg whitespace-nowrap">
          {t('mobileCta.button')}
        </button>
      </div>
      <div className="h-16 md:hidden" />
      <WidgetEmbed />
    </div>
  );
}
