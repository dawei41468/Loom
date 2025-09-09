#!/bin/bash
# Deploy Nginx vhost for loom.studiodtw.net
set -euo pipefail

SERVER_USER="ubuntu"
SERVER_IP="124.156.174.180"
SSH_KEY="$HOME/.ssh/id_ed25519_tencentHK"
VHOST_NAME="loom.studiodtw.net"

LOCAL_VHOST_FILE="nginx/${VHOST_NAME}"
REMOTE_AVAILABLE_DIR="/etc/nginx/sites-available"
REMOTE_ENABLED_DIR="/etc/nginx/sites-enabled"

echo "==> Checking local vhost file: ${LOCAL_VHOST_FILE}"
if [[ ! -f "${LOCAL_VHOST_FILE}" ]]; then
  echo "Error: Local vhost file not found: ${LOCAL_VHOST_FILE}"
  exit 1
fi

echo "==> Uploading vhost to server: ${SERVER_USER}@${SERVER_IP}:${REMOTE_AVAILABLE_DIR}/${VHOST_NAME}"
scp -i "${SSH_KEY}" "${LOCAL_VHOST_FILE}" "${SERVER_USER}@${SERVER_IP}:/tmp/${VHOST_NAME}.tmp"

echo "==> Moving vhost into ${REMOTE_AVAILABLE_DIR} (with backup if exists)"
ssh -i "${SSH_KEY}" "${SERVER_USER}@${SERVER_IP}" bash -s -- <<EOF
set -euo pipefail

VHOST_NAME="${VHOST_NAME}"
REMOTE_AVAILABLE_DIR="${REMOTE_AVAILABLE_DIR}"
REMOTE_ENABLED_DIR="${REMOTE_ENABLED_DIR}"
REMOTE_VHOST_FILE="\${REMOTE_AVAILABLE_DIR}/\${VHOST_NAME}"

sudo mkdir -p "\${REMOTE_AVAILABLE_DIR}" "\${REMOTE_ENABLED_DIR}"

if [[ -f "\${REMOTE_VHOST_FILE}" ]]; then
  TS=\$(date +%F-%H%M%S)
  sudo cp "\${REMOTE_VHOST_FILE}" "\${REMOTE_VHOST_FILE}.bak.\${TS}"
  echo "Backed up existing vhost to \${REMOTE_VHOST_FILE}.bak.\${TS}"
fi

sudo mv "/tmp/\${VHOST_NAME}.tmp" "\${REMOTE_VHOST_FILE}"
sudo chown root:root "\${REMOTE_VHOST_FILE}"
sudo chmod 644 "\${REMOTE_VHOST_FILE}"

if [[ -L "\${REMOTE_ENABLED_DIR}/\${VHOST_NAME}" || -e "\${REMOTE_ENABLED_DIR}/\${VHOST_NAME}" ]]; then
  sudo rm -f "\${REMOTE_ENABLED_DIR}/\${VHOST_NAME}"
fi
sudo ln -s "\${REMOTE_VHOST_FILE}" "\${REMOTE_ENABLED_DIR}/\${VHOST_NAME}"

sudo nginx -t
sudo systemctl reload nginx
EOF

echo "==> Deployment of ${VHOST_NAME} vhost complete."
