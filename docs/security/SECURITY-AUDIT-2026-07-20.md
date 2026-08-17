# Security Audit — 20 Jul 2026

## Summary

| Area | Status | Notes |
| ---- | ------ | ----- |
| npm audit (root workspace) | ✅ 27 issues auto-remédiées via upgrade NestJS 11.1.x, uuid 14.x, Next 14.2.21 | `node_modules` régénéré (`rm -rf node_modules package-lock.json && npm install`)
| npm audit (résiduel) | ⚠️ 5 vulnérabilités critiques/hautes restant dans `next@14.2.21` (sous-dépendance `postcss`) | `npm audit` recommande `next@16.2.10` (breaking change). Mise à niveau planifiée pour Sprint « Expérience produit » après validation compatibilité.
| Gestion des secrets | ⚠️ .env locaux non chiffrés | Recommander Vault/Doppler/1Password + rotation trimestrielle

## Détails npm audit

1. **Mises à jour appliquées**
   - `apps/api`: `@nestjs/*` → 11.1.28, `uuid` → 14.0.1, `@nestjs/cli` → 11.0.24
   - `apps/web`: `next` / `eslint-config-next` → 14.2.21
   - `node_modules` reconstruit pour repartir sur base saine.

2. **Findings restants**
   - `next@14.2.21` agrège 14 CVE (XSS, cache poisoning, SSRF...) et `postcss<8.5.10`.
   - Correctif officiel : `next@16.2.10`. Passage majeur (React 19 + SWC updates) → nécessite campagne de QA front.
   - Action: créer branche `chore/upgrade-next-16`, suivre [security bulletin](https://nextjs.org/blog/security-update-2025-12-11).

3. **Plan de mitigation**
   - Désactiver `next/image` disk cache (limiter DoS) via `images.dangerouslyAllowSVG=false`, `deviceSizes`, `imageSizes` + `unoptimized=true` dans `.next.config.js` tant que migration 16.x pas prête.
   - Ajouter monitoring 95ᵉ percentile disque (Docker volume) pour prévenir saturation.

## Gestion des secrets / .env

| Secret | Fichier actuel | Recommandation |
| ------ | -------------- | -------------- |
| JWT_SECRET, OLLAMA_* | `.env` local | Charger via Vault/Doppler + injection GitHub Actions secrets (`NEST_JWT_SECRET`, etc.) |
| DB_* | `.env` local | Stocker dans store chiffré (pgpass ou Secret Manager). Limiter partage Slack/Notion. |
| NEXT_PUBLIC_API_URL | `.env.local` | Documenter valeurs par environnement (`dev`, `stage`, `prod`). |

Checklist proposée :
- [ ] Créer coffre (Vault / Doppler) + importer `.env` actuels.
- [ ] Activer rotation JWT_SECRET trimestrielle (voir `/apps/api/src/modules/auth/auth.service.ts`).
- [ ] Ajouter template `.env.example` sans secrets.
- [ ] Ajouter job GitHub Actions pour valider que `.env` n’est pas commité (`git secrets`).

## Prochaines étapes

1. **Bugfix Tracking** — Ouvrir ticket "Upgrade Next.js to 16.x" (inclure scénarios QA, fallback plan).
2. **Mitigation immédiate** — Appliquer limites `next/image`, surveiller logs SSRF (traefik/nginx) jusqu’à upgrade.
3. **Secrets** — Mettre en place coffre, générer nouveaux JWT_SECRET + DB_PASSWORD, notifier équipe pour rotation.
