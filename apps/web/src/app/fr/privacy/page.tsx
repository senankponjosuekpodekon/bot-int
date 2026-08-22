import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Politique de Confidentialité",
  description: "Stiamond Agents Politique de Confidentialité — collecte, utilisation et protection de vos données. Conforme RGPD, hébergement UE.",
};

export default function PrivacyFRPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Politique de Confidentialité</h1>
        <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : Janvier 2026</p>

        <div className="prose prose-gray max-w-none space-y-4 lg:space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Responsable du traitement</h2>
            <p>Stiamond Agents SAS est le responsable du traitement des données personnelles traitées via le Service. Les données sont hébergées dans l'Union Européenne (France). Contact : privacy@stiamond.com.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Données collectées</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Données de compte :</strong> nom, email, nom d'entreprise, mot de passe (hashé avec bcrypt).</li>
              <li><strong>Données d'usage :</strong> conversations, leads, étapes du funnel, analytics, appels API.</li>
              <li><strong>Données de paiement :</strong> traitées par Stripe. Nous ne stockons pas les numéros de carte.</li>
              <li><strong>Données techniques :</strong> adresse IP, type de navigateur, informations appareil (sécurité et analytics).</li>
              <li><strong>Données des utilisateurs finaux :</strong> messages envoyés à vos agents IA, informations de contact partagées.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Utilisation de vos données</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fournir et améliorer le Service.</li>
              <li>Traiter les paiements et gérer les abonnements.</li>
              <li>Envoyer des notifications de service (facturation, sécurité, mises à jour).</li>
              <li>Générer des analytics et rapports pour votre tableau de bord.</li>
              <li>Prévenir la fraude, l'abus et les menaces de sécurité.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Base légale (RGPD Article 6)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Contrat :</strong> traitement nécessaire pour fournir le Service auquel vous avez souscrit.</li>
              <li><strong>Obligation légale :</strong> conformité fiscale, comptable et réglementaire UE.</li>
              <li><strong>Intérêt légitime :</strong> sécurité, prévention de la fraude, amélioration du Service.</li>
              <li><strong>Consentement :</strong> pour les analytics et communications marketing optionnelles.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Conservation des données</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Données de compte : conservées tant que le compte est actif. Supprimées dans les 30 jours suivant la fermeture.</li>
              <li>Données de conversation : conservées tant que l'abonnement est actif. Exportables à tout moment.</li>
              <li>Registres de paiement : conservés 10 ans selon les obligations fiscales françaises.</li>
              <li>Logs serveur : conservés 90 jours pour la sécurité.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Partage des données</h2>
            <p>Nous ne vendons pas vos données. Nous partageons des données uniquement avec :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Stripe :</strong> traitement des paiements (conforme PCI-DSS).</li>
              <li><strong>SendGrid :</strong> envoi d'emails transactionnels.</li>
              <li><strong>Twilio :</strong> envoi de SMS (optionnel, uniquement si vous activez le canal SMS).</li>
              <li><strong>Infrastructure cloud :</strong> hébergement UE (AWS Frankfurt ou équivalent).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Vos droits (RGPD)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Accès :</strong> demander une copie de vos données personnelles.</li>
              <li><strong>Rectification :</strong> corriger des données inexactes ou incomplètes.</li>
              <li><strong>Effacement :</strong> demander la suppression de vos données (« droit à l'oubli »).</li>
              <li><strong>Portabilité :</strong> exporter vos données dans un format lisible par machine.</li>
              <li><strong>Opposition :</strong> vous opposer au traitement fondé sur l'intérêt légitime.</li>
              <li><strong>Restriction :</strong> demander une restriction temporaire du traitement.</li>
            </ul>
            <p className="mt-3">Pour exercer ces droits, écrivez à privacy@stiamond.com. Nous répondons dans les 30 jours.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Sécurité</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Isolation par tenant (les données de chaque client sont logiquement séparées).</li>
              <li>Authentification via JWT avec expiration.</li>
              <li>Clés API hashées avec bcrypt.</li>
              <li>Headers de sécurité Helmet (CSP, COOP, Referrer-Policy).</li>
              <li>Rate limiting (100 requêtes/minute par IP).</li>
              <li>Chiffrement HTTPS/TLS en transit.</li>
              <li>Chiffrement de la base de données au repos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Transferts internationaux</h2>
            <p>Les données sont hébergées dans l'Union Européenne. Les sous-traitants (Stripe, SendGrid) peuvent transférer des données hors UE sous les Clauses Contractuelles Types (CCT) ou décisions d'adéquation. Aucune donnée n'est transférée vers des pays sans protection adéquate des données.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Cookies</h2>
            <p>Nous utilisons uniquement des cookies essentiels pour l'authentification et la gestion de session. Nous n'utilisons pas de cookies de tracking, pixels publicitaires ou trackers analytics tiers. Aucune bannière de cookies n'est requise selon l'exception de l'article 5(3) de la directive ePrivacy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p>Stiamond Agents SAS — Email : privacy@stiamond.com — Délégué à la protection des données disponible sur demande.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <a href="/fr" className="text-sm text-indigo-600 hover:underline">← Retour à l'accueil</a>
        </div>
      </div>
    </div>
  );
}
