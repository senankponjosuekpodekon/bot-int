# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please do **not** open a public issue.

Instead, report it privately via [GitHub private vulnerability reporting](https://github.com/senankponjosuekpodekon/bot-int/security/advisories/new), or contact the maintainer directly.

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce or proof-of-concept
- Affected component (API, web app, infrastructure)

You can expect an acknowledgment within 72 hours. Once the issue is confirmed and fixed, we will coordinate disclosure with you.

## Supported Versions

Only the latest commit on `main` is supported with security fixes.

## Security Notes for Operators

- `JWT_SECRET` and `DB_PASSWORD` are **required** — the API refuses to start without them.
- Set `CORS_ORIGINS` to your actual frontend origin(s) in production.
- Authentication endpoints are rate-limited (5 req/min) and all other routes at 100 req/min; adjust for your load.
- JWTs are stored client-side in `localStorage` (XSS exposure) with a 7-day lifetime — see TODO.md for the planned refresh-token rotation.
