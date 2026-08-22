# Déploiement Stiamond : Vercel (web) + Render (API)

## Architecture

- **Branche de déploiement** : `dev` (Render Blueprint et Vercel Production Branch doivent pointer sur `dev`)
- **Frontend (Next.js)** : [Vercel](https://vercel.com) → `apps/web`
- **Backend (NestJS)** : [Render](https://render.com) → `apps/api` via `Dockerfile.api`
- **Base de données** :
  - PostgreSQL : Render managed PostgreSQL (`render.yaml`)
  - Redis : external (Upstash, Redis Cloud, ou Render Redis si disponible)

## 1. Déployer l’API sur Render

### Avec Render Blueprint

1. Connecte ton repo GitHub à Render.
2. Utilise le bouton **Blueprints** et sélectionne `render.yaml`.
3. Render va créer :
   - Web Service `stiamond-api` depuis `Dockerfile.api`
   - PostgreSQL `stiamond-pg`
4. Renseigne les variables synchronisées manuellement dans le service `stiamond-api` :
   - `REDIS_URL` (ex: `rediss://default:xxx@xxx.upstash.io:6379`)
   - `CORS_ORIGINS` : liste des origines autorisées, séparées par des virgules
     - ex: `https://stiamond.vercel.app,https://stiamond.com`
   - `NEXT_PUBLIC_SITE_URL` : ton domaine Vercel
   - `JWT_SECRET` est généré automatiquement ; garde-le en lieu sûr
   - `SENTRY_DSN` (optionnel)
5. Vérifie que l’endpoint `/health` retourne `200`.

### En manuel (free)

1. **New → Web Service**
   - Name : `stiamond-api`
   - Source : `senankponjosuekpodekon/bot-int` (Git)
   - Branch : `dev`
   - Runtime : `Docker`
   - Region : choisis la plus proche de tes utilisateurs
   - Root Directory : laisse vide (`./`)
   - Dockerfile Path : `Dockerfile.api`
   - Instance Type : `Free`
2. **New → PostgreSQL**
   - Name : `stiamond-pg`
   - Instance Type : `Free`
3. Dans le service `stiamond-api`, ajoute les variables d’environnement manquantes :
   - `REDIS_URL` : ton URL Redis (Upstash free par exemple)
   - `CORS_ORIGINS` : ton domaine Vercel, ex. `https://ton-site.vercel.app`
   - `NEXT_PUBLIC_SITE_URL` : idem
   - `JWT_SECRET` : une chaîne aléatoire longue
   - Le reste vient de la base (`DATABASE_URL`, `DB_HOST`, etc.)
4. Vérifie `/health`.

> Les instances **Free** se mettent en veille après une période d’inactivité et la base Postgres gratuite est limitée dans le temps. C’est ok pour du test, pas pour la production.

## 2. Déployer le frontend sur Vercel

1. Importe le repo GitHub sur Vercel.
2. Dans **Settings > Git**, règle **Production Branch** sur `dev`.
3. Framework : **Other** (car c’est un monorepo).
4. Build settings (copier depuis `vercel.json`) :
   - Build Command : `npx turbo run build --filter=@stiamond/web...`
   - Output Directory : `apps/web/.next`
   - Install Command : `npm ci`
5. Ajoute ces variables d’environnement dans l’onglet **Settings > Environment Variables** :
   - `NEXT_PUBLIC_API_URL` : `https://<ton-api>.onrender.com/api`
   - `NEXT_PUBLIC_SITE_URL` : `https://<ton-site>.vercel.app`
   - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (optionnel)
6. Redéploie.

## 3. Bases de données

### PostgreSQL

Render gère le Postgres. L’URL de connexion est injectée via `DATABASE_URL`.

> **pgvector** : Render PostgreSQL ne supporte pas toujours l’extension `pgvector`. Si ce n’est pas disponible, l’API bascule automatiquement sur une similarité JS (voir `knowledge.service.ts`).
> Si tu as besoin de vrai pgvector en production, préfère **Supabase** ou **AWS RDS**.

### Redis

Render ne propose pas toujours Redis managé. Utilise plutôt un service tiers :

- [Upstash Redis](https://upstash.com/)
- [Redis Cloud](https://redis.com/)

Copie l’URL `rediss://...` dans `REDIS_URL` du service Render.

### Avec Neon (PostgreSQL) et Upstash (Redis)

Si tu préfères éviter la base Postgres de Render :

1. Crée un projet **Neon** → copie l’URL `postgresql://...`
2. Crée une base **Upstash Redis** → copie l’URL `rediss://...`
3. Déploie avec `render-neon.yaml` au lieu de `render.yaml`
4. Dans Render, renseigne `DATABASE_URL` et `REDIS_URL`
5. Pour le **premier déploiement**, ajoute temporairement `DB_SYNC=true` pour créer les tables, puis repasse-la à `false` ensuite

Le code a été mis à jour (`app.module.ts`) pour lire `DATABASE_URL` en priorité. Upstash fonctionne déjà via `REDIS_URL`.

> **pgvector** : Neon supporte `pgvector`. Active-la depuis le dashboard Neon :
> ```sql
> CREATE EXTENSION IF NOT EXISTS vector;
> ```
> Après le premier déploiement avec `DB_SYNC=true`, les tables seront créées et l’API pourra utiliser la similarité vectorielle.

## 4. Vérifier le déploiement

```bash
curl https://<ton-api>.onrender.com/health
curl https://<ton-site>.vercel.app
```

## 5. Notes

- `API_PORT` sur Render doit être `10000` car Render détecte le port dynamiquement via `PORT`.
- `Dockerfile.api` lit `process.env.PORT || 3001`, donc il fonctionne à la fois en local et sur Render.
- `CORS_ORIGINS` doit correspondre exactement au domaine Vercel (protocole inclus).
