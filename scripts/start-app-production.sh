#!/usr/bin/env bash
# Inicia a app Next.js em modo produção (next start) na porta 3000.
# Uso: ./scripts/start-app-production.sh
# Para rodar em background: nohup ./scripts/start-app-production.sh > .next-start.log 2>&1 &

cd "$(dirname "$0")/.." || exit 1

PORT="${PORT:-3000}"

# Mata processo na porta se existir
pid=$(lsof -ti :$PORT 2>/dev/null)
if [ -n "$pid" ]; then
  echo "Parando processo existente na porta $PORT (PID $pid)"
  kill -9 $pid 2>/dev/null || true
  sleep 2
fi

# Carrega .env.local se existir
[ -f .env.local ] && set -a && source .env.local && set +a

# Permite certificado autoassinado na cadeia (ex.: RDS) para evitar "self signed certificate in certificate chain".
# Para exigir verificação de certificado, defina NODE_TLS_REJECT_UNAUTHORIZED=1 no .env.local.
export NODE_TLS_REJECT_UNAUTHORIZED="${NODE_TLS_REJECT_UNAUTHORIZED:-0}"

# Garante que o build existe
if [ ! -d .next ]; then
  echo "Build não encontrado. Executando npm run build..."
  npm run build || exit 1
fi

echo "Iniciando Next.js em http://0.0.0.0:$PORT (acessível por IP externo)"
exec npm run start -- -H 0.0.0.0 -p "$PORT"
