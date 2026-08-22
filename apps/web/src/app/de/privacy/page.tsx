import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Stiamond Datenschutzerklärung — Erhebung, Verwendung und Schutz Ihrer Daten. DSGVO-konform, EU-Hosting.',
};

export default function PrivacyDEPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Datenschutzerklärung</h1>
        <p className="text-sm text-gray-500 mb-8">Zuletzt aktualisiert: Januar 2026</p>

        <div className="prose prose-gray max-w-none space-y-4 lg:space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Verantwortlicher</h2>
            <p>Stiamond SAS ist der Verantwortliche für die über den Dienst verarbeiteten personenbezogenen Daten. Daten werden in der Europäischen Union (Frankreich) gehostet. Kontakt: privacy@stiamond.com.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Erhobene Daten</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Kontodaten:</strong> Name, E-Mail, Firmenname, Passwort (mit bcrypt gehasht).</li>
              <li><strong>Nutzungsdaten:</strong> Konversationen, Leads, Funnel-Phasen, Analytics, API-Aufrufe.</li>
              <li><strong>Zahlungsdaten:</strong> von Stripe verarbeitet. Wir speichern keine Kreditkartennummern.</li>
              <li><strong>Technische Daten:</strong> IP-Adresse, Browsertyp, Geräteinformationen (für Sicherheit und Analytics).</li>
              <li><strong>Endnutzerdaten:</strong> Nachrichten an Ihre KI-Agenten, während Konversationen geteilte Kontaktinformationen.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Verwendung Ihrer Daten</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Zur Bereitstellung und Verbesserung des Dienstes.</li>
              <li>Zur Verarbeitung von Zahlungen und Verwaltung von Abonnements.</li>
              <li>Zum Senden von Service-Benachrichtigungen (Abrechnung, Sicherheit, Produkt-Updates).</li>
              <li>Zur Erstellung von Analytics und Berichten für Ihr Dashboard.</li>
              <li>Zur Betrugsprävention und Abwehr von Sicherheitsbedrohungen.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Rechtsgrundlage (DSGVO Art. 6)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Vertrag:</strong> Verarbeitung erforderlich zur Bereitstellung des abonnierten Dienstes.</li>
              <li><strong>Rechtliche Verpflichtung:</strong> Einhaltung steuerlicher, buchhalterischer und EU-rechtlicher Vorschriften.</li>
              <li><strong>Berechtigtes Interesse:</strong> Sicherheit, Betrugsvorbeugung und Dienstverbesserung.</li>
              <li><strong>Einwilligung:</strong> für optionale Analytics und Marketing-Kommunikation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Datenspeicherung</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Kontodaten: werden gespeichert, solange das Konto aktiv ist. Innerhalb von 30 Tagen nach Kontoschließung gelöscht.</li>
              <li>Konversationsdaten: werden während der aktiven Subscription gespeichert. Jederzeit exportierbar.</li>
              <li>Zahlungsunterlagen: 10 Jahre gemäß französischen Steuerpflichten aufbewahrt.</li>
              <li>Server-Logs: 90 Tage zu Sicherheitszwecken aufbewahrt.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Datenweitergabe</h2>
            <p>Wir verkaufen Ihre Daten nicht. Daten teilen wir nur mit:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Stripe:</strong> Zahlungsabwicklung (PCI-DSS-konform).</li>
              <li><strong>SendGrid:</strong> Transaktions-E-Mail-Versand.</li>
              <li><strong>Twilio:</strong> SMS-Versand (optional, nur wenn Sie den SMS-Kanal aktivieren).</li>
              <li><strong>Cloud-Infrastruktur:</strong> EU-basiertes Hosting (AWS Frankfurt oder vergleichbar).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Ihre Rechte (DSGVO)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Auskunft:</strong> Kopie Ihrer personenbezogenen Daten anfordern.</li>
              <li><strong>Berichtigung:</strong> unrichtige oder unvollständige Daten korrigieren.</li>
              <li><strong>Löschung:</strong> Löschung Ihrer Daten verlangen („Recht auf Vergessenwerden").</li>
              <li><strong>Portabilität:</strong> Daten in maschinenlesbarem Format exportieren.</li>
              <li><strong>Widerspruch:</strong> der auf berechtigtem Interesse beruhenden Verarbeitung widersprechen.</li>
              <li><strong>Einschränkung:</strong> vorübergehende Einschränkung der Verarbeitung verlangen.</li>
            </ul>
            <p className="mt-3">Zur Ausübung dieser Rechte schreiben Sie an privacy@stiamond.com. Wir antworten innerhalb von 30 Tagen.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Sicherheit</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tenant-Isolation (Daten jedes Kunden logisch getrennt).</li>
              <li>Authentifizierung via JWT mit Ablauf.</li>
              <li>API-Schlüssel mit bcrypt gehasht.</li>
              <li>Helmet-Sicherheitsheader (CSP, COOP, Referrer-Policy).</li>
              <li>Rate-Limiting (100 Anfragen/Minute pro IP).</li>
              <li>HTTPS/TLS-Verschlüsselung bei der Übertragung.</li>
              <li>Datenbankverschlüsselung im Ruhezustand.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Internationale Übertragungen</h2>
            <p>Daten werden in der Europäischen Union gehostet. Auftragsverarbeiter (Stripe, SendGrid) können Daten außerhalb der EU unter Standardvertragsklauseln (SCCs) oder Angemessenheitsbeschlüssen übertragen. Es werden keine Daten in Länder ohne angemessenen Datenschutz übertragen.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Cookies</h2>
            <p>Wir verwenden ausschließlich essenzielle Cookies für Authentifizierung und Sitzungsverwaltung. Wir verwenden keine Tracking-Cookies, Werbe-Pixel oder Drittanbieter-Analytics-Tracker. Keine Cookie-Banner erforderlich gemäß Ausnahme in Art. 5(3) ePrivacy-Richtlinie.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Kontakt</h2>
            <p>Stiamond SAS — E-Mail: privacy@stiamond.com — Datenschutzbeauftragter auf Anfrage verfügbar.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <a href="/de" className="text-sm text-indigo-600 hover:underline">← Zurück zur Startseite</a>
        </div>
      </div>
    </div>
  );
}
