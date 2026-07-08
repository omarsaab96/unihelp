#!/bin/bash

SERVER="root@193.187.132.170"
APP_DIR="/var/www/unihelp"
PM2_NAME="unihelp-api"

ssh $SERVER << EOF
  set -e

  echo "Going to project..."
  cd $APP_DIR

  echo "Pulling latest code..."
  git pull

  echo "Installing server dependencies..."
  cd server
  npm install

  echo "Restarting PM2..."
  pm2 restart $PM2_NAME || pm2 start index.js --name $PM2_NAME

  echo "Saving PM2..."
  pm2 save

  echo "Deployment completed."
EOF