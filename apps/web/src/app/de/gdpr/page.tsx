import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DSGVO-Konformität',
  description: 'Stiamond DSGVO-Konformität — EU-Hosting, Tenant-Isolation, AVV und Betroffenenrechte.',
};

export default function GdprDEPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">DSGVO-Konformität</h1>
        <p className="text-sm text-gray-500 mb-8">Zuletzt aktualisiert: Januar 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Überblick</h2>
            <p>Stiamond ist vollständig konform mit der Datenschutz-Grundverordnung (DSGVO, Verordnung EU 2016/679). Als französisches Unternehmen mit Datenhosting in der Europäischen Union verarbeiten wir personenbezogene Daten gemäß den DSGVO-Prinzipien: Rechtmäßigkeit, Fairness, Transparenz, Zweckbindung, Datenminimierung, Richtigkeit, Speicherbegrenzung, Integrität und Rechenschaftspflicht.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">EU-Datenhosting</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Alle Kundendaten werden in der Europäischen Union gehostet (Frankfurt / Frankreich).</li>
              <li>Keine Daten werden in den USA oder anderen nicht-angemessenen Rechtsräumen gespeichert.</li>
              <li>Datenbankverschlüsselung im Ruhezustand (AES-256).</li>
              <li>TLS 1.3-Verschlüsselung bei der Übertragung.</li>
              <li>Tägliche verschlüsselte Backups in EU-Rechenzentren.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Tenant-Isolation</h2>
            <p>Die Daten jedes Kunden sind auf Anwendungsebene logisch isoliert. Jede Datenbankabfrage ist auf die Tenant-ID beschränkt. Tenant-übergreifender Datenzugriff wird auf ORM-Ebene verhindert (TypeORM-Tenant-Scoping). API-Schlüssel sind tenant-spezifisch und mit bcrypt gehasht.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Auftragsverarbeitungsvertrag (AVV)</h2>
            <p>Stiamond agiert sowohl als Verantwortlicher (für Kontodaten) als auch als Auftragsverarbeiter (für Endnutzer-Konversationsdaten) gemäß DSGVO. Ein Auftragsverarbeitungsvertrag ist für Enterprise-Kunden verfügbar und kann unter privacy@stiamond.com angefordert werden. Der AVV umfasst:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Gegenstand und Dauer der Verarbeitung.</li>
              <li>Art und Zweck der Verarbeitung.</li>
              <li>Art der personenbezogenen Daten und Kategorien betroffener Personen.</li>
              <li>Technische und organisatorische Sicherheitsmaßnahmen (TOMs).</li>
              <li>Liste der Auftragsverarbeiter und Änderungsmitteilungen.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Betroffenenrechte</h2>
            <p>Wir erleichtern die Ausübung der Betroffenenrechte gemäß DSGVO Art. 15-22:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Auskunftsrecht (Art. 15):</strong> vollständiger Datenexport im Dashboard verfügbar.</li>
              <li><strong>Recht auf Berichtigung (Art. 16):</strong> Profilbearbeitung im Dashboard.</li>
              <li><strong>Recht auf Löschung (Art. 17):</strong> Kontolöschung entfernt alle zugehörigen Daten innerhalb von 30 Tagen.</li>
              <li><strong>Recht auf Datenübertragbarkeit (Art. 20):</strong> JSON-Export aller Konversationen, Leads und Analytics.</li>
              <li><strong>Widerspruchsrecht (Art. 21):</strong> Abmeldung von Marketing-Kommunikation jederzeit.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Auftragsverarbeiter</h2>
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-3 font-semibold text-gray-900">Verarbeiter</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900">Zweck</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900">Standort</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">Stripe</td>
                  <td className="py-2 px-3">Zahlungsabwicklung</td>
                  <td className="py-2 px-3">EU + US (SCCs)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">SendGrid</td>
                  <td className="py-2 px-3">Transaktions-E-Mail</td>
                  <td className="py-2 px-3">EU + US (SCCs)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">Twilio</td>
                  <td className="py-2 px-3">SMS-Versand (optional)</td>
                  <td className="py-2 px-3">EU + US (SCCs)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">Cloud-Hosting</td>
                  <td className="py-2 px-3">Application & Datenbank-Hosting</td>
                  <td className="py-2 px-3">EU (Frankfurt)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Verletzungsmitteilung</h2>
            <p>Im Falle einer Verletzung personenbezogener Daten benachrichtigt Stiamond betroffene Kunden innerhalb von 72 Stunden nach Kenntnisnahme gemäß DSGVO Art. 33. Benachrichtigungen umfassen die Art der Verletzung, wahrscheinliche Folgen und ergriffene Maßnahmen.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Aufsichtsbehörde</h2>
            <p>Stiamond SAS unterliegt der Zuständigkeit der CNIL (Commission Nationale de l'Informatique et des Libertés), der französischen Datenschutzbehörde. Beschwerden können bei der CNIL unter www.cnil.fr eingereicht werden.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Kontakt</h2>
            <p>Für DSGVO-Anfragen, AVV-Anforderungen oder Betroffenenrechte: privacy@stiamond.com</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <a href="/de" className="text-sm text-indigo-600 hover:underline">← Zurück zur Startseite</a>
        </div>
      </div>
    </div>
  );
}
