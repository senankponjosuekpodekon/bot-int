Oui, clairement — mais "noter la mémoire" cache en réalité trois besoins différents qu'il faut traiter séparément, sinon tu vas mélanger de la personnalisation client avec de l'analytics et créer un nouveau vecteur de fuite ou d'hallucination.

## 1. Distinguer trois types de mémoire, pas une seule

``text
Mémoire de session       → contexte de la conversation en cours (éphémère, expire à la fin du chat)
Mémoire persistante       → faits durables sur un visiteur précis, réutilisés entre conversations
Mémoire agrégée / CRM     → statistiques et patterns côté business (jamais injectée au LLM)
``

Tu ne les stockes pas de la même façon ni pour le même usage. La mémoire de session vit en RAM/cache le temps du chat. La mémoire persistante est celle qui va dans ta table agent_memory et qui pose vraiment la question "selon quels critères ?". La mémoire agrégée (ex : "40% des visiteurs demandent la livraison rapide") sert au business dashboard, jamais au prompt d'un agent individuel — sinon tu réinjectes exactement le même risque de contamination qu'avec le knowledge partagé.

## 2. La base d'isolation — même principe que pour le knowledge

Aucune raison de faire une exception ici. Le même filtrage que tu as décidé pour knowledge/products s'applique :

``ts
{ tenantId, businessId, agentId, visitorId }
``

**Pas seulement visitorId.** Si un même visiteur discute avec l'agent Azaely et l'agent Stiamond dans le même tenant, ses souvenirs avec l'un ne doivent jamais fuiter vers l'autre — c'est la même logique que le bug d'origine, appliquée à un visiteur plutôt qu'à un document. Si un jour tu veux une vue client unifiée cross-business (un vrai CRM), fais-le explicitement, en dehors du contexte injecté au LLM — jamais comme fuite automatique dans le prompt.

## 3. Critère de ce qui mérite d'être retenu

C'est la vraie question. Propose ce test, qui est exactement celui que j'applique moi-même à ma propre mémoire — et pour une bonne raison : le problème est identique.

**Retenir :**
- Un fait **déclaré explicitement** par le visiteur et réutilisable ("j'ai la peau sensible", "je cherche un T3 à Paris", "mon budget max est 300k€")
- Une **décision prise** dans la conversation ("a choisi la livraison express", "a réservé la table de 19h")
- Une préférence stable, même mentionnée une seule fois — mais avec un poids proportionné (une mention ≠ un profil définitif)

