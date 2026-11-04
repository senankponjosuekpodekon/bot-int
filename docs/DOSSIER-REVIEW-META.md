# Dossier de revue Meta — Permissions avancées WhatsApp Business (Tech Provider)

Objectif : obtenir les **autorisations avancées de gestion et de messagerie
WhatsApp Business** (erreur #2655111 vue en onboarding), qui débloquent le mode
`whatsapp_business_app_onboarding` (coexistence App WhatsApp Business + Cloud
API) pour l'Embedded Signup.

---

## 1. Où déposer la demande

developers.facebook.com → App **Stiamond** (id `1648868096933302`) →
**Révision de l'app (App Review)** → "Demandes de permissions et
fonctionnalités avancées" → produit **WhatsApp Business**.

Permissions déjà couvertes par la config Embedded Signup actuelle
(`1433508329846191`) : `whatsapp_business_management`,
`whatsapp_business_messaging`, token système sans expiration.
La revue porte sur l'accès **Tech Provider** (onboarding de WABA de clients
tiers + gestion avancée des numéros / messages).

## 2. Texte du use case à soumettre (EN — Meta évalue en anglais)

> Stiamond is a multi-tenant SaaS that lets SMBs deploy AI customer-support
> agents on their own WhatsApp Business numbers. Merchants onboard through
> Embedded Signup; we then register/verify their phone number under their own
> WABA, subscribe the WABA to our app's centralized webhook
> (`POST /{WABA-ID}/subscribed_apps`), and route inbound messages by
> `phone_number_id` to the correct tenant. AI-generated and human-operator
> replies are sent back via `POST /{Phone-Number-ID}/messages`.
>
> We request advanced access to offer the
> `whatsapp_business_app_onboarding` flow (WhatsApp Business App
> coexistence): our merchants already use the WhatsApp Business app on their
> phones and must keep replying there while our AI agent assists via Cloud
> API on the same number. We also use `manage_phone_assets` (number
> registration/verification, profile) and `manage_templates`/`messaging`
> (approved templates for >24h re-engagement, opt-in only).
>
> No bulk messaging, no scraping, no data resale. Each merchant's data is
> isolated per tenant; tokens are stored encrypted (AES-256-GCM) server-side
> and never exposed in the client.

## 3. Version française (pour référence interne)

> Stiamond est un SaaS multi-tenant : les PME connectent leur propre numéro
> WhatsApp Business à un agent IA via Embedded Signup. La plateforme
> enregistre le numéro dans le WABA du client, abonne le WABA au webhook
> centralisé et route les messages par `phone_number_id`. Le mode coexistence
> permet au commerçant de continuer à utiliser son app WhatsApp Business sur
> téléphone pendant que l'IA répond via Cloud API sur le même numéro.

## 4. Scénario de démo (vidéo de 2-3 min à enregistrer)

Meta demande souvent une vidéo montrant le parcours complet. Script :

1. Dashboard `agents.stiamond.net` → Canaux → clic "Connecter WhatsApp".
2. Popup Meta : choix du Business → "Connecter votre compte WhatsApp
   Business existant" (coexistence) → numéro → vérification SMS.
3. Retour dashboard : carte WhatsApp "connectée" (toast).
4. Un client réel envoie "bonjour" au numéro → l'agent IA répond dans
   WhatsApp en quelques secondes.
5. Le commerçant ouvre son app WhatsApp Business sur téléphone → la même
   conversation y apparaît → il tape une réponse depuis le téléphone ET
   depuis le dashboard opérateur → les deux arrivent au client.
6. Montrer la possibilité de déconnecter (app → Outils professionnels →
   plateforme connectée → déconnecter).

## 5. Pièces à joindre

- URL produit : https://agents.stiamond.net (dashboard) + page marketing.
- Compte de test que Meta peut utiliser : créer un tenant "meta-review"
  avec un numéro de test + identifiants dédiés (les donner dans le champ
  "Instructions pour le relecteur").
- Politique de confidentialité publique : https://agents.stiamond.net/privacy
  (déjà servie par l'app — vérifier qu'elle est accessible sans login).
- Raisons sociales du business Meta vérifié (business verification
  complétée — obligatoire pour l'accès avancé).

## 6. Checklist avant soumission

- [ ] Business Meta vérifié (Business Settings → Centre de sécurité).
- [ ] App en mode Live ou bascule prévue.
- [ ] Politique de confidentialité + conditions accessibles publiquement.
- [ ] Screencast du scénario §4 enregistré.
- [ ] Compte de test fonctionnel créé.

## 7. Après approbation (côté code — ~1/2 journée)

- `featureType: 'whatsapp_business_app_onboarding'` dans
  `WhatsAppConnectButton.tsx` (1 ligne, déjà testé).
- Bouton "Déconnecter WhatsApp" → `POST /{Phone-Number-ID}/deregister` +
  suppression de l'intégration tenant.
- Test du flow coexistence complet (réponses depuis le téléphone ET depuis
  l'API sur le même numéro).
