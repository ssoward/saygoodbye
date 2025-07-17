#!/bin/bash

# Manual Deployment Package Creator for Say Goodbye POA
# Creates a complete deployment package when SSH is not available

set -e

# Load configuration
source deploy.config.sh

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

print_header "📦 Creating Manual Deployment Package"

# Create timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="saygoodbye_manual_deploy_${TIMESTAMP}"
TEMP_DIR=$(mktemp -d)

print_status "Creating deployment package: $PACKAGE_NAME"

# Build frontend first
print_header "🔨 Building Frontend"
cd frontend

# Update production environment
print_status "Configuring production environment..."
cat > .env.production << EOF
REACT_APP_API_URL=http://$SERVER_HOST/api
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
EOF

# Build for production
print_status "Building React application..."
npm run build

if [ ! -d "build" ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

cd ..

# Create package structure
mkdir -p "$TEMP_DIR/$PACKAGE_NAME"

# Copy backend
print_status "Copying backend files..."
cp -r backend "$TEMP_DIR/$PACKAGE_NAME/"

# Copy frontend build
print_status "Copying frontend build..."
mkdir -p "$TEMP_DIR/$PACKAGE_NAME/frontend"
cp -r frontend/build "$TEMP_DIR/$PACKAGE_NAME/frontend/"

# Create production environment file
print_status "Creating production environment..."
cat > "$TEMP_DIR/$PACKAGE_NAME/.env.production" << EOF
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

# Create nginx configuration
print_status "Creating nginx configuration..."
mkdir -p "$TEMP_DIR/$PACKAGE_NAME/config"
cat > "$TEMP_DIR/$PACKAGE_NAME/config/nginx.conf" << EOF
server {
    listen 80;
    server_name $SERVER_HOST $SERVER_HOSTNAME;
    
    # Frontend static files
    location / {
        root $DEPLOY_PATH/frontend/build;
        try_files \$uri \$uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API endpoints
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
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # File uploads
    client_max_body_size 10M;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# Create PM2 ecosystem file
print_status "Creating PM2 configuration..."
cat > "$TEMP_DIR/$PACKAGE_NAME/ecosystem.config.js" << EOF
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
    restart_delay: 4000
  }]
};
EOF

# Create manual setup instructions
print_status "Creating setup instructions..."
cat > "$TEMP_DIR/$PACKAGE_NAME/MANUAL_SETUP.md" << EOF
# Manual Deployment Instructions for Say Goodbye POA

## Prerequisites
Your EC2 instance should have:
- Node.js 18+ installed
- MongoDB installed and running
- Nginx installed
- PM2 installed globally

## Step 1: Upload Files
Upload this entire package to your EC2 instance at: \`$DEPLOY_PATH\`

\`\`\`bash
# Example using scp (if SSH works):
scp -i $SSH_KEY -r $PACKAGE_NAME ec2-user@$SERVER_HOST:~/
ssh -i $SSH_KEY ec2-user@$SERVER_HOST "sudo mv ~/$PACKAGE_NAME $DEPLOY_PATH"
\`\`\`

## Step 2: Install Dependencies
\`\`\`bash
cd $DEPLOY_PATH/backend
npm install --production
\`\`\`

## Step 3: Configure Nginx
\`\`\`bash
sudo cp $DEPLOY_PATH/config/nginx.conf /etc/nginx/sites-available/saygoodbye
sudo ln -sf /etc/nginx/sites-available/saygoodbye /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
\`\`\`

## Step 4: Start the Application
\`\`\`bash
cd $DEPLOY_PATH
pm2 start ecosystem.config.js
pm2 save
pm2 startup
\`\`\`

## Step 5: Verify Deployment
- Frontend: http://$SERVER_HOST
- API Health: http://$SERVER_HOST/api/health
- OCR Service: http://$SERVER_HOST/api/scanned-documents/supported-languages

## Troubleshooting
- Check PM2 logs: \`pm2 logs $PM2_APP_NAME\`
- Check nginx logs: \`sudo tail -f /var/log/nginx/error.log\`
- Check application status: \`pm2 status\`
- Restart application: \`pm2 restart $PM2_APP_NAME\`

## File Structure
\`\`\`
$DEPLOY_PATH/
├── backend/                 # Node.js backend
├── frontend/build/          # React frontend (built)
├── config/nginx.conf        # Nginx configuration
├── ecosystem.config.js      # PM2 configuration
├── .env.production         # Environment variables
└── MANUAL_SETUP.md         # This file
\`\`\`
EOF

# Create automated setup script
print_status "Creating automated setup script..."
cat > "$TEMP_DIR/$PACKAGE_NAME/setup.sh" << EOF
#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "\${GREEN}[INFO]\${NC} \$1"
}

print_status "🚀 Setting up Say Goodbye POA application..."

# Update system packages
print_status "Updating system packages..."
sudo yum update -y

# Install Node.js 18
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

# Install MongoDB
if ! command -v mongod &> /dev/null; then
    print_status "Installing MongoDB..."
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

# Install nginx
if ! command -v nginx &> /dev/null; then
    print_status "Installing nginx..."
    sudo amazon-linux-extras install -y nginx1
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
fi

# Start services
print_status "Starting services..."
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl start nginx
sudo systemctl enable nginx

# Create directories
print_status "Creating application directories..."
mkdir -p $BACKUP_PATH $LOG_PATH

# Install backend dependencies
print_status "Installing backend dependencies..."
cd $DEPLOY_PATH/backend
npm install --production

# Configure nginx
print_status "Configuring nginx..."
sudo cp $DEPLOY_PATH/config/nginx.conf /etc/nginx/conf.d/saygoodbye.conf
sudo nginx -t
sudo systemctl reload nginx

# Stop existing PM2 processes
pm2 stop $PM2_APP_NAME 2>/dev/null || true
pm2 delete $PM2_APP_NAME 2>/dev/null || true

# Start application
print_status "Starting application..."
cd $DEPLOY_PATH
pm2 start ecosystem.config.js
pm2 save
pm2 startup

print_status "✅ Deployment completed successfully!"
print_status "🌐 Application available at: http://$SERVER_HOST"

# Show status
pm2 status
EOF

chmod +x "$TEMP_DIR/$PACKAGE_NAME/setup.sh"

# Create the final package
print_status "Creating deployment archive..."
cd "$TEMP_DIR"
tar -czf "$PACKAGE_NAME.tar.gz" "$PACKAGE_NAME"
mv "$PACKAGE_NAME.tar.gz" "$PWD/"

# Clean up
rm -rf "$TEMP_DIR"

print_header "✅ Manual Deployment Package Created!"
echo ""
echo "📦 Package: $PWD/$PACKAGE_NAME.tar.gz"
echo "📋 Instructions: Extract and follow MANUAL_SETUP.md"
echo ""
echo "🚀 Quick Deploy (if you can get SSH working):"
echo "   1. scp -i $SSH_KEY $PACKAGE_NAME.tar.gz ec2-user@$SERVER_HOST:~/"
echo "   2. ssh -i $SSH_KEY ec2-user@$SERVER_HOST"
echo "   3. tar -xzf $PACKAGE_NAME.tar.gz"
echo "   4. sudo mv $PACKAGE_NAME $DEPLOY_PATH"
echo "   5. cd $DEPLOY_PATH && chmod +x setup.sh && sudo ./setup.sh"
echo ""
echo "🌐 Application will be available at: http://$SERVER_HOST"
