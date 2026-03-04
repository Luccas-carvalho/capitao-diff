#!/usr/bin/env bash
set -euo pipefail

pnpm install
pnpm --filter @capitao-diff/api prisma:generate

echo "Setup complete."
echo "Next steps:"
echo "1) Copy apps/api/.env.example to apps/api/.env and set DATABASE_URL"
echo "2) Run: pnpm --filter @capitao-diff/api prisma:migrate"
echo "3) Run: pnpm dev:platform"
