'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot, MessageSquare, BarChart3, Globe, Zap, Shield, Brain, TrendingUp,
  Users, Package, Clock, Target, Filter, Radio, Check, ArrowLeft, Star,
  Sparkles, Code2, Phone, Mail, MapPin, ChevronDown, Server,
  Stethoscope, Home, ShoppingBag, Briefcase, X, Building2
} from 'lucide-react';
import { useCurrency } from '@/components/CurrencyProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

export default function LandingPageAR() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { currency, formatPrice, formatOverage } = useCurrency();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const features = [
    { icon: Bot, title: 'وكلاء ذكاء اصطناعي مستقلون', desc: 'أنشئ وكلاء يؤهلون، يوصون، يحجزون ويبيعون — ليس مجرد روبوتات دردشة.' },
    { icon: Filter, title: 'تتبع قمع التحويل', desc: 'الوعي ← الاهتمام ← التأهيل ← القرار. تتبع كل محادثة في قمع التحويل.' },
    { icon: Radio, title: 'إسناد متعدد القنوات', desc: 'UTM، إعلانات Meta، إعلانات Google، رموز QR، صفحات الهبوط. اعرف بالضبط من أين تأتي أفضل عملائك.' },
    { icon: Brain, title: 'ذاكرة طويلة المدى', desc: 'الوكيل يتعرّف على الزوار العائدين ويخصّص الترحيب بناءً على السجل.' },
    { icon: TrendingUp, title: 'تقييم النية', desc: 'درجة نية في الوقت الفعلي (0-100) تتراكم مع كل رسالة.' },
    { icon: Globe, title: 'صفحات هبوط متكاملة', desc: 'واجهة مولّدة تلقائياً مع دردشة مدمجة. دعم نطاق مخصص.' },
    { icon: BarChart3, title: 'تحليلات العائد على الاستثمار', desc: 'التحويل حسب القناة، تكلفة كل عميل مؤهل، إيرادات متأثرة بالوكيل.' },
    { icon: Shield, title: 'مستقل عن القناة', desc: 'دردشة ويب، بريد إلكتروني، رسائل قصيرة، تيليجرام، واتساب (اختياري). لا اعتماد على Meta.' },
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
      desc: 'للتجربة والاعتماد',
      features: ['وكيل ذكاء اصطناعي واحد', '50 محادثة/شهر', 'دردشة ويب', 'تتبع القمع', 'صفحة هبوط واحدة'],
      cta: 'ابدأ مجاناً',
      highlight: false,
      overage: null,
    },
    {
      name: 'Starter',
      desc: 'لرواد الأعمال والشركات الصغيرة',
      features: ['3 وكلاء ذكاء اصطناعي', '1,000 محادثة/شهر', 'دردشة ويب + بريد', 'تتبع القمع', 'صفحة هبوط', 'دعم بريد إلكتروني'],
      cta: 'تجربة 14 يوماً',
      highlight: false,
      overage: planPrices.Starter.overageCents,
    },
    {
      name: 'Growth',
      desc: 'للشركات النامية',
      features: ['10 وكلاء ذكاء اصطناعي', '5,000 محادثة/شهر', 'جميع القنوات', 'تحليلات متقدمة', 'واجهة برمجة التطبيقات', 'دعم أولوية'],
      cta: 'تجربة 14 يوماً',
      highlight: true,
      overage: planPrices.Growth.overageCents,
    },
    {
      name: 'Scale',
      desc: 'للشركات الكبيرة',
      features: ['وكلاء غير محدودين', '25,000 محادثة/شهر', 'جميع القنوات + ويب هوك', 'تحليلات مخصصة', 'SLA مخصص', 'دعم مخصص'],
      cta: 'تواصل معنا',
      highlight: false,
      overage: planPrices.Scale.overageCents,
    },
  ];

  const useCases = [
    { icon: ShoppingBag, title: 'التجارة الإلكترونية', desc: 'توصيات منتجات، أسئلة ما قبل الشراء، استرداد السلات المتروكة.' },
    { icon: Briefcase, title: 'الخدمات المهنية', desc: 'تأهيل العملاء، حجز المواعيد، إرسال عروض الأسعار.' },
    { icon: Stethoscope, title: 'الرعاية الصحية', desc: 'جدولة المرضى، الأسئلة الشائعة، تذكير المواعيد.' },
    { icon: Home, title: 'العقارات', desc: 'تأهيل المشترين، جولات افتراضية، طلبات المعاينة.' },
    { icon: Building2, title: 'B2B SaaS', desc: 'تأهيل العملاء المحتملين، عروض توضيحية، تكامل مع CRM.' },
    { icon: Users, title: 'التعليم', desc: 'إرشاد الطلاب، الأسئلة الشائعة، التسجيل في الدورات.' },
  ];

  const faqs = [
    { q: 'هل أحتاج إلى معرفة برمجية؟', a: 'لا. تنشئ وكلاءك من لوحة التحكم. تكتب وصف الوكيل، ترفع مستندات المعرفة، وتختار القنوات.' },
    { q: 'هل البيانات مستضافة في الاتحاد الأوروبي؟', a: 'نعم. خوادمنا في الاتحاد الأوروبي. متوافق مع GDPR و UAE PDPL.' },
    { q: 'هل يمكنني استخدام واتساب؟', a: 'نعم، واتساب مدعوم كقناة اختيارية. لكن منصتنا لا تعتمد على Meta — تعمل بشكل مستقل.' },
    { q: 'كيف يتم احتساب المحادثات؟', a: 'محادثة = تبادل رسائل مع زائر واحد. كل رسالة من الزائر ورد الوكيل تُحتسب كمحادثة واحدة.' },
    { q: 'هل يمكنني إلغاء الاشتراك في أي وقت؟', a: 'نعم، بدون رسوم إلغاء. يمكنك الترقية أو التخفيض أو الإلغاء من لوحة التحكم.' },
    { q: 'هل يدعم العربية؟', a: 'نعم! الوكيل يتكيف تلقائياً مع لغة المستخدم. يدعم العربية والإنجليزية والفرنسية والألمانية.' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-7 h-7 text-indigo-600" />
            <span className="font-bold text-lg">Stiamond</span>
          </div>
          <div className="hidden md:flex items-center gap-4 lg:p-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">الميزات</a>
            <a href="#use-cases" className="hover:text-indigo-600 transition-colors">حالات الاستخدام</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">الأسعار</a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">الأسئلة الشائعة</a>
          </div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher currentLocale="ar" />
            <button onClick={() => router.push('/login')} className="text-sm text-gray-600 hover:text-indigo-600">تسجيل الدخول</button>
            <button onClick={() => router.push('/register')} className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">ابدأ مجاناً</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              وكلاء ذكاء اصطناعي مستقلون — ليس مجرد روبوتات دردشة
            </div>
            <h1 className="text-3xl sm:text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              وكلاء ذكاء اصطناعي{' '}
              <span className="text-indigo-600">يبيعون</span>
              {' '}، لا مجرد دردشة
            </h1>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              منصة Stiamond تنشئ وكلاء يؤهلون العملاء المحتملين، يوصون بالمنتجات، يحجزون المواعيد، ويؤثرون على المبيعات. متوسط تحويل 42%. عبر الويب والبريد والرسائل وتيليجرام.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => router.push('/register')} className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                ابدأ تجربة 14 يوماً مجاناً
                <ArrowLeft className="w-4 h-4" />
              </button>
              <a href="#features" className="w-full sm:w-auto border border-gray-200 text-gray-700 px-8 py-3.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-center">
                استكشف الميزات
              </a>
            </div>
            <p className="mt-4 text-sm text-gray-400">بدون بطاقة ائتمان · إعداد في 5 دقائق</p>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:p-6">
            {[
              { value: '42%', label: 'متوسط معدل التحويل' },
              { value: '15-20h', label: 'ساعات موفرة أسبوعياً' },
              { value: '24/7', label: 'توفر دائم' },
              { value: '6+', label: 'قنوات مدعومة' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 lg:p-6 bg-white rounded-2xl shadow-sm border border-gray-50">
                <div className="text-2xl sm:text-3xl font-bold text-indigo-600">{stat.value}</div>
                <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl sm:text-4xl font-bold text-gray-900">كل ما تحتاجه لأتمتة المبيعات</h2>
            <p className="mt-4 text-gray-600">من تأهيل العملاء إلى إغلاق الصفقات — كل شيء في منصة واحدة.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:p-6">
            {features.map((feature, i) => (
              <div key={i} className="p-4 lg:p-6 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl sm:text-4xl font-bold text-gray-900">حالات الاستخدام</h2>
            <p className="mt-4 text-gray-600">يعمل في أي صناعة تقريباً.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:p-6">
            {useCases.map((uc, i) => (
              <div key={i} className="p-4 lg:p-6 bg-white rounded-2xl shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
                  <uc.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{uc.title}</h3>
                <p className="text-sm text-gray-600">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl sm:text-4xl font-bold text-gray-900">أسعار شفافة</h2>
            <p className="mt-4 text-gray-600">ابدأ مجاناً. ترقية عند الحاجة. إلغاء في أي وقت.</p>
            <div className="mt-6 inline-flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
              <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}>شهري</button>
              <button onClick={() => setBillingCycle('yearly')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}>سنوي (خصم 20%)</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:p-6">
            {plans.map((plan, i) => (
              <div key={i} className={`p-4 lg:p-6 rounded-2xl border-2 transition-all ${plan.highlight ? 'border-indigo-600 shadow-lg scale-105' : 'border-gray-100'}`}>
                {plan.highlight && <div className="text-center mb-2"><span className="inline-block px-3 py-0.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full">الأكثر شعبية</span></div>}
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.desc}</p>
                <div className="mb-4">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">{plan.name === 'Free' ? 'مجاناً' : formatPrice(planPrices[plan.name][billingCycle])}</span>
                  {plan.name !== 'Free' && <span className="text-sm text-gray-500">/شهر</span>}
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {plan.overage && <p className="text-xs text-gray-400 mb-4">{formatOverage(plan.overage)} لكل محادثة إضافية</p>}
                <button onClick={() => router.push('/register')} className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${plan.highlight ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>{plan.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl sm:text-4xl font-bold text-gray-900">الأسئلة الشائعة</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="w-full px-6 py-4 flex items-center justify-between text-right">
                  <span className="font-medium text-gray-900">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === i && <div className="px-6 pb-4 text-sm text-gray-600 leading-relaxed">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl sm:text-4xl font-bold text-white">جاهز لتسريع مبيعاتك؟</h2>
          <p className="mt-4 text-indigo-100">انضم للشركات التي تستخدم Stiamond لأتمتة مبيعاتها.</p>
          <button onClick={() => router.push('/register')} className="mt-8 bg-white text-indigo-600 px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
            ابدأ تجربة 14 يوماً مجاناً
            <ArrowLeft className="w-4 h-4" />
          </button>
          <p className="mt-4 text-sm text-indigo-200">بدون بطاقة ائتمان · إلغاء في أي وقت</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:p-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-6 h-6 text-indigo-400" />
                <span className="font-bold text-white">Stiamond</span>
              </div>
              <p className="text-sm">وكلاء ذكاء اصطناعي يبيعون، لا مجرد دردشة.</p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3 text-sm">المنتج</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">الميزات</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">الأسعار</a></li>
                <li><a href="#use-cases" className="hover:text-white transition-colors">حالات الاستخدام</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3 text-sm">القانونية</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/ar/terms" className="hover:text-white transition-colors">شروط الخدمة</a></li>
                <li><a href="/ar/privacy" className="hover:text-white transition-colors">سياسة الخصوصية</a></li>
                <li><a href="/ar/gdpr" className="hover:text-white transition-colors">GDPR</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3 text-sm">تواصل معنا</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> hello@stiamond.com</li>
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> الاتحاد الأوروبي</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            © 2026 Stiamond. جميع الحقوق محفوظة. بُني بـ ❤️ للشركات الصغيرة والمتوسطة.
          </div>
        </div>
      </footer>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white border-t border-gray-200 p-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-gray-500">14 يوماً مجاناً · بدون بطاقة</p>
        </div>
        <button onClick={() => router.push('/register')} className="bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg whitespace-nowrap">
          تجربة مجانية ←
        </button>
      </div>
      <div className="h-16 md:hidden" />
    </div>
  );
}
