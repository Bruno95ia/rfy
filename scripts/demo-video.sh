#!/usr/bin/env bash
# Grava vídeo de demonstração (WebM) com Playwright.
# Uso: ./scripts/demo-video.sh
# Requer: app em E2E_BASE_URL (default http://127.0.0.1:3000), Postgres para login demo.

set -e
cd "$(dirname "$0")/.."

export E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:3000}"

echo "==> Gravando demo (projeto demo-video) contra ${E2E_BASE_URL}"
npx playwright test tests/e2e/demo-rfy-video.spec.ts --project=demo-video "$@"

echo ""
echo "==> Vídeo gravado. Procurar ficheiros .webm:"
LATEST=""
while IFS= read -r f; do
  echo "    $f"
  LATEST="$f"
done < <(find test-results -name 'video.webm' -type f 2>/dev/null | sort)

if [ -n "$LATEST" ]; then
  mkdir -p docs/demo
  cp "$LATEST" docs/demo/rfy-demo.webm
  echo ""
  echo "==> Cópia estável: docs/demo/rfy-demo.webm ($(du -h docs/demo/rfy-demo.webm | cut -f1))"
fi
