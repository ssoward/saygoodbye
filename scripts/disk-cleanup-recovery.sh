#!/bin/bash

# Emergency Disk Space Cleanup and Recovery
set -e

source deploy.config.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_header() { echo -e "${BLUE}=== $1 ===${NC}"; }

print_header "Emergency Disk Space Cleanup and Recovery"

print_status "Checking disk space and cleaning up server..."

# SSH and cleanup server disk space
ssh -i "$SSH_KEY" ec2-user@$SERVER_HOST << 'CLEANUP_SCRIPT'
set -e

echo "=== Disk Space Cleanup ==="

# Check current disk usage
echo "Current disk usage:"
df -h /

echo ""
echo "Cleaning up disk space..."

# Stop services to free up memory and processes
sudo pkill -f node || true
pm2 kill || true
sudo systemctl stop nginx || true

# Clean package manager caches
echo "Cleaning package caches..."
sudo yum clean all || true
sudo dnf clean all || true

# Clean temporary files
echo "Cleaning temporary files..."
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# Clean log files
echo "Cleaning large log files..."
sudo find /var/log -name "*.log" -exec truncate -s 0 {} \; || true
sudo find /home/ec2-user -name "*.log" -exec truncate -s 0 {} \; || true

# Clean old node_modules if they exist
echo "Removing old node_modules..."
find /home/ec2-user -name "node_modules" -type d -exec sudo rm -rf {} + 2>/dev/null || true

# Clean npm cache
echo "Cleaning npm cache..."
npm cache clean --force || true

# Clean any old tar files
echo "Removing old deployment archives..."
sudo find /home/ec2-user -name "*.tar.gz" -delete || true
sudo find /tmp -name "*.tar.gz" -delete || true

# Clean PM2 logs
echo "Cleaning PM2 logs..."
pm2 flush || true

# Clean journal logs (keep only last day)
echo "Cleaning system journal logs..."
sudo journalctl --vacuum-time=1d || true

echo ""
echo "Disk usage after cleanup:"
df -h /

echo ""
echo "=== Cleanup completed ==="
CLEANUP_SCRIPT

print_status "Cleanup completed! Now deploying minimal recovery..."

# Create minimal deployment without node_modules
MINIMAL_PACKAGE="saygoodbye_minimal_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$MINIMAL_PACKAGE"

# Copy only essential files
cp -r backend/src "$MINIMAL_PACKAGE/"
mkdir -p "$MINIMAL_PACKAGE/backend"
cp backend/package.json "$MINIMAL_PACKAGE/backend/"

# Copy frontend build
mkdir -p "$MINIMAL_PACKAGE/frontend"
cp -r frontend/build "$MINIMAL_PACKAGE/frontend/"

# Create production environment
cat > "$MINIMAL_PACKAGE/.env.production" << EOF
NODE_ENV=production
PORT=$BACKEND_PORT
MONGODB_URI=mongodb://localhost:27017/saygoodbye_production
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=http://$SERVER_HOST
UPLOAD_MAX_SIZE=10485760
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
EOF

# Create nginx config
mkdir -p "$MINIMAL_PACKAGE/config"
cat > "$MINIMAL_PACKAGE/config/nginx.conf" << EOF
server {
    listen 80;
    server_name $SERVER_HOST $SERVER_HOSTNAME;
    
    # Frontend
    location / {
        root /home/ec2-user/saygoodbye/frontend/build;
        try_files \$uri \$uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    # API
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60;
        proxy_connect_timeout 60;
        proxy_send_timeout 60;
        
        # Handle CORS
        add_header Access-Control-Allow-Origin "http://$SERVER_HOST" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
        
        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }
    
    client_max_body_size 10M;
}
EOF

# Create PM2 config
cat > "$MINIMAL_PACKAGE/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: '$PM2_APP_NAME',
    script: 'src/server.js',
    cwd: '/home/ec2-user/saygoodbye/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: $BACKEND_PORT
    },
    env_file: '/home/ec2-user/saygoodbye/.env.production',
    error_file: '/home/ec2-user/logs/err.log',
    out_file: '/home/ec2-user/logs/out.log',
    log_file: '/home/ec2-user/logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000
  }]
};
EOF

# Create minimal setup script
cat > "$MINIMAL_PACKAGE/minimal_setup.sh" << 'EOF'
#!/bin/bash

set -e

echo "=== Minimal Recovery Setup ==="

# Set paths
DEPLOY_PATH="/home/ec2-user/saygoodbye"
LOG_PATH="/home/ec2-user/logs"

# Create directories
mkdir -p $LOG_PATH

# Clean slate for deployment
sudo rm -rf $DEPLOY_PATH
sudo mkdir -p $DEPLOY_PATH/backend/src
sudo mkdir -p $DEPLOY_PATH/frontend
sudo mkdir -p $DEPLOY_PATH/config

