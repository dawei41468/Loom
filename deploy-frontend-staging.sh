#!/bin/bash

# This script deploys the frontend application to the Tencent Lighthouse server for staging.

# Server details
SERVER_USER="ubuntu"
SERVER_IP="124.156.174.180"
REMOTE_BASE_DIR="/home/ubuntu/Loom-staging" # Base directory on the server where the staging project will reside
REMOTE_FRONTEND_DIR="${REMOTE_BASE_DIR}/frontend"
REMOTE_WEB_ROOT="/var/www" # Base Nginx web root
REMOTE_LOOM_FRONTEND_DIR="${REMOTE_WEB_ROOT}/staging-frontend" # Directory for staging frontend (aligns with nginx/staging.studiodtw.net)
SSH_KEY_PATH="~/.ssh/id_ed25519_tencentHK"

echo "Creating tar archive of frontend (excluding node_modules)..."
# Create a tar archive of the repository (frontend is at repo root; build will run there)
# Exclude node_modules to reduce payload
# Disable macOS extended attributes
export COPYFILE_DISABLE=1
if [ -d node_modules ]; then
  TAR_EXCLUDES=(--exclude='node_modules')
else
  TAR_EXCLUDES=()
fi

# Include only files needed to build (package.json, lock, src, public, vite config, ts configs, etc.) to keep upload lean
# Fallback to archiving entire repo if patterns fail is not implemented to keep script simple
tar --no-xattrs -czf frontend-staging.tar.gz \
  package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json index.html .env.staging \
  public src \
  2>/dev/null || tar --no-xattrs "${TAR_EXCLUDES[@]}" -czf frontend-staging.tar.gz .

if [ $? -ne 0 ]; then
  echo "Failed to create frontend tar archive. Exiting."
  exit 1
fi

echo "Copying frontend-staging.tar.gz to ${SERVER_USER}@${SERVER_IP}:${REMOTE_BASE_DIR}/..."
# Copy the tar archive to your Tencent Lighthouse server
scp -i ${SSH_KEY_PATH} frontend-staging.tar.gz ${SERVER_USER}@${SERVER_IP}:${REMOTE_BASE_DIR}/

if [ $? -ne 0 ]; then
  echo "Failed to copy frontend-staging.tar.gz. Exiting."
  exit 1
fi

echo "Cleaning up local tar archive..."
rm frontend-staging.tar.gz

echo "Connecting to ${SERVER_USER}@${SERVER_IP} and deploying frontend..."

ssh -i ${SSH_KEY_PATH} ${SERVER_USER}@${SERVER_IP} << EOF
  set -e
  echo "Navigating to base project directory..."
  cd ${REMOTE_BASE_DIR}

  echo "Removing existing frontend directory on server..."
  rm -rf frontend

  echo "Creating new frontend directory..."
  mkdir -p frontend

 echo "Extracting frontend-staging.tar.gz..."
  tar --no-xattrs -xzf frontend-staging.tar.gz -C frontend --strip-components=0

  echo "Removing frontend-staging.tar.gz on server..."
  rm -f frontend-staging.tar.gz

 echo "Navigating to frontend directory..."
  cd frontend

  echo "Installing frontend dependencies..."
  npm ci || npm install

  echo "Building frontend for staging..."
  npm run build -- --mode staging

  if [ \$? -ne 0 ]; then
    echo "Frontend build failed on server."
    exit 1
  else
    echo "Copying built frontend assets to Nginx web root for staging..."
    sudo mkdir -p ${REMOTE_LOOM_FRONTEND_DIR}
    sudo cp -r dist/* ${REMOTE_LOOM_FRONTEND_DIR}/
  fi

  echo "Frontend staging deployment complete."
EOF

if [ $? -ne 0 ]; then
  echo "Deployment script failed on remote server. Exiting."
  exit 1
fi

echo "Frontend staging deployment script finished."