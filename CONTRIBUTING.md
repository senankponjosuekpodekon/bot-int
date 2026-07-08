# Contributing

## Branch Strategy

```
main    ← production (protected)
stage   ← pre-production / QA
dev     ← active development
```

Always branch from `dev`:
```bash
git checkout dev
git checkout -b feat/my-feature
# ... work ...
git push origin feat/my-feature
# Open PR → dev
```

## Commit Convention

```
feat: add lead auto-creation from chat
fix: resolve JWT expiry refresh issue
chore: update dependencies
docs: add API reference to README
refactor: extract OllamaService to shared package
```

## PR Flow

`feat/*` → `dev` → `stage` (QA) → `main` (release)