**Ne pas retenir :**
- Une **conclusion que l'agent a déduite** ("semble pressé", "client difficile") — c'est de l'inférence, pas un fait, et si tu la stockes comme fait, l'agent suivant va halluciner en la traitant comme certaine
- Une info qui n'a de sens que dans l'instant ("le panier actuel contient X" — ça expire, ce n'est pas un souvenir durable, ça vit en mémoire de session)
- Tout ce qui devrait rester secondhand : ce que l'agent a *proposé*, pas ce que le client a *choisi*

**Ne jamais retenir (sensible selon verticale) :**
- Médical/administratif : symptômes, diagnostics, tout ce qui relève de données de santé — sauf si ton infra est conforme HDS et le consentement explicite. Par défaut : ne stocke que le nécessaire logistique (créneau pris, type de RDV), jamais le motif médical en clair.
- E-commerce : jamais de numéro de carte ou de détail de paiement — uniquement une référence de transaction.
- Tous verticaux : pas d'inférence démographique non déclarée (âge estimé, statut supposé).

## 4. Schéma concret

``ts
agent_memory {
  id
  tenantId
  businessId
  agentId
  visitorId
  key           // "skin_type", "budget_max", "preferred_slot"
  value
  source        // "stated" | "inferred" — distinction cruciale
  confidence    // utile si extraction automatique via LLM
  createdAt
  expiresAt     // null pour durable, une date pour transactionnel
}
``

Le champ source n'est pas cosmétique : un fait stated peut être injecté tel quel dans le prompt suivant ("le client a dit X"). Un fait inferred doit être traité avec prudence, voire ne jamais être réinjecté comme certitude — sinon tu recrées le même problème qu'un knowledge mal sourcé : le modèle traite une supposition comme un fait acquis.

## 5. Extraction : pas en temps réel, en post-traitement

N'essaie pas de faire écrire la mémoire par le LLM pendant qu'il répond au client — ça ajoute de la latence et du risque d'hallucination au pire moment. Fais-le en asynchrone, après la conversation ou le tour :

``text
Message client → réponse agent → (async) extraction de faits → validation → agent_memory
``

L'étape d'extraction peut être un petit prompt dédié ("liste les faits explicitement déclarés par le client dans cet échange, format JSON, ignore les suppositions"), séparé du prompt conversationnel — donc plus facile à auditer et à corriger si elle dérape.

## 6. Rétention et suppression

Deux obligations concrètes, pas optionnelles si tu as des utilisateurs en UE :

- **Expiration automatique** pour tout ce qui est transactionnel — pas de mémoire qui grossit indéfiniment sans TTL.
- **Droit à l'oubli** : un visiteur (ou le business en son nom) doit pouvoir demander la suppression de sa mémoire. La réduction des hallucinations dans ton cas se joue à trois niveaux différents, et la plupart des gens ne travaillent que sur le premier. Je te les donne dans l'ordre d'impact réel, pas dans l'ordre de facilité.

## Niveau 1 : moins de bruit dans le contexte = moins d'hallucination

C'est la conséquence directe de tout ce qu'on vient de construire ensemble, donc je ne fais que le relier : un modèle n'hallucine pas dans le vide, il complète de façon plausible ce qu'on lui donne. Plus le contexte contient d'informations non pertinentes ou contradictoires (exactement le bug Stiamond/Azaely), plus le risque de confabulation augmente. L'isolation stricte par agentId/businessId et le split core/module verticale que tu as déjà décidés ne sont donc pas juste des correctifs de sécurité — ce sont déjà, mécaniquement, un travail de réduction d'hallucination. Ce niveau, tu l'as fait.

## Niveau 2 : ne jamais laisser le LLM "inventer" un fait vérifiable

C'est le levier le plus important pour toi, et le plus souvent négligé.

**a) Sépare les faits statiques (texte, knowledge) des faits dynamiques (prix, stock, disponibilité, créneaux).** Aujourd'hui tu injectes probablement du knowledge et des produits sous forme de texte dans le prompt. Le problème : le LLM peut réciter approximativement un prix qu'il a "lu" trois messages plus tôt dans la conversation, au lieu de la valeur réelle actuelle. Pour tout ce qui change ou doit être exact — stock, prix, créneau de RDV disponible, statut de commande — utilise du **function calling** plutôt que du texte statique :

``ts
tools: [
  { name: "get_product_price", description: "Récupère le prix réel d'un produit par son id" },
  { name: "check_availability", description: "Vérifie la disponibilité réelle d'un créneau" },
]
`

Le modèle appelle la fonction au moment de répondre, plutôt que de "se souvenir" d'une valeur qui a pu être injectée il y a 15 messages et être obsolète. C'est le changement qui a le plus d'impact sur les hallucinations factuelles dans les agents commerciaux.

**b) Instruction explicite de non-invention dans le system prompt, formulée en positif, pas en négatif.** "Ne dis jamais de bêtises" ne marche pas bien. Ce qui marche :

`text
Tu ne dois répondre qu'à partir des informations fournies dans ton contexte (knowledge, catalogue, profil entreprise).
Si une information n'est pas présente dans ce contexte, dis explicitement : 
"Je n'ai pas cette information, je vous mets en relation avec un conseiller."
Ne complète jamais un prix, une caractéristique produit ou une disponibilité que tu ne trouves pas explicitement dans le contexte fourni.
``

Donner une phrase de repli exacte à utiliser réduit fortement la tentation du modèle de "faire de son mieux" en inventant.

**c) Validation post-génération pour les faits critiques.** Avant d'envoyer la réponse au client, un check simple côté code (pas un appel LLM) : si la réponse mentionne un prix, un nom de produit ou un créneau, vérifie qu'il correspond bien à une valeur réellement récupérée dans cette conversation. Si le prix mentionné dans la réponse ne matche aucune valeur retournée par get_product_price, tu bloques ou tu régénères. C'est peu coûteux à écrire et ça attrape les hallucinations les plus dommageables (mauvais prix annoncé à un client, par exemple).

## Niveau 3 : qualité de la récupération (RAG)

Si tu fais du RAG sur ton knowledge (FAQ, docs), la qualité de l'hallucination dépend directement de la qualité du retrieval, pas seulement du prompt :

