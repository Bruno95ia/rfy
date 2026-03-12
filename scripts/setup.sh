#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1
echo "=== RFY Setup ==="
if [ ! -f .env.local ]
then
  cp .env.example .env.local
  echo "✓ .env.local criado."
else
  echo "✓ .env.local já existe."
fi
npm install

if command -v docker >/dev/null 2>&1; then
  echo ""
  echo "=== Banco local (Postgres) ==="
  bash scripts/db-up.sh
else
  echo ""
  echo "⚠ Docker não encontrado. O banco local não foi inicializado."
fi

echo ""
echo "Próximos passos:"
echo "1. Revise .env.local (apenas se quiser usar Supabase Cloud/Auth/Storage)."
echo "2. Banco local já pode ser iniciado com: bash scripts/db-up.sh"
echo "3. ENCRYPTION_KEY já está em .env.local (criptografia de secrets)."
echo "4. npm run dev     # Terminal 1"
echo "5. npm run inngest # Terminal 2"
