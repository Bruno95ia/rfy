#!/usr/bin/env bash
# Para o processo na 3000, copia estáticos e sobe o standalone. Use após build.
# Termina com exit 1 se a porta não libertar ou o servidor não responder (evita deploy “OK” com processo antigo).
set -euo pipefail
cd "$(dirname "$0")/.."

LOG="${RFY_STANDALONE_LOG:-/tmp/rfy-standalone.log}"

port_in_use() {
  # Evita falso positivo com portas tipo :30000
  ss -tln 2>/dev/null | grep -qE ':3000$'
}

echo "==> Liberando porta 3000..."
for _ in $(seq 1 8); do
  fuser -k -9 3000/tcp 2>/dev/null || true
  sleep 1
  if ! port_in_use; then
    break
  fi
done

# TIME_WAIT / processos lentos a morrer
sleep 2

if port_in_use; then
  echo "ERRO: porta 3000 ainda ocupada após kill" | tee -a "$LOG"
  ss -tlnp 2>/dev/null | grep 3000 || true
  exit 1
fi

echo "==> Copiando estáticos para standalone..."
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
[ -d public ] && cp -r public .next/standalone/ 2>/dev/null || true

echo "==> Iniciando servidor (log: $LOG)..."
./scripts/start-standalone.sh >>"$LOG" 2>&1 &
SERVER_PID=$!
disown "$SERVER_PID" 2>/dev/null || true

for _ in $(seq 1 90); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "ERRO: processo do servidor terminou antes de responder (pid $SERVER_PID)" | tee -a "$LOG"
    tail -50 "$LOG" >&2 || true
    exit 1
  fi
  if curl -sf --max-time 3 "http://127.0.0.1:3000/" >/dev/null 2>&1; then
    echo "OK: servidor respondeu em http://127.0.0.1:3000"
    exit 0
  fi
  sleep 1
done

echo "ERRO: timeout a aguardar HTTP em :3000" | tee -a "$LOG"
tail -50 "$LOG" >&2 || true
exit 1
