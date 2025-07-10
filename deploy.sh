#!/bin/bash

# Production Deployment Script for Say Goodbye POA App
# Usage: ./deploy.sh [frontend|backend|all]

set -e  # Exit on any error

# Load configuration
source "$(dirname "$0")/deploy.config.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Check if SSH key exists
check_ssh_key() {
    if [ ! -f "$SSH_KEY" ]; then
        error "SSH key not found at $SSH_KEY"
    fi
    
    # Set correct permissions
    chmod 600 "$SSH_KEY"
    log "SSH key permissions set to 600"
}

# Test SSH connection
test_connection() {
    log "Testing SSH connection to $SERVER_HOST..."
    if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" "echo 'Connection successful'" > /dev/null 2>&1; then
        success "SSH connection successful"
    else
        error "Cannot connect to server. Please check your SSH key and server details."
    fi
}

# Create backup of current deployment
create_backup() {
    log "Creating backup of current deployment..."
    
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        mkdir -p $BACKUP_PATH
        if [ -d $DEPLOY_PATH ]; then
            sudo tar -czf $BACKUP_PATH/saygoodbye-backup-\$(date +%Y%m%d-%H%M%S).tar.gz -C \$(dirname $DEPLOY_PATH) \$(basename $DEPLOY_PATH)
            echo 'Backup created successfully'
        else
            echo 'No existing deployment to backup'
        fi
    "
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        # Update system
        sudo yum update -y
        
        # Install Node.js 18
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
        
        # Install PM2 globally
        sudo npm install -g pm2
        
        # Install MongoDB
        echo '[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc' | sudo tee /etc/yum.repos.d/mongodb-org-6.0.repo
        
        sudo yum install -y mongodb-org
        sudo systemctl start mongod
        sudo systemctl enable mongod
        
        # Install Redis
        sudo amazon-linux-extras install redis4.0 -y
        sudo systemctl start redis
        sudo systemctl enable redis
        
        # Install Nginx
        sudo yum install -y nginx
        sudo systemctl start nginx
        sudo systemctl enable nginx
        
        # Install Git
        sudo yum install -y git
    "
    
    success "System dependencies installed"
}

# Deploy backend
deploy_backend() {
    log "Deploying backend..."
    
    # Create deployment directory and clone repo
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        mkdir -p $DEPLOY_PATH
        cd $DEPLOY_PATH
        
        # Clone or update repository
        if [ -d .git ]; then
            git pull origin main
        else
            git clone https://github.com/ssoward/saygoodbye.git .
        fi
        
        # Install backend dependencies
        cd backend
        npm install --production
        
        # Create production environment file
        cat > .env << EOF
NODE_ENV=production
PORT=3001
JWT_SECRET=\${JWT_SECRET:-your-super-secret-jwt-key-change-this}
MONGODB_URI=mongodb://localhost:27017/saygoodbye_prod
REDIS_URL=redis://localhost:6379
GOOGLE_CLOUD_PROJECT_ID=\${GOOGLE_CLOUD_PROJECT_ID}
GOOGLE_CLOUD_KEY_FILE=\${GOOGLE_CLOUD_KEY_FILE}
STRIPE_SECRET_KEY=\${STRIPE_SECRET_KEY}
CORS_ORIGIN=http://$SERVER_HOST,https://$SERVER_HOST
EOF
        
        # Stop existing PM2 process
        pm2 stop saygoodbye-api || true
        pm2 delete saygoodbye-api || true
        
        # Start with PM2
        pm2 start src/server.js --name saygoodbye-api --instances max --exec-mode cluster
        pm2 save
        pm2 startup
    "
    
    success "Backend deployed successfully"
}

# Deploy frontend
deploy_frontend() {
    log "Deploying frontend..."
    
    # Build frontend locally and transfer
    log "Building frontend locally..."
    cd frontend
    
    # Create production environment file
    cat > .env.production << EOF
REACT_APP_API_URL=http://$SERVER_HOST:3001/api
REACT_APP_ENVIRONMENT=production
EOF
    
    # Build the frontend
    npm run build
    
    # Transfer build files to server
    log "Transferring build files to server..."
    scp -i "$SSH_KEY" -r build/* "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/frontend-build/"
    
    # Configure Nginx
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        sudo mkdir -p /var/www/saygoodbye
        sudo cp -r $DEPLOY_PATH/frontend-build/* /var/www/saygoodbye/
        
        # Create Nginx configuration
        sudo tee /etc/nginx/conf.d/saygoodbye.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name $SERVER_HOST;
    root /var/www/saygoodbye;
    index index.html;
    
    # Frontend routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
        
        # Test and reload Nginx
        sudo nginx -t
        sudo systemctl reload nginx
    "
    
    success "Frontend deployed successfully"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    log "Setting up SSL with Let's Encrypt..."
    
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        # Install certbot
        sudo yum install -y certbot python3-certbot-nginx
        
        # Get SSL certificate (you'll need a domain name for this)
        # sudo certbot --nginx -d yourdomain.com
        
        echo 'SSL setup requires a domain name. Please run:'
        echo 'sudo certbot --nginx -d yourdomain.com'
        echo 'after pointing your domain to this server.'
    "
}

# Check deployment health
health_check() {
    log "Performing health checks..."
    
    # Check if backend is running
    if curl -f "http://$SERVER_HOST:3001/api/health" > /dev/null 2>&1; then
        success "Backend health check passed"
    else
        warning "Backend health check failed"
    fi
    
    # Check if frontend is accessible
    if curl -f "http://$SERVER_HOST" > /dev/null 2>&1; then
        success "Frontend health check passed"
    else
        warning "Frontend health check failed"
    fi
    
    # Check PM2 status
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "pm2 status"
}

# Main deployment function
main() {
    local deploy_target="${1:-all}"
    
    log "Starting deployment to production server: $SERVER_HOST"
    log "Deploy target: $deploy_target"
    
    check_ssh_key
    test_connection
    create_backup
    
    case $deploy_target in
        "backend")
            deploy_backend
            ;;
        "frontend")
            deploy_frontend
            ;;
        "all")
            install_dependencies
            deploy_backend
            deploy_frontend
            setup_ssl
            ;;
        *)
            error "Invalid deploy target. Use: backend, frontend, or all"
            ;;
    esac
    
    health_check
    
    success "Deployment completed successfully!"
    log "Access your application at: http://$SERVER_HOST"
    log "API endpoint: http://$SERVER_HOST:3001/api"
}

# Run main function with all arguments
main "$@"
