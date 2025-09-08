#!/bin/bash

# This script deploys the frontend application to the Tencent Lighthouse server.

# Server details
SERVER_USER="ubuntu"
SERVER_IP="124.156.174.180"
REMOTE_BASE_DIR="/home/ubuntu/Loom" # Base directory on the server where the project will reside
REMOTE_FRONTEND_DIR="${REMOTE_BASE_DIR}/frontend"
REMOTE_WEB_ROOT="/var/www" # Base Nginx web root
REMOTE_LOOM_FRONTEND_DIR="${REMOTE_WEB_ROOT}/loom-frontend" # Directory for Loom frontend (aligns with nginx/loom.studiodtw.net)
SSH_KEY_PATH="~/.ssh/id_ed25519_tencentHK"

echo "Creating tar archive of frontend (excluding node_modules)..."
# Create a tar archive of the repository (frontend is at repo root; build will run there)
# Exclude node_modules to reduce payload
if [ -d node_modules ]; then
  TAR_EXCLUDES=(--exclude='node_modules')
else
  TAR_EXCLUDES=()
fi

# Include only files needed to build (package.json, lock, src, public, vite config, ts configs, etc.) to keep upload lean
# Fallback to archiving entire repo if patterns fail is not implemented to keep script simple
 tar -czf frontend.tar.gz \
  package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json index.html .env.production \
  public src \
  2>/dev/null || tar "${TAR_EXCLUDES[@]}" -czf frontend.tar.gz .

if [ $? -ne 0 ]; then
  echo "Failed to create frontend tar archive. Exiting."
  exit 1
fi

echo "Copying frontend.tar.gz to ${SERVER_USER}@${SERVER_IP}:${REMOTE_BASE_DIR}/..."
# Copy the tar archive to your Tencent Lighthouse server
scp -i ${SSH_KEY_PATH} frontend.tar.gz ${SERVER_USER}@${SERVER_IP}:${REMOTE_BASE_DIR}/

if [ $? -ne 0 ]; then
  echo "Failed to copy frontend.tar.gz. Exiting."
  exit 1
fi

echo "Cleaning up local tar archive..."
rm frontend.tar.gz

echo "Connecting to ${SERVER_USER}@${SERVER_IP} and deploying frontend..."

ssh -i ${SSH_KEY_PATH} ${SERVER_USER}@${SERVER_IP} << EOF
  set -e
  echo "Navigating to base project directory..."
  cd ${REMOTE_BASE_DIR}

  echo "Removing existing frontend directory on server..."
  rm -rf frontend

  echo "Creating new frontend directory..."
  mkdir -p frontend

  echo "Extracting frontend.tar.gz..."
  tar -xzf frontend.tar.gz -C frontend --strip-components=0

  echo "Removing frontend.tar.gz on server..."
  rm -f frontend.tar.gz

  echo "Navigating to frontend directory..."
  cd frontend

  echo "Installing frontend dependencies..."
  npm ci || npm install

  echo "Building frontend for production..."
  npm run build -- --mode production

  if [ \$? -ne 0 ]; then
    echo "Frontend build failed on server."
    exit 1
  else
    echo "Copying built frontend assets to Nginx web root..."
    sudo mkdir -p ${REMOTE_LOOM_FRONTEND_DIR}
    sudo cp -r dist/* ${REMOTE_LOOM_FRONTEND_DIR}/
  fi

  echo "Frontend deployment complete."
EOF

if [ $? -ne 0 ]; then
  echo "Deployment script failed on remote server. Exiting."
  exit 1
fi

echo "Frontend deployment script finished."