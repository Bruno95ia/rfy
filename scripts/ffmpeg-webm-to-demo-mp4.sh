#!/usr/bin/env bash
# Converte WebM (Playwright/Chromium) para MP4 H.264 amplamente compatível (PowerPoint, Safari, TVs).
# Uso: ./scripts/ffmpeg-webm-to-demo-mp4.sh entrada.webm saida.mp4
# Env opcional: FFMPEG_CRF (default 18), FFMPEG_PRESET (default medium)
set -euo pipefail
if [[ $# -ne 2 ]]; then
  echo "Uso: $0 entrada.webm saida.mp4" >&2
  exit 1
fi
: "${FFMPEG_CRF:=18}"
: "${FFMPEG_PRESET:=medium}"
ffmpeg -y -i "$1" \
  -c:v libx264 \
  -crf "${FFMPEG_CRF}" \
  -preset "${FFMPEG_PRESET}" \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -an \
  -loglevel error -stats \
  "$2"
