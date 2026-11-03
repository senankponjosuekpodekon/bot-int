# Roadmap produit — Stiamond (bot-int)

Propositions pour rendre le SaaS rentable et compétitif, basées sur ce que la
plateforme fait déjà et ce que l'API Meta officielle permet
(`business-messaging-api_v23.0.yaml` — spec OpenAPI officielle).

## Concurrence et positionnement

| Concurrent | Prix (≈) | Notre différenciation possible |
|---|---|---|
| Intercom | 74$/siège/mois + Fin AI 0.99$/résolution | Prix/lead, pas par siège |
| Zendesk | 55$/siège/mois | Idem + IA incluse |
| WATI / AiSensy | 30-80$/mois | Multi-tenant natif, onboarding 2 clics |
| respond.io | 79$/mois | Focus WhatsApp uniquement |
| Twilio + dev custom | dev + API | Zero-config pour non-tech |

**Angle d'attaque** : marché africain/francophone sous-servi — interface FR,
tarification adaptée, Mobile Money en plus de Stripe, support WhatsApp natif
(WATI/respond.io ne font que WhatsApp ; Intercom/Zendesk sont chers et en
anglais d'abord).

## Court terme (quick wins, endpoints déjà dans le spec)

1. **Templates WhatsApp** (`/{WABA-ID}/message_templates`) — messages proactifs
   hors fenêtre 24h : relance de leads, confirmation de RDV, rappels.
   → Vendable en add-on ou palier supérieur (Meta facture par conversation
   template — marge possible).
2. **Catalogue produits WhatsApp** (`/{Phone-Number-ID}/whatsapp_commerce_settings`
   + messages `type: product_list`) — le tenant vend directement dans WhatsApp.
   → Différenciateur fort pour l'e-commerce.
3. **QR codes** (`/{Phone-Number-ID}/message_qrdls`) — QR pré-rempli "parlez au bot"
   à imprimer en magasin. → Fonction marketing facile, très visible.
4. **Media upload** (`/{Phone-Number-ID}/media`, `/{Media-ID}`) — envoyer images,
   PDF devis, catalogues dans les réponses. → Complète `MediaParserService`
   (inbound déjà fait).
5. **Enrichir l'Embedded Signup** — le spec décrit le flow complet (register,
   request_code, verify_code, business_profile) → onboarding in-app complet
   pour les clients WhatsApp Business App aussi (MM Lite).

## Moyen terme (revenus récurrents)

6. **Reprise opérateur multi-agent** — file d'attente, transferts entre
   opérateurs, notes internes, CSAT post-conversation. → Justifie un palier
   "Team" à ~49-79€/mois.
7. **Analytics par canal** — temps de première réponse, taux de résolution IA
   vs humain, coût par conversation. → Argument de vente #1 ("notre IA
   résout X% sans humain").
8. **Broadcast/segmentation** — listes de diffusion WhatsApp opt-in depuis le
   CRM existant. → Les concurrents facturent cher ici.
9. **Facturation locale** — Mobile Money (MTN, Moov) + Stripe. → Débloque
   le marché cible.
10. **Marketplace d'agents** — templates d'agents par secteur (restaurant,
    immo, e-commerce, médical) déjà pré-configurés avec knowledge de base.
    → Onboarding <10 min = rétention.

## Long terme (différenciation structurelle)

11. **Voix** — WhatsApp Business Calling (`/{Phone-Number-ID}/calls`) dans le
    spec : agent vocal IA. Personne ne le fait bien encore.
12. **Omnicanal unifié** — Instagram DMs et Messenger déjà câblés côté code ;
    ajouter TikTok/LinkedIn. Respond.io le fait, Intercom non.
13. **White label** — revendeurs/agences locales revendent la plateforme sous
    leur marque (multi-tenant déjà natif — atout architectural).
14. **Conformité** — RGPD-ready (DPA, rétention configurable, export données)
    ouvre le marché européen ; les challengers africains l'ignorent.

## Références techniques

- Spec Meta : https://github.com/meta/openapi (`business-messaging-api_v23.0.yaml`)
- Version Graph actuelle : `META_GRAPH_VERSION` (env, défaut `v21.0`)
- À surveiller : MM Lite API (onboarding allégé, meilleur pricing par Meta)
