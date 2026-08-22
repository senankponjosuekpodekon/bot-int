import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'شروط الخدمة',
  description: 'شروط خدمة Stiamond Agents — شروط الاستخدام، الاستخدام المقبول، الدفع والإلغاء.',
};

export default function TermsARPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">شروط الخدمة</h1>
        <p className="text-sm text-gray-500 mb-8">آخر تحديث: يناير 2026</p>

        <div className="prose prose-gray max-w-none space-y-4 lg:space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. قبول الشروط</h2>
            <p>بالوصول إلى Stiamond Agents أو استخدامها („الخدمة")، فإنك توافق على الالتزام بشروط الخدمة هذه. إذا كنت لا توافق، فلا تستخدم الخدمة. Stiamond Agents تديرها شركة Stiamond Agents SAS، شركة فرنسية.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. وصف الخدمة</h2>
            <p>تقدم Stiamond Agents منصة وكلاء محادثة مدعومة بالذكاء الاصطناعي تمكّن الشركات من تأهيل العملاء المحتملين، والتوصية بالمنتجات، وحجز المواعيد، والتأثير على المبيعات عبر قنوات متعددة (دردشة ويب، بريد إلكتروني، رسائل قصيرة، تيليجرام). تشمل الخدمة لوحة تحكم، ووصول API (حسب الخطة)، وتكاملات مع خدمات خارجية.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. الحسابات والاشتراكات</h2>
            <ul className="list-disc pr-6 space-y-2">
              <li>يجب تقديم معلومات دقيقة عند إنشاء حساب.</li>
              <li>أنت مسؤول عن الحفاظ على أمان حسابك ومفاتيح API الخاصة بك.</li>
              <li>تشمل الخطة المجانية 50 محادثة/شهر مع وكيل واحد. تشمل الخطط المدفوعة (Starter، Growth، Scale، Enterprise) قدرات إضافية كما هو موضح في صفحة الأسعار لدينا.</li>
              <li>تُطبق رسوم تجاوز الحد عندما يتجاوز حجم المحادثات حدود الخطة.</li>
              <li>تشمل جميع الخطط المدفوعة فترة تجريبية مجانية لمدة 14 يوماً. لا حاجة لبطاقة ائتمان خلال الفترة التجريبية.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. الدفع والفوترة</h2>
            <ul className="list-disc pr-6 space-y-2">
              <li>تُفوتر الاشتراكات شهرياً أو سنوياً مقدماً عبر Stripe.</li>
              <li>الأسعار باليورو أو الدولار الأمريكي حسب العملة المختارة. سعر اليورو هو السعر المرجعي.</li>
              <li>تُفوتر رسوم التجاوز في نهاية كل دورة فوترة.</li>
              <li>ضمان استرداد المال خلال 30 يوماً ينطبق على جميع الخطط المدفوعة. تواصل مع support@stiamond.com للاسترداد.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. الإلغاء</h2>
            <p>يمكنك إلغاء اشتراكك في أي وقت من لوحة التحكم. يسري الإلغاء في نهاية دورة الفوترة الحالية. لن تُطبق رسوم إضافية بعد الإلغاء. المبالغ المدفوعة مقدماً غير قابلة للاسترداد باستثناء ضمان 30 يوماً.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. الاستخدام المقبول</h2>
            <ul className="list-disc pr-6 space-y-2">
              <li>لا يجوز استخدام الخدمة لأنشطة غير قانونية، أو رسائل مزعجة، أو مضايقة، أو ممارسات خادعة.</li>
              <li>لا يجوز محاولة الهندسة العكسية، أو فك التجميع، أو تفكيك الخدمة.</li>
              <li>لا يجوز استخدام الخدمة لإرسال رسائل تجارية غير مطلوبة.</li>
              <li>أنت مسؤول عن المحتوى الذي ينشئه وكلاء الذكاء الاصطناعي الخاص بك ويجب ضمان الامتثال للقوانين المعمول بها.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. البيانات والخصوصية</h2>
            <p>تُعالج بياناتك وفقاً لسياسة الخصوصية واللائحة العامة لحماية البيانات (GDPR). تُستضاف البيانات في الاتحاد الأوروبي. أنت تملك بياناتك ويمكنك تصديرها أو حذفها في أي وقت. راجع <a href="/ar/privacy" className="text-indigo-600 hover:underline">سياسة الخصوصية</a> و<a href="/ar/gdpr" className="text-indigo-600 hover:underline">امتثال GDPR</a> للتفاصيل.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. توفر الخدمة</h2>
            <p>نسعى لتحقيق 99.9% من وقت التشغيل (تشمل خطط Scale و Enterprise اتفاقية مستوى الخدمة). لسنا مسؤولين عن التوقف الناتج عن خدمات خارجية أو القوة القاهرة أو الصيانة المجدولة. تتوفر أرصدة خدمة لعملاء Enterprise وفقاً لشروط SLA.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. حدود المسؤولية</h2>
            <p>تُقدم Stiamond Agents „كما هي" دون أي ضمانات. لسنا مسؤولين عن الأضرار غير المباشرة أو العرضية أو التبعية. إجمالي مسؤوليتنا لن يتجاوز المبلغ الذي دفعته في الأشهر الثلاثة السابقة للمطالبة.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. تعديل الشروط</h2>
            <p>قد نحدّث هذه الشروط في أي وقت. سيتم إخطار التغييرات الجوهرية عبر البريد الإلكتروني قبل 30 يوماً على الأقل من سريانها. الاستمرار في الاستخدام بعد التغييرات يُعد قبولاً.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. التواصل</h2>
            <p>Stiamond Agents SAS — البريد الإلكتروني: support@stiamond.com — البيانات مستضافة في الاتحاد الأوروبي.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <a href="/ar" className="text-sm text-indigo-600 hover:underline">→ العودة إلى الصفحة الرئيسية</a>
        </div>
      </div>
    </div>
  );
}