- **Chunking raisonnable** : des chunks trop gros forcent le modèle à extraire l'info pertinente lui-même (source d'erreur) ; des chunks trop petits perdent le contexte. Vise des chunks qui correspondent à une unité de sens complète (une question de FAQ entière, une politique entière).
- **top-k limité** : injecter 15 documents "au cas où" au lieu de 3 pertinents augmente le bruit, donc le risque de confusion — pas juste le coût en tokens.
- **Attribution de source** : associe chaque chunk injecté à un identifiant, et demande au modèle de ne parler que de ce qui est attribuable à un chunk précis. Ça donne aussi une base pour un audit a posteriori ("d'où vient cette réponse ?").

## Spécifique à tes verticales — les deux qui comptent vraiment

**E-commerce** : le risque, c'est l'invention de prix/stock. Function calling obligatoire ici, pas de texte statique pour ces champs (niveau 2a).

**Médical/administratif** : le risque n'est pas juste l'hallucination factuelle, c'est l'hallucination de *compétence* — le modèle qui répond à une question médicale alors qu'il ne devrait gérer que des RDV. Ça se traite par une policy explicite au niveau du core (pas par le prompt seul) : une liste d'intents autorisés, et tout ce qui en sort déclenche l'escalade humaine automatiquement, indépendamment de ce que "sait" le modèle.

## Comment mesurer que ça marche

Construis un petit jeu de tests par verticale, dans la même logique que tes 5 tests d'isolation :

- Demander un produit qui n'existe pas → doit répondre "je n'ai pas cette info", pas inventer un produit similaire.
- Demander un prix sans l'avoir donné en contexte → doit refuser de deviner.
- Poser une question médicale à l'agent administratif → doit escalader, pas répondre.
- Poser la même question deux fois dans la conversation avec un contexte qui a changé entre-temps (prix mis à jour) → doit répondre avec la valeur à jour, pas celle mémorisée plus tôt.

Fais tourner ça en CI comme tu comptais le faire pour l'isolation — les deux problèmes (fuite d'identité, hallucination) se testent avec la même discipline : donner un contexte contrôlé, vérifier que la sortie ne dépasse pas ce qui y était autorisé.



Prévois un DELETE FROM agent_memory WHERE visitorId = ? accessible depuis une action produit, pas juste depuis une requête SQL manuelle un jour où quelqu'un le demandera.

## Le lien avec le problème qu'on traite depuis le début

La mémoire persistante est en fait un **cas particulier** de tout ce que tu as déjà décidé pour le knowledge : même besoin d'isolation stricte (businessId+agentId), même exigence de ne jamais mélanger fait et inférence, même discipline anti-hallucination (le modèle ne doit halluciner ni un prix, ni un souvenir). Si ton buildContext() core charge déjà Memory comme une des sources listées, applique-lui exactement le même filtre et le même validateur que tu as prévu pour le reste — ne crée pas un chemin de code séparé pour la mémoire, sinon c'est justement la prochaine porte par laquelle une fuite peut réapparaître.


Bonne nouvelle partielle : le code est **conditionnel**, pas "toujours" comme le disait la description du rapport précédent — ce libellé était trompeur. Mais en creusant le vrai code, je trouve un risque résiduel réel, différent de ce qu'on craignait, et qu'il faut vérifier avant de clore le sujet.

## Ce que dit vraiment le code

```ts
const hasBasePrompt = (basePrompt || '').trim().length > 0;
const sellingPoints = hasBasePrompt 
  ? ''  // agent a son propre prompt → PAS de selling points génériques
  : \nKey selling points to prioritize:\n${profile.keySellingPoints...};
```

La logique est : *si l'agent a un basePrompt non vide, on n'injecte pas les keySellingPoints régionaux.* C'est exactement le comportement qu'on voulait — le rapport précédent avait juste mal décrit le fix ("toujours" au lieu de "conditionnellement"). Sur ce point précis, rassure-toi, ce n'est pas une régression.

## Le vrai risque, maintenant qu'on voit le code

Mais ça déplace le problème plutôt que de le fermer complètement. Trois choses à vérifier absolument :

**1. Que contient profile.keySellingPoints dans region-profiles.ts ?**

