#!/usr/bin/env bash
# Inicia AI Service + Next.js
# Mata processos existentes nas portas 8001 e 3000/3001

cd "$(dirname "$0")/.." || exit 1

echo "=== Parando processos existentes ==="
for port in 8001 3000 3001; do
  pid=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "Killing PID $pid on port $port"
    kill -9 $pid 2>/dev/null || true
  fi
done
sleep 2

echo "=== Iniciando AI Service (porta 8001) ==="
cd ai-service || exit 1
[ -d .venv ] || { echo "Execute: cd ai-service && python3 -m venv .venv && pip install -r requirements.txt"; exit 1; }
source .venv/bin/activate
# Usa AI_DATABASE_URL do .env.local se existir (Supabase), senão localhost
if [ -f ../.env.local ]; then
  _db=$(grep '^AI_DATABASE_URL=' ../.env.local 2>/dev/null | cut -d= -f2-)
  [ -n "$_db" ] && export AI_DATABASE_URL="$_db"
fi
export AI_DATABASE_URL="${AI_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/postgres}"
nohup uvicorn main:app --host 0.0.0.0 --port 8001 > ../.ai-service.log 2>&1 &
AI_PID=$!
cd ..
sleep 3

echo "=== Iniciando Next.js (porta 3000) ==="
export AI_SERVICE_URL="${AI_SERVICE_URL:-http://localhost:8001}"
nohup npm run dev > .next-dev.log 2>&1 &
NEXT_PID=$!
sleep 2

echo ""
echo "=== Serviços iniciados ==="
echo "AI Service: http://localhost:8001 (PID $AI_PID)"
echo "Next.js: http://localhost:3000 (PID $NEXT_PID)"
echo ""
echo "Para usar dados do Supabase, defina AI_DATABASE_URL no .env.local"
echo "Connection string: Supabase Dashboard > Settings > Database"
