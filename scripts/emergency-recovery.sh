#!/bin/bash

# Emergency Recovery and Full Deployment Script
# This script will completely redeploy and fix all issues

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

print_header "Emergency Recovery Deployment"

# Build frontend with proper API configuration
print_status "Building frontend with correct API configuration..."
cd frontend

# Ensure proper environment configuration
cat > .env.production << EOF
REACT_APP_API_URL=http://$SERVER_HOST/api
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
EOF

# Clean build
rm -rf build node_modules
npm install
npm run build

if [ ! -d "build" ]; then
    print_error "Frontend build failed"
    exit 1
fi

cd ..

# Create comprehensive deployment package
print_status "Creating comprehensive deployment package..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="saygoodbye_recovery_${TIMESTAMP}"
mkdir -p "$PACKAGE_NAME"

# Copy all necessary files
cp -r backend "$PACKAGE_NAME/"
mkdir -p "$PACKAGE_NAME/frontend"
cp -r frontend/build "$PACKAGE_NAME/frontend/"

# Create production environment
cat > "$PACKAGE_NAME/.env.production" << EOF
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
mkdir -p "$PACKAGE_NAME/config"
cat > "$PACKAGE_NAME/config/nginx.conf" << EOF
server {
    listen 80;
    server_name $SERVER_HOST $SERVER_HOSTNAME;
    
    # Frontend
    location / {
        root $DEPLOY_PATH/frontend/build;
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
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

# Create PM2 config
cat > "$PACKAGE_NAME/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: '$PM2_APP_NAME',
    script: 'backend/src/server.js',
    cwd: '$DEPLOY_PATH',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: $BACKEND_PORT
    },
    env_file: '$DEPLOY_PATH/.env.production',
    error_file: '$LOG_PATH/err.log',
    out_file: '$LOG_PATH/out.log',
    log_file: '$LOG_PATH/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
EOF

# Create comprehensive setup script
cat > "$PACKAGE_NAME/recovery_setup.sh" << 'EOF'
#!/bin/bash

set -e

DEPLOY_PATH="/home/ec2-user/saygoodbye"
BACKUP_PATH="/home/ec2-user/backups"
LOG_PATH="/home/ec2-user/logs"
PM2_APP_NAME="saygoodbye-api"

echo "=== Emergency Recovery Setup ==="

# Stop everything first
pkill -f node || true
pm2 kill || true
sudo systemctl stop nginx || true

# Update system
sudo yum update -y

# Install/update Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install/update MongoDB
if ! command -v mongod &> /dev/null; then
    cat > /tmp/mongodb-org-7.0.repo << 'REPO_EOF'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
REPO_EOF
    sudo mv /tmp/mongodb-org-7.0.repo /etc/yum.repos.d/
    sudo yum install -y mongodb-org
fi

# Install/update nginx
sudo amazon-linux-extras install -y nginx1 || sudo yum install -y nginx

# Install/update PM2
sudo npm install -g pm2@latest

# Create directories
mkdir -p $BACKUP_PATH $LOG_PATH

# Backup existing if present
if [ -d "$DEPLOY_PATH" ]; then
    sudo tar -czf "$BACKUP_PATH/backup_$(date +%Y%m%d_%H%M%S).tar.gz" -C "$(dirname "$DEPLOY_PATH")" "$(basename "$DEPLOY_PATH")" 2>/dev/null || true
fi

# Clean slate
sudo rm -rf $DEPLOY_PATH
sudo mkdir -p $DEPLOY_PATH
sudo cp -r ./* $DEPLOY_PATH/
sudo chown -R ec2-user:ec2-user $DEPLOY_PATH

# Start MongoDB first
sudo systemctl start mongod
sudo systemctl enable mongod

# Wait for MongoDB
sleep 5

# Verify MongoDB is running
if ! sudo systemctl is-active mongod >/dev/null; then
    echo "ERROR: MongoDB failed to start"
    sudo systemctl status mongod
    exit 1
fi

# Install backend dependencies
cd $DEPLOY_PATH/backend
npm install --production

# Configure nginx
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/conf.d/default.conf
sudo cp $DEPLOY_PATH/config/nginx.conf /etc/nginx/conf.d/saygoodbye.conf

# Test nginx config
if ! sudo nginx -t; then
    echo "ERROR: Nginx configuration test failed"
    exit 1
fi

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Start application
cd $DEPLOY_PATH
pm2 start ecosystem.config.js
pm2 save
pm2 startup amazon 2>/dev/null | grep "sudo env" | bash || true

echo "=== Waiting for application to start ==="
sleep 15

echo "=== Testing Services ==="

# Test MongoDB
if mongosh --eval "db.adminCommand('ping')" --quiet 2>/dev/null; then
    echo "✅ MongoDB is working"
else
    echo "❌ MongoDB test failed"
    exit 1
fi

# Test PM2
if pm2 status | grep -q "saygoodbye-api.*online"; then
    echo "✅ PM2 application is running"
else
    echo "❌ PM2 application failed to start"
    pm2 logs saygoodbye-api --lines 10 --nostream
    exit 1
fi

# Test nginx
if sudo systemctl is-active nginx >/dev/null; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx failed to start"
    exit 1
fi

# Test local API
if curl -s http://localhost/api/health | grep -q "healthy"; then
    echo "✅ API health check passed"
else
    echo "❌ API health check failed"
    pm2 logs saygoodbye-api --lines 5 --nostream
    exit 1
fi

# Test authentication endpoint
if curl -s -X POST -H "Content-Type: application/json" -d '{}' http://localhost/api/auth/login | grep -q -i "error\|message\|validation"; then
    echo "✅ Authentication endpoint is responding"
else
    echo "❌ Authentication endpoint not responding correctly"
    pm2 logs saygoodbye-api --lines 5 --nostream
    exit 1
fi

echo "=== Recovery Setup Completed Successfully ==="
echo "Frontend: http://$(curl -s ifconfig.me)"
echo "API: http://$(curl -s ifconfig.me)/api"

EOF

chmod +x "$PACKAGE_NAME/recovery_setup.sh"

# Create archive
tar -czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"
rm -rf "$PACKAGE_NAME"

print_status "Recovery package created: ${PACKAGE_NAME}.tar.gz"

# Upload to S3 and deploy via SSM
print_status "Uploading to S3 and deploying via Systems Manager..."

BUCKET_NAME="saygoodbye-recovery-$(date +%s)"
aws s3 mb "s3://$BUCKET_NAME" --region "$AWS_REGION"
aws s3 cp "${PACKAGE_NAME}.tar.gz" "s3://$BUCKET_NAME/" --region "$AWS_REGION"

# Deploy via SSM
COMMAND_ID=$(aws ssm send-command \
    --region "$AWS_REGION" \
    --instance-ids i-08f2f78559bf7f3ae \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[
        \"cd /tmp\",
        \"aws s3 cp s3://$BUCKET_NAME/${PACKAGE_NAME}.tar.gz .\",
        \"tar -xzf ${PACKAGE_NAME}.tar.gz\",
        \"cd ${PACKAGE_NAME}\",
        \"chmod +x recovery_setup.sh\",
        \"sudo ./recovery_setup.sh\",
        \"rm -f /tmp/${PACKAGE_NAME}.tar.gz\"
    ]" \
    --comment "Emergency recovery deployment" \
    --query 'Command.CommandId' \
    --output text)

print_status "Deployment command sent: $COMMAND_ID"
print_status "Waiting for deployment to complete..."

# Wait for completion
aws ssm wait command-executed \
    --region "$AWS_REGION" \
    --command-id "$COMMAND_ID" \
    --instance-id i-08f2f78559bf7f3ae \
    --cli-read-timeout 600

# Get output
OUTPUT=$(aws ssm get-command-invocation \
    --region "$AWS_REGION" \
    --command-id "$COMMAND_ID" \
    --instance-id i-08f2f78559bf7f3ae \
    --query 'StandardOutputContent' \
    --output text)

echo "=== Deployment Output ==="
echo "$OUTPUT"

# Clean up S3
aws s3 rm "s3://$BUCKET_NAME" --recursive --region "$AWS_REGION"
aws s3 rb "s3://$BUCKET_NAME" --region "$AWS_REGION"
rm -f "${PACKAGE_NAME}.tar.gz"

# Test the deployment
print_status "Testing deployment..."
sleep 20

# Comprehensive testing
for test_attempt in 1 2 3; do
    print_status "Test attempt $test_attempt/3..."
    
    # Test frontend
    frontend_status=$(curl -s -w "%{http_code}" "http://$SERVER_HOST" -o /dev/null)
    print_status "Frontend status: $frontend_status"
    
    # Test API health
    api_status=$(curl -s -w "%{http_code}" "http://$SERVER_HOST/api/health" -o /dev/null)
    print_status "API health status: $api_status"
    
    # Test login endpoint
    login_status=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "http://$SERVER_HOST/api/auth/login" -o /dev/null)
    print_status "Login endpoint status: $login_status"
    
    if [ "$frontend_status" = "200" ] && [ "$api_status" = "200" ] && ([ "$login_status" = "400" ] || [ "$login_status" = "422" ]); then
        print_status "✅ SUCCESS! All services are working correctly"
        break
    elif [ $test_attempt -eq 3 ]; then
        print_error "❌ Deployment tests failed after 3 attempts"
        exit 1
    else
        print_warning "⚠️  Services still starting up, waiting..."
        sleep 15
    fi
done

print_header "🎉 Emergency Recovery Completed Successfully!"
echo "✅ Frontend: http://$SERVER_HOST"
echo "✅ API: http://$SERVER_HOST/api"
echo "✅ Login should now work properly"
echo ""
echo "🔧 Management commands:"
echo "   SSH: ssh -i $SSH_KEY ec2-user@$SERVER_HOST"
echo "   PM2 status: pm2 status"
echo "   PM2 logs: pm2 logs saygoodbye-api"
echo "   Restart: pm2 restart saygoodbye-api"
