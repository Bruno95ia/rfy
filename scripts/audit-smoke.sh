#!/usr/bin/env bash
# Smoke HTTP da app RFY (auditoria operacional rápida).
# Não substitui testes E2E nem validação de PDFs.
#
# Uso:
#   BASE_URL=http://127.0.0.1:3000 ./scripts/audit-smoke.sh
#   BASE_URL=https://movet.com.br ./scripts/audit-smoke.sh
#
# Opcional (com sessão já gravada em ficheiro Netscape/curl):
#   COOKIE_JAR=/tmp/rfy-cookies.txt ORG_ID=<uuid> ./scripts/audit-smoke.sh
#
# Variáveis:
#   BASE_URL      (default: http://127.0.0.1:3000)
#   SKIP_INNGEST  (default: 0) — se 1, não tenta GET /api/inngest
#   COOKIE_JAR    — se definido com ORG_ID, testa /api/metrics/summary
#   ORG_ID        — UUID da org para checks autenticados

set -uo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
BASE_URL="${BASE_URL%/}"
SKIP_INNGEST="${SKIP_INNGEST:-0}"

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[0;33m'
NC='\033[0m'

fail=0
warn=0

http_code() {
  curl -sS -o /dev/null -w "%{http_code}" --max-time 20 "$1" 2>/dev/null || echo "000"
}

expect() {
  local name=$1 url=$2 want=$3
  local got
  got=$(http_code "$url")
  if [[ "$got" == "$want" ]]; then
    echo -e "${GRN}OK${NC}   [$got] $name"
  else
    echo -e "${RED}FAIL${NC} [$got] $name (esperado $want) — $url"
    fail=$((fail + 1))
  fi
}

expect_any() {
  local name=$1 url=$2
  shift 2
  local got want ok=0
  got=$(http_code "$url")
  for want in "$@"; do
    if [[ "$got" == "$want" ]]; then
      ok=1
      break
    fi
  done
  if [[ "$ok" -eq 1 ]]; then
    echo -e "${GRN}OK${NC}   [$got] $name"
  else
    echo -e "${RED}FAIL${NC} [$got] $name (esperado um de: $*) — $url"
    fail=$((fail + 1))
  fi
}

echo "== RFY audit-smoke =="
echo "BASE_URL=$BASE_URL"
echo ""

echo "-- Páginas públicas --"
expect "GET /login" "$BASE_URL/login" "200"
expect "GET /signup" "$BASE_URL/signup" "200"
expect_any "GET / (home ou redirect)" "$BASE_URL/" "200" "307" "308" "301" "302"

echo ""
echo "-- API sem sessão (auth deve bloquear) --"
expect "GET /api/ai/status" "$BASE_URL/api/ai/status" "401"
expect "GET /api/metrics/summary (sem sessão)" "$BASE_URL/api/metrics/summary" "401"
expect "GET /api/billing/status" "$BASE_URL/api/billing/status" "401"

echo ""
echo "-- API sem sessão (recursos existentes) --"
expect "GET /api/supho/campaigns" "$BASE_URL/api/supho/campaigns" "401"
expect "GET /api/supho/questions" "$BASE_URL/api/supho/questions" "401"

if [[ "$SKIP_INNGEST" == "1" ]]; then
  echo -e "${YLW}SKIP${NC}  /api/inngest (SKIP_INNGEST=1)"
else
  # Inngest: pode responder 200 (sync UI) ou 405 conforme versão/método
  expect_any "GET /api/inngest" "$BASE_URL/api/inngest" "200" "405" "400"
fi

if [[ -n "${COOKIE_JAR:-}" && -n "${ORG_ID:-}" ]]; then
  echo ""
  echo "-- Com cookie (COOKIE_JAR + ORG_ID) --"
  if [[ ! -f "$COOKIE_JAR" ]]; then
    echo -e "${RED}FAIL${NC} ficheiro COOKIE_JAR não existe: $COOKIE_JAR"
    fail=$((fail + 1))
  else
    got=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 25 \
      -b "$COOKIE_JAR" "$BASE_URL/api/metrics/summary?org_id=${ORG_ID}" 2>/dev/null || echo "000")
    if [[ "$got" == "200" ]]; then
      echo -e "${GRN}OK${NC}   [$got] GET /api/metrics/summary?org_id=…"
    else
      echo -e "${YLW}WARN${NC} [$got] GET /api/metrics/summary (esperado 200 com sessão válida)"
      warn=$((warn + 1))
    fi
    got=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 25 \
      -b "$COOKIE_JAR" "$BASE_URL/api/billing/status?org_id=${ORG_ID}" 2>/dev/null || echo "000")
    if [[ "$got" == "200" ]]; then
      echo -e "${GRN}OK${NC}   [$got] GET /api/billing/status?org_id=…"
    else
      echo -e "${YLW}WARN${NC} [$got] GET /api/billing/status"
      warn=$((warn + 1))
    fi
  fi
else
  echo ""
  echo "(Opcional) Defina COOKIE_JAR + ORG_ID para testar métricas e billing autenticados."
fi

echo ""
if [[ "$fail" -eq 0 ]]; then
  echo -e "${GRN}audit-smoke: todos os checks obrigatórios passaram${NC}"
  [[ "$warn" -gt 0 ]] && echo -e "${YLW}avisos: $warn${NC}"
  exit 0
else
  echo -e "${RED}audit-smoke: $fail falha(s)${NC}"
  exit 1
fi
