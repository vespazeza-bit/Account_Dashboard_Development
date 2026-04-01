#!/bin/bash
set -e

echo "==> Logging in to Docker Hub..."
docker login

echo "==> Building frontend image..."
docker build -t bmsaccout/accounting-frontend:latest .

echo "==> Building backend image..."
docker build -t bmsaccout/accounting-backend:latest ./backend

echo "==> Pushing images to Docker Hub..."
docker push bmsaccout/accounting-frontend:latest
docker push bmsaccout/accounting-backend:latest

echo ""
echo "Done! Images pushed to Docker Hub."
echo "  bmsaccout/accounting-frontend:latest"
echo "  bmsaccout/accounting-backend:latest"
