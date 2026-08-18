import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
  description: "Stiamond CGU — conditions d'utilisation, politique d'usage acceptable, paiement et résiliation.",
};

export default function TermsFRPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Conditions Générales d'Utilisation</h1>
        <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : Janvier 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptation des conditions</h2>
            <p>En accédant ou en utilisant Stiamond (« le Service »), vous acceptez d'être lié par ces Conditions Générales d'Utilisation. Si vous n'acceptez pas, n'utilisez pas le Service. Stiamond est exploité par Stiamond SAS, société française.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description du Service</h2>
            <p>Stiamond fournit une plateforme d'agents IA conversationnels permettant aux entreprises de qualifier des leads, recommander des produits, prendre des rendez-vous et influencer les ventes sur plusieurs canaux (web chat, email, SMS, Telegram). Le Service inclut un tableau de bord, un accès API (selon le plan) et des intégrations avec des services tiers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Comptes et abonnements</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Vous devez fournir des informations exactes lors de la création de compte.</li>
              <li>Vous êtes responsable de la sécurité de votre compte et de vos clés API.</li>
              <li>Le plan Free inclut 50 conversations/mois avec 1 agent. Les plans payants (Starter, Growth, Scale, Enterprise) incluent des capacités supplémentaires décrites sur notre page tarifs.</li>
              <li>Des frais d'overage s'appliquent quand le volume de conversations dépasse les limites du plan.</li>
              <li>Tous les plans payants incluent un essai gratuit de 14 jours sans carte bancaire.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Paiement et facturation</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Les abonnements sont facturés mensuellement ou annuellement à l'avance via Stripe.</li>
              <li>Les prix sont indiqués en EUR ou USD selon la devise sélectionnée. Le prix en EUR est le prix de référence.</li>
              <li>Les frais d'overage sont facturés à la fin de chaque cycle de facturation.</li>
              <li>Une garantie satisfait ou remboursé de 30 jours s'applique à tous les plans payants. Contactez support@stiamond.com pour les remboursements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Résiliation</h2>
            <p>Vous pouvez résilier votre abonnement à tout moment depuis le tableau de bord. La résiliation prend effet à la fin du cycle de facturation en cours. Aucun frais supplémentaire ne sera appliqué après résiliation. Les montants prépayés sont non remboursables sauf dans le cadre de la garantie 30 jours.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Usage acceptable</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Vous ne pouvez pas utiliser le Service pour des activités illégales, spam, harcèlement ou pratiques trompeuses.</li>
              <li>Vous ne pouvez pas tenter de reverse engineer, décompiler ou désassembler le Service.</li>
              <li>Vous ne pouvez pas utiliser le Service pour envoyer des messages commerciaux non sollicités.</li>
              <li>Vous êtes responsable du contenu généré par vos agents IA et devez vous assurer de la conformité avec les lois applicables.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Données et confidentialité</h2>
            <p>Vos données sont traitées conformément à notre Politique de Confidentialité et au RGPD. Les données sont hébergées dans l'Union Européenne. Vous êtes propriétaire de vos données et pouvez les exporter ou supprimer à tout moment. Voir notre <a href="/fr/privacy" className="text-indigo-600 hover:underline">Politique de Confidentialité</a> et <a href="/fr/gdpr" className="text-indigo-600 hover:underline">Conformité RGPD</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Disponibilité du Service</h2>
            <p>Nous visons 99,9% de disponibilité (les plans Scale et Enterprise incluent un SLA). Nous ne sommes pas responsables des interruptions causées par des services tiers, cas de force majeure ou maintenance programmée. Des crédits de service sont disponibles pour les clients Enterprise selon les termes du SLA.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Limitation de responsabilité</h2>
            <p>Stiamond est fourni « tel quel » sans garantie d'aucune sorte. Nous ne sommes pas responsables des dommages indirects, accessoires ou consécutifs. Notre responsabilité totale ne dépassera pas le montant payé par vous dans les 3 mois précédant la réclamation.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Modification des conditions</h2>
            <p>Nous pouvons mettre à jour ces Conditions à tout moment. Les modifications importantes seront notifiées par email au moins 30 jours avant leur entrée en vigueur. L'utilisation continue après les modifications vaut acceptation.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p>Stiamond SAS — Email : support@stiamond.com — Données hébergées dans l'Union Européenne.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <a href="/fr" className="text-sm text-indigo-600 hover:underline">← Retour à l'accueil</a>
        </div>
      </div>
    </div>
  );
}
