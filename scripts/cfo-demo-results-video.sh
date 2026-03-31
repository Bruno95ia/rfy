#!/usr/bin/env bash
# Demo CFO com ritmo mais lento e ênfase nos resultados (Painel de Maturidade).
set -euo pipefail
cd "$(dirname "$0")/.."
export E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:3000}"
echo "==> Gravando demo CFO · resultados (cfo-results-video) contra ${E2E_BASE_URL}"
npx playwright test tests/e2e/cfo-demo-results-video.spec.ts --project=cfo-results-video "$@"
echo ""
LATEST=""
while IFS= read -r f; do
  echo "    $f"
  LATEST="$f"
done < <(find test-results -name 'video.webm' -type f 2>/dev/null | sort)
if [ -n "$LATEST" ]; then
  mkdir -p docs/demo
  cp "$LATEST" docs/demo/rfy-cfo-demo-results.webm
  echo ""
  echo "==> docs/demo/rfy-cfo-demo-results.webm ($(du -h docs/demo/rfy-cfo-demo-results.webm | cut -f1))"
  if command -v ffmpeg >/dev/null 2>&1; then
    bash "$(dirname "$0")/ffmpeg-webm-to-demo-mp4.sh" docs/demo/rfy-cfo-demo-results.webm docs/demo/rfy-cfo-demo-results.mp4
    echo "==> docs/demo/rfy-cfo-demo-results.mp4 ($(du -h docs/demo/rfy-cfo-demo-results.mp4 | cut -f1))"
  fi
fi
