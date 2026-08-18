import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GDPR Compliance',
  description: 'Stiamond GDPR compliance — EU-hosted data, tenant isolation, DPA, and data subject rights.',
};

export default function GdprPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">GDPR Compliance</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Overview</h2>
            <p>Stiamond is fully compliant with the General Data Protection Regulation (GDPR, Regulation EU 2016/679). As a French company hosting data in the European Union, we process personal data in accordance with GDPR principles: lawfulness, fairness, transparency, purpose limitation, data minimization, accuracy, storage limitation, integrity, and accountability.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">EU Data Hosting</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All customer data is hosted in the European Union (France / Frankfurt).</li>
              <li>No data is stored in the US or other non-adequate jurisdictions.</li>
              <li>Database encryption at rest (AES-256).</li>
              <li>TLS 1.3 encryption in transit.</li>
              <li>Daily encrypted backups retained in EU data centers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Tenant Isolation</h2>
            <p>Each customer's data is logically isolated at the application level. Every database query is scoped to the tenant ID. Cross-tenant data access is prevented at the ORM layer (TypeORM tenant scoping). API keys are tenant-scoped and hashed with bcrypt.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Processing Agreement (DPA)</h2>
            <p>Stiamond acts as both data controller (for account data) and data processor (for end-user conversation data) under GDPR. A Data Processing Agreement is available for Enterprise customers and can be requested at privacy@stiamond.com. The DPA covers:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Subject matter and duration of processing.</li>
              <li>Nature and purpose of processing.</li>
              <li>Type of personal data and categories of data subjects.</li>
              <li>Technical and organizational security measures (TOMs).</li>
              <li>Sub-processor list and notification of changes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Subject Rights</h2>
            <p>We facilitate the exercise of data subject rights as defined in GDPR Articles 15-22:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Right of access (Art. 15):</strong> full data export available in the dashboard.</li>
              <li><strong>Right to rectification (Art. 16):</strong> profile editing in the dashboard.</li>
              <li><strong>Right to erasure (Art. 17):</strong> account deletion removes all associated data within 30 days.</li>
              <li><strong>Right to data portability (Art. 20):</strong> JSON export of all conversations, leads, and analytics.</li>
              <li><strong>Right to object (Art. 21):</strong> opt-out of marketing communications at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Sub-Processors</h2>
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-3 font-semibold text-gray-900">Processor</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900">Purpose</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900">Location</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">Stripe</td>
                  <td className="py-2 px-3">Payment processing</td>
                  <td className="py-2 px-3">EU + US (SCCs)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">SendGrid</td>
                  <td className="py-2 px-3">Transactional email</td>
                  <td className="py-2 px-3">EU + US (SCCs)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">Twilio</td>
                  <td className="py-2 px-3">SMS delivery (optional)</td>
                  <td className="py-2 px-3">EU + US (SCCs)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">Cloud hosting</td>
                  <td className="py-2 px-3">Application & database hosting</td>
                  <td className="py-2 px-3">EU (Frankfurt)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Breach Notification</h2>
            <p>In the event of a personal data breach, Stiamond will notify affected customers within 72 hours of becoming aware of the breach, in accordance with GDPR Article 33. Notifications will include the nature of the breach, likely consequences, and measures taken.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Supervisory Authority</h2>
            <p>Stiamond SAS is subject to the jurisdiction of the CNIL (Commission Nationale de l'Informatique et des Libertés), the French data protection authority. Complaints can be filed with the CNIL at www.cnil.fr.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
            <p>For GDPR inquiries, DPA requests, or data subject rights: privacy@stiamond.com</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <a href="/" className="text-sm text-indigo-600 hover:underline">← Back to home</a>
        </div>
      </div>
    </div>
  );
}
