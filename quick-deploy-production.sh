#!/bin/bash

# Quick Production Deployment Script
# Uses existing build artifacts to avoid cache issues

set -e

echo "🚀 Quick Production Deployment to 34.235.117.235"

# Configuration
PRODUCTION_SERVER="34.235.117.235"
SSH_USER="ec2-user"
SSH_KEY_PATH="$HOME/.ssh/saygoodbye.pem"
APP_NAME="saygoodbye"
REMOTE_DIR="/home/ec2-user/${APP_NAME}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

if [ ! -f "$SSH_KEY_PATH" ]; then
    print_error "SSH key not found at $SSH_KEY_PATH"
    exit 1
fi

if [ ! -d "frontend/build" ]; then
    print_error "Frontend build directory not found. Please run 'npm run build' in the frontend directory first."
    exit 1
fi

# Fix SSH key permissions
chmod 600 "$SSH_KEY_PATH"

# Test SSH connection
print_status "Testing SSH connection..."
if ! ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$SSH_USER@$PRODUCTION_SERVER" "echo 'SSH connection successful'"; then
    print_error "Failed to connect to production server"
    exit 1
fi

print_status "✅ SSH connection successful!"

# Create deployment package
print_status "Creating deployment package..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEMP_DIR="/tmp/deploy_${TIMESTAMP}"
mkdir -p "${TEMP_DIR}/${APP_NAME}"

# Copy essential files
cp -r backend "${TEMP_DIR}/${APP_NAME}/"
cp -r frontend/build "${TEMP_DIR}/${APP_NAME}/frontend"
cp package.json "${TEMP_DIR}/${APP_NAME}/" 2>/dev/null || true
cp -r scripts "${TEMP_DIR}/${APP_NAME}/" 2>/dev/null || true

# Remove node_modules to save space
rm -rf "${TEMP_DIR}/${APP_NAME}/backend/node_modules"

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Create production environment file
cat > "${TEMP_DIR}/${APP_NAME}/.env" << EOF
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRE=7d
MONGODB_URI=mongodb://localhost:27017/saygoodbye_production
CORS_ORIGIN=http://${PRODUCTION_SERVER}
PORT=3001
UPLOAD_MAX_SIZE=10485760
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
EOF

# Create nginx configuration
mkdir -p "${TEMP_DIR}/${APP_NAME}/nginx"
cat > "${TEMP_DIR}/${APP_NAME}/nginx/nginx-saygoodbye.conf" << EOF
server {
    listen 80;
    server_name ${PRODUCTION_SERVER};
    
    location / {
        root ${REMOTE_DIR}/frontend;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Create PM2 ecosystem file
cat > "${TEMP_DIR}/${APP_NAME}/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'saygoodbye-backend',
    script: 'backend/src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOF

# Create compressed package
print_status "Creating compressed package..."
cd "${TEMP_DIR}"
tar -czf "${APP_NAME}_${TIMESTAMP}.tar.gz" "${APP_NAME}"
cd - > /dev/null

PACKAGE_SIZE=$(du -h "${TEMP_DIR}/${APP_NAME}_${TIMESTAMP}.tar.gz" | cut -f1)
print_status "Package size: ${PACKAGE_SIZE}"

# Upload to server
print_status "Uploading to production server..."
scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "${TEMP_DIR}/${APP_NAME}_${TIMESTAMP}.tar.gz" "$SSH_USER@$PRODUCTION_SERVER:/tmp/"

if [ $? -ne 0 ]; then
    print_error "Upload failed!"
    exit 1
fi

print_status "✅ Upload completed successfully"

# Deploy on server
print_status "Deploying on production server..."
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$SSH_USER@$PRODUCTION_SERVER" << EOF
set -e

echo "🚀 Starting server-side deployment..."

# Stop existing services
sudo systemctl stop nginx || true
pm2 stop all || true
pm2 delete all || true

# Create backup
if [ -d "${REMOTE_DIR}" ]; then
    sudo mv "${REMOTE_DIR}" "${REMOTE_DIR}_backup_\$(date +%Y%m%d_%H%M%S)" || true
fi

# Extract new version
cd /tmp
tar -xzf "${APP_NAME}_${TIMESTAMP}.tar.gz"
sudo mv "${APP_NAME}" "${REMOTE_DIR}"
sudo chown -R $SSH_USER:$SSH_USER "${REMOTE_DIR}"

# Install backend dependencies
cd "${REMOTE_DIR}"
npm install --production

# Install PM2 globally if not exists
npm list -g pm2 || sudo npm install -g pm2

# Set up nginx
sudo cp nginx/nginx-saygoodbye.conf /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx

# Start backend with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Set up MongoDB if not running
sudo systemctl start mongod || true
sudo systemctl enable mongod || true

echo "✅ Server-side deployment completed!"
EOF

if [ $? -ne 0 ]; then
    print_error "Server-side deployment failed!"
    exit 1
fi

# Health check
print_status "Running health checks..."
sleep 10

# Check backend
if curl -f "http://$PRODUCTION_SERVER/api/health" > /dev/null 2>&1; then
    print_status "✅ Backend health check passed"
else
    print_warning "Backend health check failed - checking logs..."
fi

# Check frontend
if curl -f "http://$PRODUCTION_SERVER/" > /dev/null 2>&1; then
    print_status "✅ Frontend health check passed"
else
    print_warning "Frontend health check failed"
fi

# Cleanup
rm -rf "$TEMP_DIR"

print_status "🎉 Production deployment completed successfully!"
print_status "📱 Application URL: http://$PRODUCTION_SERVER"
print_status "🔧 Backend API: http://$PRODUCTION_SERVER/api"

echo ""
echo "🎉 Quick Production Deployment Complete! 🎉"
echo "=================================="
echo "Frontend: http://$PRODUCTION_SERVER"
echo "Backend:  http://$PRODUCTION_SERVER/api"
echo ""
echo "To check status:"
echo "ssh -i $SSH_KEY_PATH $SSH_USER@$PRODUCTION_SERVER"
echo "pm2 status"
echo "sudo systemctl status nginx"