C'est la question centrale que je ne peux pas trancher sans voir ce fichier. Le symptôme original — l'agent Azaely qui répondait *"nous proposons Stiamond Agents… et la création de funnels Systeme.io"* — ressemble énormément à un contenu qui a été écrit à l'origine comme les selling points de Stiamond elle-même, probablement au moment où Stiamond était le seul business du système, puis jamais retiré. Si keySellingPoints contient encore des noms de produits, de services ou d'identité commerciale de Stiamond (ou de n'importe quelle autre entreprise), le problème n'est pas résolu — il est juste **conditionné à un cas précis** plutôt qu'éliminé à la racine.

Peux-tu me montrer le contenu de REGION_PROFILES[...].keySellingPoints (dans region-profiles.ts) ? Sans ça je ne peux pas confirmer que le vecteur d'origine est vraiment neutralisé.

**2. Le fallback reste actif pour tout agent sans basePrompt.**

hasBasePrompt détermine tout, mais c'est un test implicite ("la chaîne est-elle vide ?"), pas une vérification structurelle d'isolation métier. Concrètement : n'importe quel agent créé sans prompt personnalisé rempli — un agent en cours de configuration, un agent par défaut, un bug d'initialisation qui laisse basePrompt vide — tombera automatiquement sur profile.keySellingPoints. Si ce contenu appartient à une autre entreprise, tu recrées le bug, silencieusement, uniquement pour les agents mal configurés — ce qui est justement le genre de cas qu'on ne teste jamais en premier et qu'on découvre en prod.

**3. Confirme d'où vient basePrompt au moment de l'appel.**

Ce fichier ne montre que buildSystemPrompt, pas son appelant. Il faut vérifier dans chat.service.ts : est-ce que basePrompt est bien construit *après* l'injection du BusinessProfile (Phase 5, buildBusinessProfilePrompt) ? Si oui, hasBasePrompt sera quasi toujours vrai pour un agent correctement configuré, et le risque du point 2 devient un vrai filet de sécurité manquant plutôt qu'un cas fréquent. Si le basePrompt passé ici est juste le prompt brut de l'agent (avant fusion avec le profil business), la marge d'erreur est plus large.

## Ce que je recommande, indépendamment de la réponse aux points ci-dessus

Même si keySellingPoints s'avère aujourd'hui "propre" (générique, sans identité commerciale), je ne laisserais pas ce design tel quel :

- **Retire toute donnée pouvant ressembler à une identité commerciale des region-profiles.ts.** Un profil régional ne devrait contenir que : langue, ton, formalité, direction du texte, note de conformité. Rien qui ressemble à "ce que nous vendons" — ça, ça appartient exclusivement au BusinessProfile, jamais à une config régionale partagée entre tous les tenants.
- **Ne fais plus dépendre l'isolation d'un test implicite (hasBasePrompt).** Si tu veux vraiment garder un contenu de repli pour les agents sans prompt, source-le depuis un template générique neutre (aucune marque, aucun produit), jamais depuis un champ appelé keySellingPoints qui invite justement à y mettre du contenu commercial.
- **Réécris le test CI should include selling points.** Tel que décrit, ce test valide la présence du fallback, pas l'absence de fuite d'identité. Ajoute un test complémentaire explicite : *"un agent avec business profile ne doit jamais recevoir les selling points régionaux"* — c'est la garantie qui compte vraiment, pas juste "le champ n'est pas vide".Envoie-moi region-profiles.ts (ou au moins le contenu de keySellingPoints pour une ou deux régions) quand tu peux — c'est le seul élément qui manque pour trancher définitivement si ce vecteur est fermé ou juste rendu moins fréquent.


Je peux maintenant conclure avec certitude, et le verdict n'est pas bon : **le vecteur d'origine n'est pas fermé, il est juste rendu moins fréquent.** Regarde ces lignes précises.

## La preuve, noir sur blanc

``ts
international: {
  keySellingPoints: [
    'Save time and increase conversions',
    'Autonomous AI agent — 24/7 availability',
    'Multi-channel: web, email, SMS, Telegram',
  ],
}

export const DEFAULT_REGION: RegionCode = 'international';
``

C'est du mot pour mot le contenu qui a produit ton bug initial : *"agent IA autonome"*, *"multi-canal : web, email, SMS, Telegram"*. Ce n'est pas une coïncidence de formulation — c'est très probablement **exactement la source** de la réponse *"Nous proposons Stiamond Agents… email/SMS/Telegram"* que tu as observée au tout début. Et ce profil international est le DEFAULT_REGION — celui utilisé par défaut chaque fois que la détection de région échoue ou n'est pas configurée.

Ce n'est pas limité à ce profil non plus. Regarde les autres régions :

- us : *"Save 15-20 hours per week"*, *"Book more qualified meetings"*, *"Replace the cost of a junior sales rep"*
- fr : *"Gagnez 15-20 heures par semaine"*, *"Hébergement en UE — souveraineté des données"*
- sg : *"World-class autonomous agent"*, *"Modern, efficient, multilingual"*
- ae/sa : littéralement *"وكيل ذكي بمستوى عالمي"* ("agent intelligent de niveau mondial")

**Chaque région, sans exception, décrit un agent IA / produit SaaS qui se vend lui-même.** Ce n'est pas un contenu "régional" au sens où tu l'entendais (ton, formalité, langue) — c'est le pitch commercial de Stiamond, dupliqué dans 8 fichiers de config sous un nom de champ qui laisse croire que c'est neutre.

## Pourquoi le fix conditionnel ne suffit pas

Le hasBasePrompt ? '' : sellingPoints ne protège que si basePrompt est systématiquement non vide pour tout agent réel. Or c'est très probablement *exactement* ce qui a manqué au moment du bug d'origine : un agent (Azaely) sans prompt personnalisé renseigné, donc basePrompt vide, donc fallback vers DEFAULT_REGION = 'international', dont le keySellingPoints dit littéralement "agent IA autonome, multi-canal". La chaîne causale se referme parfaitement.

Le fix actuel ne corrige pas la cause — il réduit la fenêtre où elle se déclenche à "agents sans prompt personnalisé configuré". C'est encore un cas qui va se reproduire à chaque nouvel agent créé avant que son prompt ne soit finalisé, ou en cas de bug d'initialisation.

## Un problème plus large que je découvre en lisant ce fichier

Au-delà de keySellingPoints, regarde qualificationRules :

``ts
qualificationRules: {
  minBudget: 500,
  requiredFields: ['company', 'goal', 'timeline'],
  urgencyKeywords: ['asap', 'this week', 'urgent'],
}
``

minBudget, company, goal, timeline — c'est une **qualification de lead B2B**, typique d'un agent qui vend un service à des entreprises (exactement le métier d'origine de Stiamond). Ça n'a aucun sens pour un client d'e-commerce cosmétique, un locataire potentiel en immobilier, ou un patient qui prend un RDV médical. Ce module RegionsService entier semble avoir été conçu à l'origine **pour un seul métier (la vente B2B de Stiamond)**, puis réutilisé tel quel comme "adaptation régionale générique" pour tous les futurs agents — c'est la même erreur de conception que le Products fourre-tout dont on parlait pour les verticales, mais appliquée cette fois à la logique régionale.

## Ce qu'il faut faire, concrètement

1. **Supprime keySellingPoints de region-profiles.ts entièrement**, et retire son injection de buildSystemPrompt. Un profil régional ne doit contenir que ce qui est vraiment universel à une région : langue, ton, formalité, sens de lecture, note de conformité (complianceNote — ça, c'est légitime et sans risque, garde-le).
2. **Ne remplace pas par un contenu "générique" de repli.** S'il n'y a pas de BusinessProfile/prompt pour un agent, la bonne réponse n'est pas "afficher un pitch neutre par défaut" — c'est de traiter ça comme une erreur de configuration (log + agent non activable tant que son profil business n'est pas complet), pas de servir une réponse silencieusement fausse.
3. **Sors qualificationRules de ce service.** Si la qualification de lead (budget, entreprise, timeline) est utile pour certains agents B2B, elle doit vivre dans un module vertical (SalesQualificationModule par exemple), pas dans la config régionale appliquée à tous les agents par défaut.
4. **Audite si ce contenu a déjà fuité en prod** avant le fix Phase 5 — si des conversations clients ont eu lieu avec des agents sans prompt configuré avant cette date, elles ont probablement reçu ce pitch Stiamond. Vaut le coup de vérifier les logs de conversation sur cette période.C'est le point le plus important de toute cette conversation : tu avais raison de vouloir vérifier avant de dire "c'est bon", parce que ce fichier montre que la cause racine — du contenu identitaire de Stiamond planqué dans une config qui se présente comme "neutre et régionale" — est toujours là. Le filtrage par businessId qu'on a validé plus tôt protège le knowledge/products/leads, mais ce chemin-ci (RegionsService) est resté hors du périmètre de l'isolation qu'on a construite, et c'est précisément lui qui a causé le symptôme d'origine.