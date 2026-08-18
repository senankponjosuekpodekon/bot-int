import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stiamond.com';

export const metadata: Metadata = {
  title: 'Stiamond — وكلاء ذكاء اصطناعي يبيعون، لا مجرد دردشة',
  description: 'منصة وكلاء ذكاء اصطناعي مستقلين للشركات الصغيرة والمتوسطة. يقوم الوكلاء بتأهيل العملاء المحتملين، توصية المنتجات، حجز المواعيد، والتأثير على المبيعات عبر الويب والبريد الإلكتروني والرسائل القصيرة وتيليجرام.',
  keywords: [
    'وكيل ذكاء اصطناعي', 'روبوت دردشة ذكي', 'أتمتة المبيعات', 'تأهيل العملاء المحتملين',
    'ذكاء اصطناعي محادثي', 'وكيل مبيعات ذكي', 'تتبع قمع التحويل', 'رعاية العملاء',
    'ذكاء اصطناعي متعدد القنوات', 'أتمتة الأعمال', 'CRM ذكي', 'وكيل مستقل',
  ],
  alternates: {
    canonical: '/ar',
    languages: {
      'en-US': '/',
      'fr-FR': '/fr',
      'de-DE': '/de',
      'ar-AE': '/ar',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ar_AE',
    alternateLocale: ['en_US', 'fr_FR', 'de_DE'],
    url: `${SITE_URL}/ar`,
    siteName: 'Stiamond',
    title: 'Stiamond — وكلاء ذكاء اصطناعي يبيعون، لا مجرد دردشة',
    description: 'وكلاء الذكاء الاصطناعي يؤهلون العملاء، يوصون بالمنتجات، يحجزون المواعيد، ويؤثرون على المبيعات. متوسط تحويل 42%. بدون اعتماد على Meta.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Stiamond — وكلاء ذكاء اصطناعي مستقلون' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stiamond — وكلاء ذكاء اصطناعي يبيعون، لا مجرد دردشة',
    description: 'وكلاء الذكاء الاصطناعي يؤهلون، يوصون، يحجزون، ويبيعون. متوسط تحويل 42%. متعدد القنوات.',
    images: ['/og-image.png'],
  },
};

export default function ArLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="ar" dir="rtl" className="font-arabic">
      {children}
    </div>
  );
}
