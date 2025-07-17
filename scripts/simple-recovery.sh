#!/bin/bash

# Simple Recovery - Deploy Basic App Without OCR
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

print_header "Simple Recovery - Basic App Without OCR"

# Create simple backend without OCR dependencies
SIMPLE_PACKAGE="saygoodbye_simple_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$SIMPLE_PACKAGE/backend/src"

# Copy backend files but modify to remove OCR
cp -r backend/src/* "$SIMPLE_PACKAGE/backend/src/"

# Create simple package.json without OCR dependencies
cat > "$SIMPLE_PACKAGE/backend/package.json" << 'EOF'
{
  "name": "saygoodbye-backend",
  "version": "1.0.0",
  "description": "Say Goodbye POA Backend API",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.10.0",
    "express-validator": "^7.0.1",
    "multer": "^1.4.5",
    "dotenv": "^16.3.1"
  }
}
EOF

# Create simplified server without OCR routes
cat > "$SIMPLE_PACKAGE/backend/src/server.js" << 'EOF'
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/saygoodbye_production', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Basic routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Say Goodbye POA API is running'
  });
});

// Import routes (remove OCR routes)
try {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/poa', require('./routes/poa'));
  app.use('/api/documents', require('./routes/documents'));
} catch (err) {
  console.log('Some routes not available:', err.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
EOF

# Copy frontend build
mkdir -p "$SIMPLE_PACKAGE/frontend"
cp -r frontend/build "$SIMPLE_PACKAGE/frontend/"

# Create production environment
cat > "$SIMPLE_PACKAGE/.env.production" << EOF
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
mkdir -p "$SIMPLE_PACKAGE/config"
cat > "$SIMPLE_PACKAGE/config/nginx.conf" << EOF
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
cat > "$SIMPLE_PACKAGE/ecosystem.config.js" << EOF
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

# Create simple setup script
cat > "$SIMPLE_PACKAGE/simple_setup.sh" << 'EOF'
#!/bin/bash

set -e

echo "=== Simple Recovery Setup ==="

# Set paths
DEPLOY_PATH="/home/ec2-user/saygoodbye"
LOG_PATH="/home/ec2-user/logs"

# Stop existing services
pm2 kill || true
sudo systemctl stop nginx || true

# Create directories
mkdir -p $LOG_PATH

# Clean and deploy
sudo rm -rf $DEPLOY_PATH
sudo mkdir -p $DEPLOY_PATH/backend
sudo mkdir -p $DEPLOY_PATH/frontend
sudo mkdir -p $DEPLOY_PATH/config

# Copy files
sudo cp -r backend/* $DEPLOY_PATH/backend/
sudo cp -r frontend/build $DEPLOY_PATH/frontend/
sudo cp config/nginx.conf $DEPLOY_PATH/config/
sudo cp .env.production $DEPLOY_PATH/
sudo cp ecosystem.config.js $DEPLOY_PATH/
sudo chown -R ec2-user:ec2-user $DEPLOY_PATH

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install dependencies
cd $DEPLOY_PATH/backend
npm install --omit=dev

# Configure nginx
sudo cp $DEPLOY_PATH/config/nginx.conf /etc/nginx/conf.d/saygoodbye.conf
sudo rm -f /etc/nginx/conf.d/default.conf
sudo systemctl start nginx
sudo systemctl enable nginx

# Start application
cd $DEPLOY_PATH
pm2 start ecosystem.config.js
pm2 save

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
    pm2 logs --lines 10 --nostream
    exit 1
fi

if sudo systemctl is-active nginx >/dev/null; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx failed"
    exit 1
fi

echo "=== Simple Recovery Completed Successfully ==="
EOF

chmod +x "$SIMPLE_PACKAGE/simple_setup.sh"

# Create archive
tar -czf "${SIMPLE_PACKAGE}.tar.gz" "$SIMPLE_PACKAGE"
rm -rf "$SIMPLE_PACKAGE"

print_status "Uploading simple package..."

# Upload package
scp -i "$SSH_KEY" "${SIMPLE_PACKAGE}.tar.gz" ec2-user@$SERVER_HOST:/tmp/

print_status "Executing simple recovery..."

# Execute recovery
ssh -i "$SSH_KEY" ec2-user@$SERVER_HOST << SIMPLE_RECOVERY
set -e

cd /tmp

echo "=== Starting Simple Recovery ==="

# Extract and run
tar -xzf ${SIMPLE_PACKAGE}.tar.gz
cd ${SIMPLE_PACKAGE}

chmod +x simple_setup.sh
sudo ./simple_setup.sh

# Cleanup
cd /tmp
rm -rf ${SIMPLE_PACKAGE}*

echo "=== Simple Recovery Completed ==="
SIMPLE_RECOVERY

print_status "Testing deployment..."
sleep 15

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
        print_header "🎉 Simple Recovery Completed Successfully!"
        echo "✅ Frontend: http://$SERVER_HOST"
        echo "✅ API: http://$SERVER_HOST/api"
        echo "✅ Login functionality restored (without OCR features temporarily)"
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
rm -f "${SIMPLE_PACKAGE}.tar.gz"