# Copy files
sudo cp -r src/* $DEPLOY_PATH/backend/src/
sudo cp backend/package.json $DEPLOY_PATH/backend/
sudo cp -r frontend/build $DEPLOY_PATH/frontend/
sudo cp config/nginx.conf $DEPLOY_PATH/config/
sudo cp .env.production $DEPLOY_PATH/
sudo cp ecosystem.config.js $DEPLOY_PATH/
sudo chown -R ec2-user:ec2-user $DEPLOY_PATH

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install only production dependencies
cd $DEPLOY_PATH/backend
npm install --production --no-optional

# Configure nginx
sudo cp $DEPLOY_PATH/config/nginx.conf /etc/nginx/conf.d/saygoodbye.conf
sudo rm -f /etc/nginx/conf.d/default.conf
sudo systemctl start nginx
sudo systemctl enable nginx

# Start application
cd $DEPLOY_PATH
pm2 start ecosystem.config.js
pm2 save
pm2 startup amazon 2>/dev/null | grep "sudo env" | bash || true

echo "=== Testing Services ==="
sleep 10

# Test services
if mongosh --eval "db.adminCommand('ping')" --quiet 2>/dev/null; then
    echo "✅ MongoDB is working"
else
    echo "❌ MongoDB test failed"
    exit 1
fi

if pm2 status | grep -q "saygoodbye-api.*online"; then
    echo "✅ PM2 application is running"
else
    echo "❌ PM2 application failed"
    pm2 logs --lines 5 --nostream
    exit 1
fi

if sudo systemctl is-active nginx >/dev/null; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx failed"
    exit 1
fi

echo "=== Minimal Recovery Completed Successfully ==="
EOF

chmod +x "$MINIMAL_PACKAGE/minimal_setup.sh"

# Create minimal archive (without node_modules)
tar -czf "${MINIMAL_PACKAGE}.tar.gz" "$MINIMAL_PACKAGE"
rm -rf "$MINIMAL_PACKAGE"

print_status "Uploading minimal package..."

# Upload minimal package
scp -i "$SSH_KEY" "${MINIMAL_PACKAGE}.tar.gz" ec2-user@$SERVER_HOST:/tmp/

print_status "Executing minimal recovery..."

# Execute minimal recovery
ssh -i "$SSH_KEY" ec2-user@$SERVER_HOST << 'REMOTE_RECOVERY'
set -e

cd /tmp

echo "=== Starting Minimal Recovery ==="

# Extract and run
tar -xzf saygoodbye_minimal_*.tar.gz
cd saygoodbye_minimal_*

chmod +x minimal_setup.sh
sudo ./minimal_setup.sh

# Cleanup
cd /tmp
rm -rf saygoodbye_minimal_*

echo "=== Minimal Recovery Completed ==="
REMOTE_RECOVERY

print_status "Testing deployment..."
sleep 10

# Test the deployment
for test_attempt in 1 2 3; do
    print_status "Test attempt $test_attempt/3..."
    
    # Test frontend
    frontend_status=$(curl -s -w "%{http_code}" "http://$SERVER_HOST" -o /dev/null 2>/dev/null || echo "000")
    print_status "Frontend status: $frontend_status"
    
    # Test API health
    api_status=$(curl -s -w "%{http_code}" "http://$SERVER_HOST/api/health" -o /dev/null 2>/dev/null || echo "000")
    print_status "API health status: $api_status"
    
    # Test login endpoint
    login_status=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "http://$SERVER_HOST/api/auth/login" -o /dev/null 2>/dev/null || echo "000")
    print_status "Login endpoint status: $login_status"
    
    if [ "$frontend_status" = "200" ] && [ "$api_status" = "200" ] && ([ "$login_status" = "400" ] || [ "$login_status" = "422" ]); then
        print_status "✅ SUCCESS! All services are working correctly"
        print_header "🎉 Minimal Recovery Completed Successfully!"
        echo "✅ Frontend: http://$SERVER_HOST"
        echo "✅ API: http://$SERVER_HOST/api"
        echo "✅ Login functionality restored"
        echo ""
        echo "🔧 Server management:"
        echo "   SSH: ssh -i $SSH_KEY ec2-user@$SERVER_HOST"
        echo "   PM2 status: pm2 status"
        echo "   PM2 logs: pm2 logs saygoodbye-api"
        echo "   Restart API: pm2 restart saygoodbye-api"
        exit 0
    elif [ $test_attempt -eq 3 ]; then
        print_error "❌ Services still not responding correctly"
        exit 1
    else
        print_warning "⚠️  Services still starting up, waiting..."
        sleep 15
    fi
done

# Cleanup
rm -f "${MINIMAL_PACKAGE}.tar.gz"
