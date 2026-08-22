import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Conformité RGPD",
  description: "Stiamond conformité RGPD — hébergement UE, isolation par tenant, DPA et droits des personnes concernées.",
};

export default function GdprFRPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Conformité RGPD</h1>
        <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : Janvier 2026</p>

        <div className="prose prose-gray max-w-none space-y-4 lg:space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Vue d'ensemble</h2>
            <p>Stiamond est entièrement conforme au Règlement Général sur la Protection des Données (RGPD, Règlement UE 2016/679). En tant que société française hébergeant les données dans l'Union Européenne, nous traitons les données personnelles conformément aux principes du RGPD : licéité, loyauté, transparence, limitation des finalités, minimisation, exactitude, limitation de conservation, intégrité et responsabilité.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Hébergement des données en UE</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Toutes les données clients sont hébergées dans l'Union Européenne (France / Francfort).</li>
              <li>Aucune donnée n'est stockée aux États-Unis ou dans d'autres juridictions non adéquates.</li>
              <li>Chiffrement de la base de données au repos (AES-256).</li>
              <li>Chiffrement TLS 1.3 en transit.</li>
              <li>Sauvegardes chiffrées quotidiennes conservées dans des data centers UE.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Isolation par tenant</h2>
            <p>Les données de chaque client sont logiquement isolées au niveau applicatif. Chaque requête de base de données est limitée à l'ID du tenant. L'accès aux données entre tenants est empêché au niveau de l'ORM (TypeORM tenant scoping). Les clés API sont limitées par tenant et hashées avec bcrypt.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Accord de Traitement des Données (DPA)</h2>
            <p>Stiamond agit à la fois comme responsable du traitement (pour les données de compte) et sous-traitant (pour les données de conversation des utilisateurs finaux) au titre du RGPD. Un Accord de Traitement des Données est disponible pour les clients Enterprise et peut être demandé à privacy@stiamond.com. Le DPA couvre :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Objet et durée du traitement.</li>
              <li>Nature et finalité du traitement.</li>
              <li>Type de données personnelles et catégories de personnes concernées.</li>
              <li>Mesures techniques et organisationnelles de sécurité (TOM).</li>
              <li>Liste des sous-traitants et notification des changements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Droits des personnes concernées</h2>
            <p>Nous facilitons l'exercice des droits des personnes concernées tels que définis aux articles 15-22 du RGPD :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Droit d'accès (Art. 15) :</strong> export complet des données disponible dans le tableau de bord.</li>
              <li><strong>Droit de rectification (Art. 16) :</strong> édition du profil dans le tableau de bord.</li>
              <li><strong>Droit à l'effacement (Art. 17) :</strong> la suppression de compte supprime toutes les données associées dans les 30 jours.</li>
              <li><strong>Droit à la portabilité (Art. 20) :</strong> export JSON de toutes les conversations, leads et analytics.</li>
              <li><strong>Droit d'opposition (Art. 21) :</strong> désinscription des communications marketing à tout moment.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Sous-traitants</h2>
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-3 font-semibold text-gray-900">Sous-traitant</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900">Finalité</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900">Localisation</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">Stripe</td>
                  <td className="py-2 px-3">Traitement des paiements</td>
                  <td className="py-2 px-3">UE + US (CCT)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">SendGrid</td>
                  <td className="py-2 px-3">Email transactionnel</td>
                  <td className="py-2 px-3">UE + US (CCT)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">Twilio</td>
                  <td className="py-2 px-3">Envoi SMS (optionnel)</td>
                  <td className="py-2 px-3">UE + US (CCT)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-2 px-3">Hébergement cloud</td>
                  <td className="py-2 px-3">Hébergement application & BDD</td>
                  <td className="py-2 px-3">UE (Francfort)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Notification de violation</h2>
            <p>En cas de violation de données personnelles, Stiamond notifiera les clients concernés dans les 72 heures après en avoir pris connaissance, conformément à l'article 33 du RGPD. Les notifications incluront la nature de la violation, les conséquences probables et les mesures prises.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Autorité de contrôle</h2>
            <p>Stiamond SAS relève de la compétence de la CNIL (Commission Nationale de l'Informatique et des Libertés), l'autorité française de protection des données. Des plaintes peuvent être déposées auprès de la CNIL sur www.cnil.fr.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
            <p>Pour les questions RGPD, demandes de DPA ou droits des personnes : privacy@stiamond.com</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <a href="/fr" className="text-sm text-indigo-600 hover:underline">← Retour à l'accueil</a>
        </div>
      </div>
    </div>
  );
}
