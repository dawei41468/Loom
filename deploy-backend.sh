#!/bin/bash

# This script deploys the backend application to the Tencent Lighthouse server.
# For the first deployment, this script will copy the entire backend directory to the server.

# Server details
SERVER_USER="ubuntu"
SERVER_IP="124.156.174.180"
REMOTE_BASE_DIR="/home/ubuntu/Loom" # Base directory on the server where the project will reside
REMOTE_APP_DIR="${REMOTE_BASE_DIR}/backend"
SSH_KEY_PATH="~/.ssh/id_ed25519_tencentHK"

echo "Copying backend code to ${SERVER_USER}@${SERVER_IP}:${REMOTE_BASE_DIR} (excluding venv)..."
# Ensure the base directory exists on the server
ssh -i ${SSH_KEY_PATH} ${SERVER_USER}@${SERVER_IP} "mkdir -p ${REMOTE_BASE_DIR}"

# Create the target backend directory on the server
ssh -i ${SSH_KEY_PATH} ${SERVER_USER}@${SERVER_IP} "mkdir -p ${REMOTE_APP_DIR}"

# Create a tar archive of the backend directory with safe excludes, then extract it on the server
# Notes:
# - Exclude local virtualenvs (venv/.venv)
# - Exclude all env files; we keep the server's .env.production and don't ship secrets
# - Exclude macOS metadata files (._*, .DS_Store)
# - Exclude logs, __pycache__, .git and pyc files
(cd backend && tar \
  --no-xattr \
  --exclude=venv \
  --exclude=.venv \
  --exclude=.git \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='*.pyo' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  --exclude='._*' \
  --exclude='.env' \
  --exclude='.env.*' \
  -czf - .) | ssh -i ${SSH_KEY_PATH} ${SERVER_USER}@${SERVER_IP} "tar -xzf - -C ${REMOTE_APP_DIR}"

if [ $? -ne 0 ]; then
  echo "Failed to copy backend code. Exiting."
  exit 1
fi

echo "Copying ecosystem.config.js to server..."
scp -i ${SSH_KEY_PATH} ecosystem.config.js ${SERVER_USER}@${SERVER_IP}:${REMOTE_BASE_DIR}/ecosystem.config.js

echo "Connecting to ${SERVER_USER}@${SERVER_IP} and deploying backend..."

ssh -i ${SSH_KEY_PATH} ${SERVER_USER}@${SERVER_IP} << EOF
  echo "Navigating to project directory..."
  cd ${REMOTE_BASE_DIR}

  echo "Creating virtual environment in backend..."
  python3 -m venv backend/venv

  echo "Upgrading pip within the virtual environment..."
  ./backend/venv/bin/pip install --upgrade pip

  echo "Installing backend dependencies into virtual environment from official PyPI..."
  ./backend/venv/bin/pip install --index-url https://pypi.org/simple/ -r backend/requirements.txt

  echo "Stopping existing backend process (if running)..."
  pm2 stop loom-backend || true
  pm2 delete loom-backend || true

  echo "Starting backend application with pm2 using ecosystem file..."
  pm2 start ecosystem.config.js

  echo "Saving pm2 process list..."
  pm2 save

  echo "Backend deployment complete."
EOF

echo "Deployment script finished."