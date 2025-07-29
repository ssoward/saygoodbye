#!/bin/bash

# ==================================================
# Say Goodbye - Quick Development Setup
# ==================================================
# This script provides a quick way to set up the development environment
# without starting the services (useful for CI/CD or preparation)
# ==================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

echo ""
echo "=================================================="
echo -e "${BLUE}⚙️  Say Goodbye - Development Setup${NC}"
echo "=================================================="
echo ""

# Check prerequisites
print_status "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    print_error "Node.js version 18+ required. Current: $(node --version)"
    exit 1
fi

print_success "Prerequisites check passed"

# Install dependencies
print_status "Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install --silent

print_status "Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm install --silent

print_success "Dependencies installed successfully"

# Create environment files if they don't exist
if [ ! -f "$BACKEND_DIR/.env" ]; then
    print_status "Creating backend .env template..."
    cat > "$BACKEND_DIR/.env" << 'EOF'
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/saygoodbye
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_EXPIRE=7d
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FRONTEND_URL=http://localhost:3000
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=10485760
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    print_success "Backend .env template created"
fi

if [ ! -f "$FRONTEND_DIR/.env" ]; then
    print_status "Creating frontend .env template..."
    cat > "$FRONTEND_DIR/.env" << 'EOF'
REACT_APP_API_URL=http://localhost:3001
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
EOF
    print_success "Frontend .env template created"
fi

echo ""
echo -e "${GREEN}✓ Development environment setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Update .env files with your actual configuration"
echo "  2. Ensure MongoDB and Redis are running"
echo "  3. Run './deploy-local.sh' to start the application"
echo ""
