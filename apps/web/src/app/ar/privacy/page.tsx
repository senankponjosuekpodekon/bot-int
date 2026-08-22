import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية',
  description: 'سياسة خصوصية Stiamond — كيف نجمع ونستخدم ونحمي بياناتك. متوافقة مع GDPR، استضافة في الاتحاد الأوروبي.',
};

export default function PrivacyARPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">سياسة الخصوصية</h1>
        <p className="text-sm text-gray-500 mb-8">آخر تحديث: يناير 2026</p>

        <div className="prose prose-gray max-w-none space-y-4 lg:space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. المراقب للبيانات</h2>
            <p>شركة Stiamond SAS هي المراقب للبيانات الشخصية المعالجة عبر الخدمة. تُستضاف البيانات في الاتحاد الأوروبي (فرنسا). التواصل: privacy@stiamond.com.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. البيانات التي نجمعها</h2>
            <ul className="list-disc pr-6 space-y-2">
              <li><strong>بيانات الحساب:</strong> الاسم، البريد الإلكتروني، اسم الشركة، كلمة المرور (مشفرة بـ bcrypt).</li>
              <li><strong>بيانات الاستخدام:</strong> المحادثات، العملاء المحتملون، مراحل القمع، التحليلات، استدعاءات API.</li>
              <li><strong>بيانات الدفع:</strong> تُعالج بواسطة Stripe. لا نخزن أرقام البطاقات الائتمانية.</li>
              <li><strong>البيانات التقنية:</strong> عنوان IP، نوع المتصفح، معلومات الجهاز (للأمان والتحليلات).</li>
              <li><strong>بيانات المستخدم النهائي:</strong> الرسائل المرسلة إلى وكلاء الذكاء الاصطناعي، معلومات الاتصال المشتركة.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. كيف نستخدم بياناتك</h2>
            <ul className="list-disc pr-6 space-y-2">
              <li>لتقديم وتحسين الخدمة.</li>
              <li>لمعالجة المدفوعات وإدارة الاشتراكات.</li>
              <li>لإرسال إشعارات الخدمة (الفوترة، الأمان، تحديثات المنتج).</li>
              <li>لإنشاء التحليلات والتقارير للوحة التحكم.</li>
              <li>لمنع الاحتيال والإساءة والتهديدات الأمنية.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. الأساس القانوني (GDPR المادة 6)</h2>
            <ul className="list-disc pr-6 space-y-2">
              <li><strong>عقد:</strong> المعالجة الضرورية لتقديم الخدمة المشترك فيها.</li>
              <li><strong>التزام قانوني:</strong> الامتثال للضرائب والمحاسبة واللوائح الأوروبية.</li>
              <li><strong>مصلحة مشروعة:</strong> الأمان، منع الاحتيال، وتحسين الخدمة.</li>
              <li><strong>موافقة:</strong> للتحليلات والتسويق الاختياري.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. الاحتفاظ بالبيانات</h2>
            <ul className="list-disc pr-6 space-y-2">
              <li>بيانات الحساب: تُحفظ طالما الحساب نشط. تُحذف خلال 30 يوماً من إغلاق الحساب.</li>
              <li>بيانات المحادثة: تُحفظ طالما الاشتراك نشط. قابلة للتصدير في أي وقت.</li>
              <li>سجلات الدفع: تُحفظ لمدة 10 سنوات وفقاً للقانون الضريبي الفرنسي.</li>
              <li>سجلات الخادم: تُحفظ لمدة 90 يوماً لأغراض الأمان.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. مشاركة البيانات</h2>
            <p>لا نبيع بياناتك. نشارك البيانات فقط مع:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li><strong>Stripe:</strong> معالجة المدفوعات (متوافق مع PCI-DSS).</li>
              <li><strong>SendGrid:</strong> إرسال البريد الإلكتروني للمعاملات.</li>
              <li><strong>Twilio:</strong> إرسال الرسائل القصيرة (اختياري، فقط إذا قمت بتفعيل قناة SMS).</li>
              <li><strong>بنية التحتية السحابية:</strong> استضافة في الاتحاد الأوروبي (AWS فرانكفورت أو ما يعادلها).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. حقوقك (GDPR)</h2>
            <ul className="list-disc pr-6 space-y-2">
              <li><strong>الوصول:</strong> طلب نسخة من بياناتك الشخصية.</li>
              <li><strong>التصحيح:</strong> تصحيح البيانات غير الدقيقة أو غير الكاملة.</li>
              <li><strong>المحو:</strong> طلب حذف بياناتك („الحق في النسيان").</li>
              <li><strong>قابلية النقل:</strong> تصدير بياناتك بتنسيق قابل للقراءة آلياً.</li>
              <li><strong>الاعتراض:</strong> الاعتراض على المعالجة المبنية على المصلحة المشروعة.</li>
              <li><strong>التقييد:</strong> طلب تقييد مؤقت للمعالجة.</li>
            </ul>
            <p className="mt-3">لممارسة هذه الحقوق، راسل privacy@stiamond.com. نرد خلال 30 يوماً.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. الأمان</h2>
            <ul className="list-disc pr-6 space-y-2">
              <li>عزل البيانات حسب المستأجر (بيانات كل عميل منفصلة منطقياً).</li>
              <li>المصادقة عبر JWT مع انتهاء الصلاحية.</li>
              <li>مفاتيح API مشفرة بـ bcrypt.</li>
              <li>رؤوس أمان Helmet (CSP، COOP، Referrer-Policy).</li>
              <li>تحديد المعدل (100 طلب/دقيقة لكل IP).</li>
              <li>تشفير HTTPS/TLS أثناء النقل.</li>
              <li>تشفير قاعدة البيانات في حالة السكون.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. النقل الدولي</h2>
            <p>تُستضاف البيانات في الاتحاد الأوروبي. قد ينقل المعالجون الخارجيون (Stripe، SendGrid) البيانات خارج الاتحاد الأوروبي بموجب البنود التعاقدية النموذجية (SCCs) أو قرارات الملاءمة. لا تُنقل أي بيانات إلى دول دون حماية بيانات كافية.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. ملفات تعريف الارتباط</h2>
            <p>نستخدم فقط ملفات تعريف الارتباط الأساسية للمصادقة وإدارة الجلسة. لا نستخدم ملفات تتبع أو بكسلات إعلانية أو أدوات تحليلات خارجية. لا حاجة لشعار ملفات تعريف الارتباط وفقاً لاستثناء المادة 5(3) من توجيه ePrivacy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. التواصل</h2>
            <p>Stiamond SAS — البريد الإلكتروني: privacy@stiamond.com — مسؤول حماية البيانات متاح عند الطلب.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <a href="/ar" className="text-sm text-indigo-600 hover:underline">→ العودة إلى الصفحة الرئيسية</a>
        </div>
      </div>
    </div>
  );
}
