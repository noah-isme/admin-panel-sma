#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @apps/shared build
pnpm --filter @apps/landing build
pnpm --filter @apps/admin build

rm -rf deploy
mkdir -p deploy/admin
cp -r apps/landing/dist/. deploy/
cp -r apps/admin/dist/. deploy/admin/
cp apps/admin/dist/mockServiceWorker.js deploy/mockServiceWorker.js
