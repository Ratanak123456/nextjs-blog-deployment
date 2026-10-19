#!/usr/bin/env bash
set -Eeuo pipefail
trap 'echo "[setup] Failed at line $LINENO. Fix the error above and rerun." >&2' ERR

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo bash scripts/setup-app-server.sh" >&2
  exit 1
fi
source /etc/os-release
if [[ ${ID:-} != ubuntu || ${VERSION_ID:-} != 22.04 ]]; then
  echo "This lab script targets Ubuntu 22.04 (ubuntu/jammy64)." >&2
  exit 1
fi

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
PROJECT_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)
for source_file in systemd/nextapp.service nginx/nextapp.conf nextapp.env.example; do
  test -f "$PROJECT_DIR/$source_file"
done
export DEBIAN_FRONTEND=noninteractive
echo "[setup] Installing server tools..."
apt-get update
apt-get install -y ca-certificates curl gnupg nginx rsync build-essential python3

echo "[setup] Configuring the signed NodeSource Node.js 24 repository..."
NODE_ARCH=$(dpkg --print-architecture)
case "$NODE_ARCH" in amd64|arm64) ;; *) echo "Unsupported architecture: $NODE_ARCH" >&2; exit 1 ;; esac
KEY_DIR=$(mktemp -d)
trap 'rm -rf -- "$KEY_DIR"' EXIT
curl --fail --silent --show-error --location \
  https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  --output "$KEY_DIR/nodesource.asc"
gpg --batch --yes --dearmor --output "$KEY_DIR/nodesource.gpg" "$KEY_DIR/nodesource.asc"
install -m 0644 "$KEY_DIR/nodesource.gpg" /usr/share/keyrings/nextapp-nodesource.gpg
cat > /etc/apt/sources.list.d/nextapp-nodesource.sources <<EOF
Types: deb
URIs: https://deb.nodesource.com/node_24.x
Suites: nodistro
Components: main
Architectures: $NODE_ARCH
Signed-By: /usr/share/keyrings/nextapp-nodesource.gpg
EOF
apt-get update
apt-get install -y nodejs
node -e 'if (process.versions.node.split(".")[0] !== "24") process.exit(1)'

echo "[setup] Preparing the application user and directories..."
if ! getent group nextapp >/dev/null; then
  groupadd --system nextapp
fi
if ! id nextapp >/dev/null 2>&1; then
  useradd --system --gid nextapp --home-dir /var/lib/nextapp \
    --create-home --shell /usr/sbin/nologin nextapp
fi
install -d -o nextapp -g nextapp -m 0750 /var/lib/nextapp
install -d -o root -g nextapp -m 0750 /opt/nextapp /etc/nextapp
install -d -o nextapp -g nextapp -m 0750 /opt/nextapp/current

# Preserve real credentials on subsequent runs.
if [[ ! -e /etc/nextapp/nextapp.env ]]; then
  install -o root -g nextapp -m 0640 "$PROJECT_DIR/nextapp.env.example" /etc/nextapp/nextapp.env
fi
# Next.js loads .env.production for both next build and next start.
# Refuse to overwrite an existing application's environment file.
ENV_LINK=/opt/nextapp/current/.env.production
if [[ -L "$ENV_LINK" && $(readlink -- "$ENV_LINK") == /etc/nextapp/nextapp.env ]]; then
  :
elif [[ -e "$ENV_LINK" || -L "$ENV_LINK" ]]; then
  echo "Existing $ENV_LINK found. Move its values into /etc/nextapp/nextapp.env," >&2
  echo "then remove that file and rerun this script." >&2
  exit 1
else
  ln -s /etc/nextapp/nextapp.env "$ENV_LINK"
fi

echo "[setup] Installing systemd and Nginx configuration..."
install -m 0644 "$PROJECT_DIR/systemd/nextapp.service" /etc/systemd/system/nextapp.service
install -m 0644 "$PROJECT_DIR/nginx/nextapp.conf" /etc/nginx/sites-available/nextapp
ln -sfn /etc/nginx/sites-available/nextapp /etc/nginx/sites-enabled/nextapp
# Disable Ubuntu's default welcome site; keep its source file available.
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  rm /etc/nginx/sites-enabled/default
fi
nginx -t
systemd-analyze verify /etc/systemd/system/nextapp.service
systemctl daemon-reload
systemctl enable --now nginx
systemctl reload nginx

echo "[setup] Ready. Node: $(node --version), npm: $(npm --version)"
echo "[setup] Next.js is not started or enabled yet; application files must be transferred first."
echo "[setup] Until then, HTTP 502 from Nginx is expected. See README.md for the handoff."
