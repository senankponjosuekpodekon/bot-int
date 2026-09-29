#!/bin/sh
# Generates the pgbouncer userlist from env vars so no credentials live in the repo.
# Format for md5 auth: "user" "md5<md5(password + user)>"
set -eu

: "${PGBOUNCER_USER:?PGBOUNCER_USER is required}"
: "${PGBOUNCER_PASSWORD:?PGBOUNCER_PASSWORD is required}"

HASH=$(printf '%s' "${PGBOUNCER_PASSWORD}${PGBOUNCER_USER}" | md5sum | awk '{print $1}')
printf '"%s" "md5%s"\n' "${PGBOUNCER_USER}" "${HASH}" > /tmp/userlist.txt

exec pgbouncer -u postgres /etc/pgbouncer/pgbouncer.ini
