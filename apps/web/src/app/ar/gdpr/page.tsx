import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'امتثال GDPR',
  description: 'امتثال Stiamond Agents لـ GDPR — استضافة في الاتحاد الأوروبي، عزل المستأجرين، اتفاقية معالجة البيانات وحقوق الأشخاص.',
};

export default function GdprARPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">امتثال GDPR</h1>
        <p className="text-sm text-gray-500 mb-8">آخر تحديث: يناير 2026</p>

        <div className="prose prose-gray max-w-none space-y-4 lg:space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">نظرة عامة</h2>
            <p>Stiamond Agents متوافقة بالكامل مع اللائحة العامة لحماية البيانات (GDPR، اللائحة الأوروبية 2016/679). كشركة فرنسية تستضيف البيانات في الاتحاد الأوروبي، نعالج البيانات الشخصية وفقاً لمبادئ GDPR: المشروعية، الإنصاف، الشفافية، تحديد الغرض، التقليل، الدقة، تحديد التخزين، النزاهة والمساءلة.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">استضافة البيانات في الاتحاد الأوروبي</h2>
            <ul className="list-disc pr-6 space-y-2">
              <li>جميع بيانات العملاء مستضافة في الاتحاد الأوروبي (فرانكفورت / فرنسا).</li>
              <li>لا تُخزن أي بيانات في الولايات المتحدة أو ولايات قضائية أخرى غير كافية.</li>
              <li>تشفير قاعدة البيانات في حالة السكون (AES-256).</li>
              <li>تشفير TLS 1.3 أثناء النقل.</li>
              <li>نسخ احتياطية مشفرة يومية في مراكز بيانات الاتحاد الأوروبي.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">عزل المستأجرين</h2>
            <p>بيانات كل عميل معزولة منطقياً على مستوى التطبيق. كل استعلام قاعدة بيانات محدد بمعرف المستأجر. يُمنع الوصول إلى البيانات بين المستأجرين على مستوى ORM (TypeORM tenant scoping). مفاتيح API محددة بالمستأجر ومشفرة بـ bcrypt.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">اتفاقية معالجة البيانات (DPA)</h2>
            <p>تعمل Stiamond Agents كمراقب للبيانات (لبيانات الحساب) ومعالج للبيانات (لبيانات محادثات المستخدمين النهائيين) بموجب GDPR. اتفاقية معالجة البيانات متاحة لعملاء Enterprise ويمكن طلبها من privacy@stiamond.com. تغطي DPA:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li>موضوع ومدة المعالجة.</li>
              <li>طبيعة وغرض المعالجة.</li>
              <li>نوع البيانات الشخصية وفئات الأشخاص المعنيين.</li>
              <li>التدابير التقنية والتنظيمية للأمان (TOMs).</li>
              <li>قائمة المعالجين الفرعيين وإخطار التغييرات.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">حقوق الأشخاص المعنيين</h2>
            <p>نُسهل ممارسة حقوق الأشخاص المعنيين كما هو محدد في المواد 15-22 من GDPR:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li><strong>حق الوصول (المادة 15):</strong> تصدير كامل للبيانات متاح في لوحة التحكم.</li>
              <li><strong>حق التصحيح (المادة 16):</strong> تحرير الملف الشخصي في لوحة التحكم.</li>
              <li><strong>حق المحو (المادة 17):</strong> حذف الحساب يزيل جميع البيانات المرتبطة خلال 30 يوماً.</li>
              <li><strong>حق قابلية النقل (المادة 20):</strong> تصدير JSON لجميع المحادثات والعملاء المحتملين والتحليلات.</li>
              <li><strong>حق الاعتراض (المادة 21):</strong> إلغاء الاشتراك في اتصالات التسويق في أي وقت.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">المعالجون الفرعيون</h2>
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-right py-2 px-3 font-semibold text-gray-900">المعالج</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-900">الغرض</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-900">الموقع</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">Stripe</td>
                  <td className="py-2 px-3">معالجة المدفوعات</td>
                  <td className="py-2 px-3">الاتحاد الأوروبي + الولايات المتحدة (SCCs)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">SendGrid</td>
                  <td className="py-2 px-3">بريد إلكتروني للمعاملات</td>
                  <td className="py-2 px-3">الاتحاد الأوروبي + الولايات المتحدة (SCCs)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">Twilio</td>
                  <td className="py-2 px-3">إرسال SMS (اختياري)</td>
                  <td className="py-2 px-3">الاتحاد الأوروبي + الولايات المتحدة (SCCs)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">استضافة سحابية</td>
                  <td className="py-2 px-3">استضافة التطبيق وقاعدة البيانات</td>
                  <td className="py-2 px-3">الاتحاد الأوروبي (فرانكفورت)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">إخطار الخرق</h2>
            <p>في حالة خرق البيانات الشخصية، ستُخطّر Stiamond Agents العملاء المتأثرين خلال 72 ساعة من العلم بالخرق، وفقاً للمادة 33 من GDPR. ستشمل الإخطارات طبيعة الخرق والعواقب المحتملة والتدابير المتخذة.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">السلطة الإشرافية</h2>
            <p>تخضع Stiamond Agents SAS لولاية CNIL (اللجنة الوطنية للمعلوماتية والحريات)، السلطة الفرنسية لحماية البيانات. يمكن تقديم شكاوى إلى CNIL على www.cnil.fr.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">التواصل</h2>
            <p>لاستفسارات GDPR أو طلبات DPA أو حقوق الأشخاص المعنيين: privacy@stiamond.com</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <a href="/ar" className="text-sm text-indigo-600 hover:underline">→ العودة إلى الصفحة الرئيسية</a>
        </div>
      </div>
    </div>
  );
}
