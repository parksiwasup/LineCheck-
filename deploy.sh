#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "====================================================================="
echo "   🎓 LINECHECK+ DEPLOYMENT LAUNCHER (macOS / Linux / Port 3088)"
echo "====================================================================="

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
fi

npm install --legacy-peer-deps
npx prisma generate
npx prisma db push
npm run build
npm run start
