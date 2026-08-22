import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Stiamond Terms of Service — usage conditions, acceptable use, payment terms, and cancellation policy.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 2026</p>

        <div className="prose prose-gray max-w-none space-y-4 lg:space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Stiamond ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. Stiamond is operated by Stiamond SAS, a French company.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>Stiamond provides an AI-powered conversational agent platform that enables businesses to qualify leads, recommend products, book appointments, and influence sales across multiple channels (web chat, email, SMS, Telegram). The Service includes a dashboard, API access (depending on plan), and integrations with third-party services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Accounts and Subscriptions</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account and API keys.</li>
              <li>Free plan includes 50 conversations/month with 1 agent. Paid plans (Starter, Growth, Scale, Enterprise) include additional capacity as described on our pricing page.</li>
              <li>Overage charges apply when conversation volume exceeds plan limits.</li>
              <li>All paid plans include a 14-day free trial. No credit card required during trial.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Payment and Billing</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Subscriptions are billed monthly or yearly in advance via Stripe.</li>
              <li>Prices are listed in EUR or USD depending on your selected currency. The EUR price is the reference price.</li>
              <li>Overage charges are billed at the end of each billing cycle.</li>
              <li>A 30-day money-back guarantee applies to all paid plans. Contact support@stiamond.com for refunds.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cancellation</h2>
            <p>You can cancel your subscription at any time from the dashboard. Cancellation takes effect at the end of the current billing cycle. No additional charges will be applied after cancellation. Prepaid amounts are non-refundable except under the 30-day money-back guarantee.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Acceptable Use</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You may not use the Service for illegal activities, spam, harassment, or deceptive practices.</li>
              <li>You may not attempt to reverse engineer, decompile, or disassemble the Service.</li>
              <li>You may not use the Service to send unsolicited commercial messages.</li>
              <li>You are responsible for the content your AI agents generate and must ensure compliance with applicable laws.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Data and Privacy</h2>
            <p>Your data is processed in accordance with our Privacy Policy and the GDPR. Data is hosted in the European Union. You own your data and may export or delete it at any time. See our <a href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</a> and <a href="/gdpr" className="text-indigo-600 hover:underline">GDPR Compliance</a> for details.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Service Availability</h2>
            <p>We strive for 99.9% uptime (Scale and Enterprise plans include SLA). We are not liable for downtime caused by third-party services, force majeure, or scheduled maintenance. Service credits are available for Enterprise customers per the SLA terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
            <p>Stiamond is provided "as is" without warranties of any kind. We are not liable for indirect, incidental, or consequential damages. Our total liability shall not exceed the amount paid by you in the 3 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
            <p>We may update these Terms at any time. Material changes will be notified by email at least 30 days before taking effect. Continued use after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p>Stiamond SAS — Email: support@stiamond.com — Data hosted in the European Union.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <a href="/" className="text-sm text-indigo-600 hover:underline">← Back to home</a>
        </div>
      </div>
    </div>
  );
}
