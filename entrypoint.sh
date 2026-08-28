#!/bin/sh
set -eu

cd /app/server
node dist/prepare-database.js
npx prisma migrate deploy

if [ "${RUN_DB_SEED_IF_EMPTY:-false}" = "true" ] && [ -f dist/seed.js ]; then
  node dist/seed.js
fi

exec "$@"
