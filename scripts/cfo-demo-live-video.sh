#!/usr/bin/env bash
# Grava demonstração CFO «ao vivo»: Conhecimento → SUPHO → Utilizar uploads → maturidade (WebM).
# Uso: ./scripts/cfo-demo-live-video.sh
# Requer: app em E2E_BASE_URL, conta demo com papel owner/admin/gestor; perguntas SUPHO na base.

set -euo pipefail
cd "$(dirname "$0")/.."

export E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:3000}"

echo "==> Gravando demo CFO ao vivo (projeto cfo-live-video) contra ${E2E_BASE_URL}"
npx playwright test tests/e2e/cfo-demo-live-video.spec.ts --project=cfo-live-video "$@"

echo ""
echo "==> Vídeo gravado. Procurar ficheiros .webm:"
LATEST=""
while IFS= read -r f; do
  echo "    $f"
  LATEST="$f"
done < <(find test-results -name 'video.webm' -type f 2>/dev/null | sort)

if [ -n "$LATEST" ]; then
  mkdir -p docs/demo
  cp "$LATEST" docs/demo/rfy-cfo-demo-live.webm
  echo ""
  echo "==> Cópia estável: docs/demo/rfy-cfo-demo-live.webm ($(du -h docs/demo/rfy-cfo-demo-live.webm | cut -f1))"
  if command -v ffmpeg >/dev/null 2>&1; then
    bash "$(dirname "$0")/ffmpeg-webm-to-demo-mp4.sh" docs/demo/rfy-cfo-demo-live.webm docs/demo/rfy-cfo-demo-live.mp4
    echo "==> MP4: docs/demo/rfy-cfo-demo-live.mp4 ($(du -h docs/demo/rfy-cfo-demo-live.mp4 | cut -f1))"
  fi
fi
