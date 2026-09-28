#!/usr/bin/env bash
# 조향 상담 설문지 전용 Netlify 사이트용 폴더를 만든다.
# 설문 페이지가 사이트 루트(/)에, 응답함이 /admin.html 에, API 가 /api/perfume-responses 에 온다.
#
#   scripts/stage-perfume-site.sh <출력 폴더>
#   cd <출력 폴더> && npx netlify-cli deploy --prod --site <사이트 ID>
set -euo pipefail

OUT="${1:?출력 폴더를 지정하세요}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

rm -rf "$OUT"
mkdir -p "$OUT/public/perfume-survey" "$OUT/src/core" "$OUT/netlify/functions"
cp "$ROOT"/public/perfume-survey/{index.html,admin.html,engine.js,perfumes.js} "$OUT/public/perfume-survey/"
cp "$ROOT/src/core/perfumeResponses.ts" "$OUT/src/core/"
cp "$ROOT/netlify/functions/perfume-responses.mts" "$OUT/netlify/functions/"

BLOBS="$(node -p 'require(process.argv[1]).dependencies["@netlify/blobs"]' "$ROOT/package.json")"
cat > "$OUT/package.json" <<JSON
{
  "name": "johyang-survey",
  "private": true,
  "type": "module",
  "dependencies": { "@netlify/blobs": "$BLOBS" }
}
JSON

cat > "$OUT/netlify.toml" <<'TOML'
# 조향 상담 설문지 전용 사이트 — 설문 페이지가 사이트 루트에 온다
[build]
  command = "echo static"
  publish = "public/perfume-survey"

[build.environment]
  NODE_VERSION = "22"

[functions]
  directory = "netlify/functions"

[[headers]]
  for = "/admin.html"
  [headers.values]
    X-Robots-Tag = "noindex"
    Cache-Control = "no-store"
TOML

echo "준비 완료: $OUT"
