#!/usr/bin/env bash
set -e

# Usage: scripts/init-ssl.sh <domain> <email>
DOMAIN=${1:-$SSL_DOMAIN}
EMAIL=${2:-$SSL_EMAIL}

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Usage: scripts/init-ssl.sh <domain> <email>"
  echo "Or set SSL_DOMAIN and SSL_EMAIL environment variables."
  exit 1
fi

CERT_DIR="./nginx/ssl"
mkdir -p "$CERT_DIR"

docker run --rm \
  -p 80:80 \
  -v "$PWD/$CERT_DIR:/etc/letsencrypt/live/$DOMAIN" \
  -v "certbot-data:/etc/letsencrypt" \
  certbot/certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

echo "Certificates generated for $DOMAIN in $CERT_DIR"
