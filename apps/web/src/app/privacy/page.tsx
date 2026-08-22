import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Stiamond Agents Privacy Policy — how we collect, use, and protect your data. GDPR compliant, EU-hosted.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 2026</p>

        <div className="prose prose-gray max-w-none space-y-4 lg:space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Data Controller</h2>
            <p>Stiamond Agents SAS is the data controller for personal data processed through the Service. Data is hosted in the European Union (France). Contact: privacy@stiamond.com.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Data We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account data:</strong> name, email, company name, password (hashed with bcrypt).</li>
              <li><strong>Usage data:</strong> conversations, leads, funnel stages, analytics, API calls.</li>
              <li><strong>Payment data:</strong> processed by Stripe. We do not store credit card numbers.</li>
              <li><strong>Technical data:</strong> IP address, browser type, device info (for security and analytics).</li>
              <li><strong>End-user data:</strong> messages sent to your AI agents, contact information shared during conversations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and improve the Service.</li>
              <li>To process payments and manage subscriptions.</li>
              <li>To send service notifications (billing, security, product updates).</li>
              <li>To generate analytics and reports for your dashboard.</li>
              <li>To prevent fraud, abuse, and security threats.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Legal Basis (GDPR Article 6)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Contract:</strong> processing necessary to deliver the Service you subscribed to.</li>
              <li><strong>Legal obligation:</strong> compliance with tax, accounting, and EU regulations.</li>
              <li><strong>Legitimate interest:</strong> security, fraud prevention, and service improvement.</li>
              <li><strong>Consent:</strong> for optional analytics and marketing communications.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account data: retained while your account is active. Deleted within 30 days of account closure.</li>
              <li>Conversation data: retained while your subscription is active. Exportable at any time.</li>
              <li>Payment records: retained for 10 years per French tax law requirements.</li>
              <li>Server logs: retained for 90 days for security purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Sharing</h2>
            <p>We do not sell your data. We share data only with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Stripe:</strong> payment processing (PCI-DSS compliant).</li>
              <li><strong>SendGrid:</strong> transactional email delivery.</li>
              <li><strong>Twilio:</strong> SMS delivery (optional, only if you enable SMS channel).</li>
              <li><strong>Cloud infrastructure provider:</strong> EU-based hosting (AWS Frankfurt or equivalent).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights (GDPR)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> request a copy of your personal data.</li>
              <li><strong>Rectification:</strong> correct inaccurate or incomplete data.</li>
              <li><strong>Erasure:</strong> request deletion of your data ("right to be forgotten").</li>
              <li><strong>Portability:</strong> export your data in a machine-readable format.</li>
              <li><strong>Objection:</strong> object to processing based on legitimate interest.</li>
              <li><strong>Restriction:</strong> request temporary restriction of processing.</li>
            </ul>
            <p className="mt-3">To exercise these rights, email privacy@stiamond.com. We respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Security</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Data is tenant-isolated (each customer's data is logically separated).</li>
              <li>Authentication via JWT with expiration.</li>
              <li>API keys hashed with bcrypt.</li>
              <li>Helmet security headers (CSP, COOP, Referrer-Policy).</li>
              <li>Rate limiting (100 requests/minute per IP).</li>
              <li>HTTPS/TLS encryption in transit.</li>
              <li>Database encryption at rest.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. International Transfers</h2>
            <p>Data is hosted in the European Union. Third-party processors (Stripe, SendGrid) may transfer data outside the EU under Standard Contractual Clauses (SCCs) or adequacy decisions. No data is transferred to countries without adequate data protection.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Cookies</h2>
            <p>We use only essential cookies for authentication and session management. We do not use tracking cookies, advertising pixels, or third-party analytics trackers. No cookie banner is required under ePrivacy Directive Article 5(3) exception.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p>Stiamond Agents SAS — Email: privacy@stiamond.com — Data Protection Officer available upon request.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <a href="/" className="text-sm text-indigo-600 hover:underline">← Back to home</a>
        </div>
      </div>
    </div>
  );
}
