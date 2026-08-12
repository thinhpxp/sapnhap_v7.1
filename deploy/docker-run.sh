#!/bin/bash
set -e

# Stop and remove existing container if running
docker stop sapnhap-api 2>/dev/null || true
docker rm sapnhap-api 2>/dev/null || true

# Run container mapping only 127.0.0.1:3000 to prevent external bypass of Nginx
docker run -d \
  --name sapnhap-api \
  -p 127.0.0.1:3000:3000 \
  --restart=unless-stopped \
  --env-file /etc/sapnhap/.env \
  sapnhap-api:latest

echo "✅ sapnhap-api Docker container started successfully."
