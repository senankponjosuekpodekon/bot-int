# Manuel utilisateur — Stiamond

Guide pas-à-pas pour utiliser la plateforme, sans connaissance technique.

---

## 1. Première connexion

1. Ouvrez `https://agents.stiamond.net` dans votre navigateur.
2. Connectez-vous avec l'email et le mot de passe fournis par votre administrateur (ou créez un compte via "S'inscrire").
3. Vous arrivez sur le **Tableau de bord** : vue d'ensemble de vos agents, conversations et leads.

> Si vous oubliez votre mot de passe, utilisez "Mot de passe oublié" sur la page de connexion.

---

## 2. Créer un agent IA

Menu latéral → **Agents** → **Nouvel agent**.

Remplissez :
- **Nom** : comment l'agent s'appelle (ex. "Assistant Boutique").
- **Secteur / Industry** : choisissez le domaine (ex. *ecommerce* pour une boutique — important : cela adapte le comportement de l'agent aux clients particuliers).
- **Personnalité / Prompt** : décrivez le ton et les consignes de l'agent en français courant (ex. "Tu es l'assistant de la boutique X. Tu réponds de façon chaleureuse et concise. Tu ne promets jamais de remise qui n'est pas affichée.").
- Activez l'agent (interrupteur) et **Enregistrez**.

> L'agent ne peut répondre que sur ce qu'il connaît : ajoutez vos informations dans la base de connaissances (section 3) pour éviter les réponses inventées.

---

## 3. Base de connaissances (Knowledge)

Menu → **Knowledge** → **Ajouter un document**.

Ajoutez vos fiches : produits/services, tarifs, horaires, politique de retour et de livraison, garanties, FAQ. Pour chaque document :
- **Titre** clair (ex. "Politique de retour — Boutique X").
- **Contenu** : texte simple et factuel. Écrivez les durées exactes (ex. "retour possible sous 14 jours") — l'agent recopiera ces chiffres tels quels et refusera d'en inventer.

Modifiez un document existant quand vos infos changent : l'agent utilise toujours la version la plus récente.

---

## 4. Connecter WhatsApp (2 clics)

Prérequis : un compte Facebook/Meta relié à votre entreprise, et le numéro de téléphone à utiliser.

1. Menu → **Canaux** → carte **WhatsApp**.
2. Cliquez **Connecter WhatsApp (onboarding Meta)**.
3. Une fenêtre Meta s'ouvre : connectez-vous à Facebook si demandé, puis cliquez **Continuer**.
4. Choisissez votre **compte Business** (ou créez-le : nom + site web).
5. Choisissez votre **compte WhatsApp Business** ou créez-le (nom affiché = ce que vos clients verront).
6. Entrez le **numéro de téléphone** de votre business → Meta envoie un **code par SMS ou appel** → saisissez-le.
7. Cliquez **Continuer** → la fenêtre se ferme et le message **"WhatsApp connecté"** apparaît.

Terminé — aucune configuration technique n'est nécessaire (webhook, token et vérification sont gérés automatiquement par la plateforme).

**Tester** : envoyez un message WhatsApp à votre numéro depuis un autre téléphone → l'agent répond en quelques secondes.

> Numéro de test Meta : si vous démarrez avec le numéro de test fourni par Meta, seuls les contacts que vous avez autorisés dans votre console Meta peuvent écrire. Passez à votre vrai numéro dès que possible.

---

## 5. Suivre les conversations

- **Chat / Conversations** : historique des échanges de vos agents, tous canaux confondus.
- **Operator** : reprise en main — un humain peut prendre le relais d'une conversation si l'agent marque un besoin d'assistance.

## 6. Leads et pipeline

- **Leads** : contacts capturés automatiquement pendant les conversations (nom, contact, score).
- **Pipeline / Quotes / Products** : suivez vos prospects, créez des devis, gérez votre catalogue.

## 7. Analytics

Menu → **Analytics** : volumes de conversations, taux de conversion en leads, canaux les plus utilisés, satisfaction.

## 8. Paramètres

Menu → **Settings** : informations de votre organisation, préférences, facturation (Billing).

---

## 9. Console Super Admin (rôle super_admin uniquement)

Menu → couronne **Super Admin** :
- **Overview** : statistiques globales de la plateforme.
- **Tenants** : liste des organisations clientes — détail, activation/désactivation, changement de plan, suppression.
- **Users** : créer un utilisateur, changer son rôle (viewer → super_admin), activer/désactiver, réinitialiser le mot de passe.
- **Conversations** : vue transverse sur tous les tenants.

> Le lien "Super Admin" n'apparaît que si votre rôle est `super_admin`. La promotion se fait via la variable `SUPER_ADMIN_EMAIL` côté serveur — reconnectez-vous après promotion pour obtenir un jeton à jour.

---

## 10. Dépannage

| Problème | Cause probable | Solution |
|---|---|---|
| Le bouton WhatsApp n'apparaît pas | Variables `NEXT_PUBLIC_META_*` absentes côté web | Vérifier la configuration serveur |
| Clic sur le bouton ne fait rien | Popup bloquée | Autoriser les popups du site, réessayer |
| "Échec de la connexion WhatsApp" | App Meta en mode Dev / code expiré | App en mode Live, refaire le flow |
| L'agent ne répond pas sur WhatsApp | Intégration désactivée ou agent inactif | Canaux → activer ; Agents → activer |
| L'agent invente une politique | Info absente de la base knowledge | Ajouter une fiche avec les chiffres exacts |
| Réponses très lentes | LLM distant lent | Attendu ~5-10 s ; vérifier la config serveur |

---

*Version : novembre 2026 — correspond au code de la branche `dev`.*
