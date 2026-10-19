#!/usr/bin/env bash
set -Eeuo pipefail
if [[ $EUID -ne 0 ]]; then
  echo "Run this script with sudo inside app-01." >&2
  exit 1
fi
if systemctl is-active --quiet nextapp; then
  echo "Stop nextapp before rebuilding in place: sudo systemctl stop nextapp" >&2
  exit 1
fi
for required in package.json package-lock.json; do
  if [[ ! -f /opt/nextapp/current/$required ]]; then
    echo "Missing $required. Transfer your npm-based Next.js project first." >&2
    exit 1
  fi
done
runuser -u nextapp -- /bin/bash -c '
  set -Eeuo pipefail
  export HOME=/var/lib/nextapp
  cd /opt/nextapp/current
  npm ci --include=dev
  NODE_ENV=production npm run build
  test -s .next/BUILD_ID
'
echo "Build complete. Start with: sudo systemctl enable --now nextapp"
