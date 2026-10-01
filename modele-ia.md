# OLLAMA FREE

Tu as raison, j'ai mal cherché. Ollama **est** branché et exposé via Cloudflare.

## Comment ça marche

### 1. Endpoint Ollama protégé

Dans `.env` :

```bash
OLLAMA_URL=https://ollama.stiamond.net
OLLAMA_MODEL=llama3.1:latest

# Cloudflare Access Service Token for ollama.stiamond.net
OLLAMA_CF_ACCESS_CLIENT_ID=...
OLLAMA_CF_ACCESS_CLIENT_SECRET=...
```

Le modèle appelle `https://ollama.stiamond.net` au lieu de `localhost:11434`. Le `.stiamond.net` est un sous-domaine passant par **Cloudflare Access** (Zero Trust), donc il faut un **Service Token** Cloudflare pour s'authentifier.

### 2. Provider [OllamaProvider](cci:2://file:///home/josue/Projections/future_stiamond/bot_int/apps/api/src/modules/chat/providers/ollama.provider.ts:5:0-112:1)

Fichier : [apps/api/src/modules/chat/providers/ollama.provider.ts](cci:7://file:///home/josue/Projections/future_stiamond/bot_int/apps/api/src/modules/chat/providers/ollama.provider.ts:0:0-0:0)

Le provider est initialisé avec `OLLAMA_URL` et `OLLAMA_MODEL`. S'il y a `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`, il les envoie dans les headers de chaque requête :

```ts
if (clientId && clientSecret) {
  this.authHeaders['CF-Access-Client-Id'] = clientId;
  this.authHeaders['CF-Access-Client-Secret'] = clientSecret;
}
```

Chaque appel Ollama (`/api/chat`, `/api/embeddings`, `/api/tags`) emporte ces headers. Sans eux, Cloudflare Access rejetterait la requête avec une 403.

### 3. Intégration au chat

Fichier : [apps/api/src/modules/chat/chat.module.ts](cci:7://file:///home/josue/Projections/future_stiamond/bot_int/apps/api/src/modules/chat/chat.module.ts:0:0-0:0)

- [OllamaProvider](cci:2://file:///home/josue/Projections/future_stiamond/bot_int/apps/api/src/modules/chat/providers/ollama.provider.ts:5:0-112:1) est enregistré comme provider.
- `LLM_PROVIDER` est fourni par [FallbackLLMProvider](cci:2://file:///home/josue/Projections/future_stiamond/bot_int/apps/api/src/modules/chat/providers/fallback-llm.provider.ts:6:0-99:1) ([apps/api/src/modules/chat/providers/fallback-llm.provider.ts](cci:7://file:///home/josue/Projections/future_stiamond/bot_int/apps/api/src/modules/chat/providers/fallback-llm.provider.ts:0:0-0:0)).
- L'ordre dépend de `LLM_PROVIDER` :
  - `.env` a `LLM_PROVIDER=openai` → OpenAI/Groq est primaire, Ollama est **fallback**.
  - Si `LLM_PROVIDER=ollama`, Ollama devient primaire et OpenAI le fallback.

### 4. En local avec Docker

[docker-compose.yml](cci:7://file:///home/josue/Projections/future_stiamond/bot_int/docker-compose.yml:0:0-0:0) surcharge l'URL pour l'API containerisée :

```yaml
OLLAMA_URL: http://host.docker.internal:11434
OLLAMA_MODEL: ${OLLAMA_MODEL:-llama3.2}
```

Cela permet de pointer vers ton Ollama local sans Cloudflare en dev.

## Pour l'exploiter dans une autre appli

L'autre appli doit appeler `https://ollama.stiamond.net` avec les mêmes headers d'accès Cloudflare :

```bash
curl https://ollama.stiamond.net/api/generate \
  -H "CF-Access-Client-Id: $OLLAMA_CF_ACCESS_CLIENT_ID" \
  -H "CF-Access-Client-Secret: $OLLAMA_CF_ACCESS_CLIENT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1:latest",
    "prompt": "Salut",
    "stream": false,
    "options": { "num_ctx": 4096 }
  }'
```

Ou en JS/TS :

```ts
import axios from 'axios';

const res = await axios.post(
  'https://ollama.stiamond.net/api/chat',
  {
    model: 'llama3.1:latest',
    messages: [{ role: 'user', content: 'Salut' }],
    stream: false,
    options: { num_ctx: 4096 },
  },
  {
    headers: {
      'CF-Access-Client-Id': process.env.OLLAMA_CF_ACCESS_CLIENT_ID,
      'CF-Access-Client-Secret': process.env.OLLAMA_CF_ACCESS_CLIENT_SECRET,
    },
  },
);
```

C'est donc un Ollama auto-hébergé, exposé au travers de **Cloudflare Access** avec un **Service Token** pour authentifier le backend (et potentiellement d'autres apps).

> Voir aussi : [modele-ia-openai.md](./modele-ia-openai.md) pour le provider OpenAI/Groq + Jina.
