#!/usr/bin/env bash
# Inicia apenas o AI Service
# Carrega AI_DATABASE_URL do .env.local se existir

cd "$(dirname "$0")/.." || exit 1

# Carregar AI_DATABASE_URL do .env.local
if [ -f .env.local ]; then
  eval "$(grep '^AI_DATABASE_URL=' .env.local 2>/dev/null)" 2>/dev/null || true
fi

cd ai-service || exit 1
[ -d .venv ] || { echo "Crie o venv: cd ai-service && python3 -m venv .venv && pip install -r requirements.txt"; exit 1; }

echo "=== AI Service (porta 8001) ==="
echo "AI_DATABASE_URL: ${AI_DATABASE_URL:-(não definido - usando localhost:5432)}"
echo ""

source .venv/bin/activate
exec uvicorn main:app --host 0.0.0.0 --port 8001
