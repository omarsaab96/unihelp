#!/bin/bash
set -e

ssh -i "$HOME/.ssh/id_ed25519" root@193.187.132.170 << 'EOF'
set -e

echo "Going to project..."
cd /var/www/unihelp

echo "Current folder:"
pwd

echo "Pulling latest code..."
git pull

echo "Installing server dependencies..."
cd server
npm install

echo "Restarting PM2..."
pm2 restart unihelp-api || pm2 start index.js --name unihelp-api

pm2 save
echo "Deployment completed."
EOF