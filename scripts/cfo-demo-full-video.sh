#!/usr/bin/env bash
# Demo CFO completo (slide 7 + Conhecimento + SUPHO), ritmo mais rápido — WebM/MP4 em docs/demo/
set -euo pipefail
cd "$(dirname "$0")/.."
export E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:3000}"
echo "==> Gravando demo CFO completo (cfo-full-video) contra ${E2E_BASE_URL}"
npx playwright test tests/e2e/cfo-demo-full-video.spec.ts --project=cfo-full-video "$@"
echo ""
LATEST=""
while IFS= read -r f; do
  echo "    $f"
  LATEST="$f"
done < <(find test-results -name 'video.webm' -type f 2>/dev/null | sort)
if [ -n "$LATEST" ]; then
  mkdir -p docs/demo
  cp "$LATEST" docs/demo/rfy-cfo-demo-full.webm
  echo ""
  echo "==> docs/demo/rfy-cfo-demo-full.webm ($(du -h docs/demo/rfy-cfo-demo-full.webm | cut -f1))"
  if command -v ffmpeg >/dev/null 2>&1; then
    bash "$(dirname "$0")/ffmpeg-webm-to-demo-mp4.sh" docs/demo/rfy-cfo-demo-full.webm docs/demo/rfy-cfo-demo-full.mp4
    echo "==> docs/demo/rfy-cfo-demo-full.mp4 ($(du -h docs/demo/rfy-cfo-demo-full.mp4 | cut -f1))"
  fi
fi
