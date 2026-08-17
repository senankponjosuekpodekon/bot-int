# Guide détaillé pour explorer, tester et utiliser Bot-Int

Ce document complète le `README.md` et décrit, en français, comment prendre en main la plateforme Bot-Int : installation, configuration, exécution, scénarios d’exploration, tests et résolution des problèmes courants.

---

## 1. Comprendre l’architecture

| Couche | Description | Ports par défaut |
| --- | --- | --- |
| Frontend | Next.js 16 (dashboard, chat temps réel, agents, leads) | `3000` |
| API | NestJS 11 (auth, agents, chat, leads, knowledge) | `3001` |
| Base de données | PostgreSQL 16 | `5432` |
| LLM | Ollama (modèle `llama3.2` par défaut) | `11434` |

Tous les modules sont multi-tenants : chaque requête authentifiée transporte `tenantId` et `agentId`, garantissant l’isolation des données.

---

## 2. Prérequis

- **Node.js 20+** (recommandé : `nvm use 24`)
- **npm 10+**
- **Docker + Docker Compose** (optionnel mais recommandé pour PostgreSQL/Ollama)
- **Ollama** installé localement si vous ne l’exécutez pas en conteneur
- **Make** (pour les commandes utilitaires du projet)

---

## 3. Préparer l’environnement

```bash
# Depuis la racine du repo
npm install

# Copier les fichiers d’environnement
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env   # s’il existe
```

Points clés à définir dans `apps/api/.env` :

| Variable | Rôle |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Connexion PostgreSQL |
| `JWT_SECRET` | Secret pour signer les tokens |
| `OLLAMA_URL`, `OLLAMA_MODEL` | Accès à l’instance Ollama |
| `REFRESH_TOKEN_TTL_MINUTES` | Durée des refresh tokens |

### Base de données

- **Option Docker** : `docker compose up -d postgres`
- **Option locale** : créer la base/users via `psql` (cf. README).

### Migrations

```bash
npm run migration:run -w apps/api
```

### Ollama

```bash
ollama serve
ollama pull llama3.2
```

---

## 4. Démarrage rapide

La commande standard lance API + Front en parallèle :

```bash
npm run dev
```

- API disponible sur `http://localhost:3001/api`
- Frontend sur `http://localhost:3000`

> ⚠️ Si `npm run dev` échoue avec `EADDRINUSE: :::3000`, libérez le port :
>
> ```bash
> ss -ltnp | grep :3000   # identifier le PID
> kill <PID>
> ```
> 
> ou démarrez le front sur un autre port : `PORT=3100 npm run dev --workspace apps/web`.

### Commandes alternatives

- API seule : `npm run dev --workspace apps/api`
- Web seul : `npm run dev --workspace apps/web`
- Makefile (si disponible) : `make dev` pour orchestrer services + Docker.

---

## 5. Authentification & premiers comptes

1. **Créer un tenant + admin** via l’API :
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H 'Content-Type: application/json' \
     -d '{
       "companyName": "Demo Corp",
       "name": "Alice",
       "email": "alice@example.com",
       "password": "Secret123!"
     }'
   ```
   Réponse : `{ access_token, refresh_token, userId, tenantId }`.

2. **Connexion** (`/auth/login`) renvoie les mêmes champs.

3. **Tokens** :
   - `access_token` (JWT) → à placer dans `Authorization: Bearer <token>`
   - `refresh_token` → stocké côté client pour `/auth/refresh`

4. **Front** : saisir l’email/mot de passe créés sur `/login`. Le store Zustand garde les tokens en localStorage.

---

## 6. Explorer l’interface web

| Section | Chemin | Actions principales |
| --- | --- | --- |
| Dashboard | `/dashboard` | KPI leads, conversations récentes |
| Agents | `/dashboard/agents` | CRUD agents, prompts, modèles |
| Chat | `/dashboard/chat` | Tester un agent, suivre conversations, capture leads |
| Leads | `/dashboard/leads` | Pipeline, filtres, mise à jour de statut |
| Knowledge | `/dashboard/knowledge` | Importer texte, rechercher |

Astuce : pour ouvrir directement une conversation, ajouter `?conversationId=UUID` dans l’URL (Deep link).

---

## 7. Explorer l’API

### Endpoints clés (extraits)

| Domaine | Méthode | Route | Notes |
| --- | --- | --- | --- |
| Auth | POST | `/api/auth/register` | Crée tenant + utilisateur |
| Auth | POST | `/api/auth/login` | Authentifie et renvoie tokens |
| Auth | POST | `/api/auth/refresh` | Rafraîchit les tokens |
| Agents | GET/POST | `/api/agents` | Liste ou crée un agent |
| Chat | POST | `/api/chat/send` | Envoie un message à un agent |
| Chat | GET | `/api/chat/conversations` | Filtrage par agent/status |
| Leads | GET/POST | `/api/leads` | Pipeline |
| Knowledge | POST | `/api/knowledge/text` | Ajout de documents |

### Exemple complet : envoyer un message

```bash
curl -X POST http://localhost:3001/api/chat/send \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "tenantId": "<uuid>",
    "agentId": "<uuid>",
    "userMessage": "Bonjour, j\'ai besoin d\'infos sur vos offres"
  }'
```

Réponse : `{ reply, conversationId, leadId? }`.

---

## 8. Tester et valider

| Type | Commande |
| --- | --- |
| Lint API | `npm run lint --workspace apps/api` |
| Lint Web | `npm run lint --workspace apps/web` |
| Tests unitaires API | `npm run test --workspace apps/api` |
| Build API | `npm run build --workspace apps/api` |
| Build Web | `npm run build --workspace apps/web` |
| E2E Web (Playwright) | `npm run test:e2e --workspace apps/web` |

> Conseil : exécuter `npm run lint --workspaces` dans le monorepo avant un commit.

---

## 9. Journaux et observabilité

- **API** : middleware de logging HTTP (Nest) → console standard.
- **Web** : erreurs capturées dans `apps/web/src/lib/error-reporting.ts` (actuellement console, prêt pour Sentry/LogRocket).
- **Docker** : `docker compose logs -f <service>`.

---

## 10. Dépannage rapide

| Problème | Symptômes | Remède |
| --- | --- | --- |
| Port 3000 occupé | `EADDRINUSE` au démarrage du front | `ss -ltnp | grep :3000` puis `kill <PID>` ou changer de port |
| `npm audit` → vulnérabilité PostCSS | `postcss@8.4.31` embarqué par Next | En attente de patch Next > 16.2.10 ; override documenté dans `package.json` |
| Erreurs ESLint sur `skipAuthRefresh` | TypeScript ne connaît pas la propriété personnalisée | Vérifier l’augmentation du type dans `apps/web/src/lib/api.ts` |
| Actions GitHub non résolues (IDE) | IDE hors-ligne → `actions/checkout@v4` introuvable | Ignorer, workflow valide sur GitHub |

---

## 11. Ressources utiles

- `README.md` : vision globale + commandes principales
- `Makefile` : tâches automatisées (setup, dev, lint, test)
- `apps/api/.env.example` : toutes les variables backend
- `apps/web/eslint.config.mjs` : configuration ESLint flat
- `TODO.md` : backlog Sécurité & Conformité

Pour toute contribution :
1. Créer une branche à partir de `dev`
2. Suivre `npm run lint --workspaces` + tests
3. Décrire les changements (sécurité, lint, CI) dans la PR

Bonne exploration !
