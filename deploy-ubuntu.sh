#!/bin/bash

set -e

echo "🚀 Starting Deals App Deployment..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y \
    curl \
    gnupg \
    ca-certificates \
    lsb-release \
    nginx \
    openssl

# Install Docker
echo "🐳 Installing Docker..."

sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu \
$(lsb_release -cs) stable" | \
sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update

sudo apt install -y \
docker-ce \
docker-ce-cli \
containerd.io \
docker-buildx-plugin \
docker-compose-plugin

# Start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Create app directory
mkdir -p ~/deals-app
cd ~/deals-app

echo ""
echo "📂 COPY PROJECT FILES TO:"
echo "~/deals-app"
echo ""
echo "Example:"
echo "scp -r ./deals ubuntu@YOUR_PUBLIC_IP:~/deals-app/"
echo ""

read -p "Press ENTER after copying files..."

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me)

# Create .env
cat > .env << EOF
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)
MYSQL_DATABASE=deals
MYSQL_USER=deals_user
MYSQL_PASSWORD=$(openssl rand -hex 16)

JWT_SECRET=$(openssl rand -hex 32)

NODE_ENV=production

FRONTEND_ORIGIN=http://$PUBLIC_IP
EOF

echo "✅ .env created"

# Remove default nginx config
sudo rm -f /etc/nginx/sites-enabled/default

# Configure nginx
sudo tee /etc/nginx/sites-available/deals > /dev/null << EOF
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:8080;

        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/deals /etc/nginx/sites-enabled/deals

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Build and start containers
echo "🏗 Starting containers..."

sudo docker compose up --build -d

# Wait for startup
sleep 30

# Show status
sudo docker compose ps

# Health check
echo "🩺 Running backend health check..."

curl -f http://localhost:4000/api/health || {
    echo "❌ Backend health check failed"
    sudo docker compose logs --tail=50
    exit 1
}

echo ""
echo "======================================="
echo "✅ DEPLOYMENT SUCCESSFUL"
echo "======================================="
echo ""
echo "🌐 Access your app:"
echo "http://$PUBLIC_IP"
echo ""
echo "📋 Useful commands:"
echo "sudo docker compose logs -f"
echo "sudo docker compose restart"
echo "sudo docker compose down"
echo ""

echo "⚠️ IMPORTANT AWS SECURITY GROUP PORTS:"
echo "22  -> SSH"
echo "80  -> HTTP"
echo ""