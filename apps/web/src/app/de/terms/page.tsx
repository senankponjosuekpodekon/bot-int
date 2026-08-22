import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Allgemeine Geschäftsbedingungen',
  description: 'Stiamond AGB — Nutzungsbedingungen, zulässige Verwendung, Zahlung und Kündigung.',
};

export default function TermsDEPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Allgemeine Geschäftsbedingungen</h1>
        <p className="text-sm text-gray-500 mb-8">Zuletzt aktualisiert: Januar 2026</p>

        <div className="prose prose-gray max-w-none space-y-4 lg:space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Annahme der Bedingungen</h2>
            <p>Durch den Zugriff auf oder die Nutzung von Stiamond („der Dienst") erklären Sie sich mit diesen Allgemeinen Geschäftsbedingungen einverstanden. Wenn Sie nicht einverstanden sind, nutzen Sie den Dienst nicht. Stiamond wird von der Stiamond SAS, einem französischen Unternehmen, betrieben.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Beschreibung des Dienstes</h2>
            <p>Stiamond bietet eine KI-gestützte Konversationsagenten-Plattform, die Unternehmen ermöglicht, Leads zu qualifizieren, Produkte zu empfehlen, Termine zu buchen und Verkäufe über mehrere Kanäle (Web-Chat, E-Mail, SMS, Telegram) zu beeinflussen. Der Dienst umfasst ein Dashboard, API-Zugriff (je nach Tarif) und Integrationen mit Drittanbieterdiensten.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Konten und Abonnements</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Sie müssen bei der Kontoerstellung korrekte Angaben machen.</li>
              <li>Sie sind für die Sicherheit Ihres Kontos und Ihrer API-Schlüssel verantwortlich.</li>
              <li>Der kostenlose Tarif umfasst 50 Konversationen/Monat mit 1 Agenten. Bezahlte Tarife (Starter, Growth, Scale, Enterprise) umfassen zusätzliche Kapazitäten, wie auf unserer Preisseite beschrieben.</li>
              <li>Überziehungskosten fallen an, wenn das Konversationsvolumen die Tarifgrenzen überschreitet.</li>
              <li>Alle bezahlten Tarife enthalten eine 14-tägige kostenlose Testphase. Keine Kreditkarte während der Testphase erforderlich.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Zahlung und Abrechnung</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Abonnements werden monatlich oder jährlich im Voraus über Stripe abgerechnet.</li>
              <li>Preise werden in EUR oder USD je nach gewählter Währung angegeben. Der EUR-Preis ist der Referenzpreis.</li>
              <li>Überziehungskosten werden am Ende jedes Abrechnungszyklus berechnet.</li>
              <li>Eine 30-tägige Geld-zurück-Garantie gilt für alle bezahlten Tarife. Kontaktieren Sie support@stiamond.com für Rückerstattungen.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Kündigung</h2>
            <p>Sie können Ihr Abonnement jederzeit im Dashboard kündigen. Die Kündigung wird am Ende des aktuellen Abrechnungszyklus wirksam. Nach der Kündigung werden keine zusätzlichen Gebühren erhoben. Vorausbezahlte Beträge sind nicht erstattungsfähig, außer unter der 30-tägigen Geld-zurück-Garantie.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Zulässige Verwendung</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Sie dürfen den Dienst nicht für illegale Aktivitäten, Spam, Belästigung oder irreführende Praktiken verwenden.</li>
              <li>Sie dürfen nicht versuchen, den Dienst zu reverse-engineeren, zu dekompilieren oder zu disassemblieren.</li>
              <li>Sie dürfen den Dienst nicht zum Senden unverlangter kommerzieller Nachrichten verwenden.</li>
              <li>Sie sind für die Inhalte verantwortlich, die Ihre KI-Agenten generieren, und müssen die Einhaltung geltender Gesetze sicherstellen.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Daten und Datenschutz</h2>
            <p>Ihre Daten werden gemäß unserer Datenschutzerklärung und der DSGVO verarbeitet. Daten werden in der Europäischen Union gehostet. Sie besitzen Ihre Daten und können diese jederzeit exportieren oder löschen. Siehe unsere <a href="/de/privacy" className="text-indigo-600 hover:underline">Datenschutzerklärung</a> und <a href="/de/gdpr" className="text-indigo-600 hover:underline">DSGVO-Konformität</a> für Details.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Dienstverfügbarkeit</h2>
            <p>Wir streben 99,9 % Verfügbarkeit an (Scale- und Enterprise-Tarife enthalten eine SLA). Wir haften nicht für Ausfälle, die durch Drittanbieterdienste, höhere Gewalt oder geplante Wartung verursacht werden. Servicegutschriften sind für Enterprise-Kunden gemäß den SLA-Bedingungen verfügbar.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Haftungsbeschränkung</h2>
            <p>Stiamond wird „wie besehen" ohne jegliche Gewährleistung bereitgestellt. Wir haften nicht für indirekte, beiläufige oder Folgeschäden. Unsere Gesamthaftung übersteigt nicht den von Ihnen in den 3 Monaten vor der Anspruchserhebung gezahlten Betrag.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Änderung der Bedingungen</h2>
            <p>Wir können diese Bedingungen jederzeit aktualisieren. Wesentliche Änderungen werden mindestens 30 Tage vor Inkrafttreten per E-Mail mitgeteilt. Fortgesetzte Nutzung nach Änderungen gilt als Annahme.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Kontakt</h2>
            <p>Stiamond SAS — E-Mail: support@stiamond.com — Daten in der Europäischen Union gehostet.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <a href="/de" className="text-sm text-indigo-600 hover:underline">← Zurück zur Startseite</a>
        </div>
      </div>
    </div>
  );
}
