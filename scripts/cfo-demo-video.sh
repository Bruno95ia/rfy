#!/usr/bin/env bash
# Grava demonstração para CFO (WebM) com balões explicativos — alinhado ao slide «Como o sistema atua na prática».
# Uso: ./scripts/cfo-demo-video.sh
# Requer: app em E2E_BASE_URL (default http://127.0.0.1:3000), credenciais demo.

set -euo pipefail
cd "$(dirname "$0")/.."

export E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:3000}"

echo "==> Gravando demo CFO (projeto cfo-video) contra ${E2E_BASE_URL}"
npx playwright test tests/e2e/cfo-demo-video.spec.ts --project=cfo-video "$@"

echo ""
echo "==> Vídeo gravado. Procurar ficheiros .webm:"
LATEST=""
while IFS= read -r f; do
  echo "    $f"
  LATEST="$f"
done < <(find test-results -name 'video.webm' -type f 2>/dev/null | sort)

if [ -n "$LATEST" ]; then
  mkdir -p docs/demo
  cp "$LATEST" docs/demo/rfy-cfo-demo.webm
  echo ""
  echo "==> Cópia estável: docs/demo/rfy-cfo-demo.webm ($(du -h docs/demo/rfy-cfo-demo.webm | cut -f1))"
  if command -v ffmpeg >/dev/null 2>&1; then
    bash "$(dirname "$0")/ffmpeg-webm-to-demo-mp4.sh" docs/demo/rfy-cfo-demo.webm docs/demo/rfy-cfo-demo.mp4
    echo "==> MP4: docs/demo/rfy-cfo-demo.mp4 ($(du -h docs/demo/rfy-cfo-demo.mp4 | cut -f1))"
  else
    echo "    (instale ffmpeg para gerar docs/demo/rfy-cfo-demo.mp4 automaticamente)"
  fi
fi
