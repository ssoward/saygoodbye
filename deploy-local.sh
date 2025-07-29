#!/bin/bash

# ==================================================
# Say Goodbye - Local Deployment Script
# ==================================================
# This script handles local development deployment:
# - Kills existing Node/npm processes
# - Installs dependencies for both frontend and backend
# - Starts both services in development mode
# - Provides health checks and status monitoring
# ==================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directories
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Log files
LOG_DIR="$PROJECT_ROOT/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
DEPLOY_LOG="$LOG_DIR/deploy.log"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

# Function to create log directory
setup_logging() {
    mkdir -p "$LOG_DIR"
    echo "$(date): Starting local deployment" > "$DEPLOY_LOG"
}

# Function to kill existing Node.js processes
kill_node_processes() {
    print_status "Checking for existing Node.js and npm processes..."
    
    # Find and kill Node.js processes on ports 3000 and 3001
    local pids_3000=$(lsof -ti:3000 2>/dev/null || true)
    local pids_3001=$(lsof -ti:3001 2>/dev/null || true)
    
    if [ ! -z "$pids_3000" ]; then
        print_warning "Killing processes on port 3000: $pids_3000"
        kill -9 $pids_3000 2>/dev/null || true
        sleep 2
    fi
    
    if [ ! -z "$pids_3001" ]; then
        print_warning "Killing processes on port 3001: $pids_3001"
        kill -9 $pids_3001 2>/dev/null || true
        sleep 2
    fi
    
    # Kill any remaining node processes related to our project
    local node_pids=$(pgrep -f "node.*saygoodbye" 2>/dev/null || true)
    if [ ! -z "$node_pids" ]; then
        print_warning "Killing remaining Node.js processes: $node_pids"
        kill -9 $node_pids 2>/dev/null || true
        sleep 2
    fi
    
    # Kill npm processes that might be hanging
    local npm_pids=$(pgrep -f "npm.*start\|npm.*dev" 2>/dev/null || true)
    if [ ! -z "$npm_pids" ]; then
        print_warning "Killing npm processes: $npm_pids"
        kill -9 $npm_pids 2>/dev/null || true
        sleep 2
    fi
    
    print_success "Cleaned up existing processes"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_error "Node.js version 18+ required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    # Check if directories exist
    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        print_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi
    
    print_success "Prerequisites check completed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    if [ -f package-lock.json ]; then
        npm ci --silent >> "$DEPLOY_LOG" 2>&1
    else
        npm install --silent >> "$DEPLOY_LOG" 2>&1
    fi
    print_success "Backend dependencies installed"
    
    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    if [ -f package-lock.json ]; then
        npm ci --silent >> "$DEPLOY_LOG" 2>&1
    else
        npm install --silent >> "$DEPLOY_LOG" 2>&1
    fi
    print_success "Frontend dependencies installed"
    
    cd "$PROJECT_ROOT"
}

# Function to check environment files
check_environment() {
    print_status "Checking environment configuration..."
    
    local env_issues=false
    
    # Check backend .env
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        print_warning "Backend .env file not found. Creating template..."
        cat > "$BACKEND_DIR/.env" << 'EOF'
# Server Configuration
NODE_ENV=development
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/saygoodbye
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_EXPIRE=7d

# Stripe (Development)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# CORS
FRONTEND_URL=http://localhost:3000

# File Upload
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
        env_issues=true
    fi
    
    # Check frontend .env
    if [ ! -f "$FRONTEND_DIR/.env" ]; then
        print_warning "Frontend .env file not found. Creating template..."
        cat > "$FRONTEND_DIR/.env" << 'EOF'
REACT_APP_API_URL=http://localhost:3001
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
EOF
        env_issues=true
    fi
    
    if [ "$env_issues" = true ]; then
        print_warning "Environment files created with default values."
        print_warning "Please update them with your actual configuration before running the application."
    else
        print_success "Environment configuration checked"
    fi
}

# Function to start backend service
start_backend() {
    print_status "Starting backend service..."
    cd "$BACKEND_DIR"
    
    # Start backend in background
    nohup npm run dev > "$BACKEND_LOG" 2>&1 &
    local backend_pid=$!
    echo $backend_pid > "$LOG_DIR/backend.pid"
    
    print_status "Backend starting with PID: $backend_pid"
    
    # Wait for backend to be ready
    local timeout=30
    local count=0
    while [ $count -lt $timeout ]; do
        if curl -s http://localhost:3001/health > /dev/null 2>&1; then
            print_success "Backend service is ready (http://localhost:3001)"
            return 0
        fi
        sleep 2
        count=$((count + 2))
        print_status "Waiting for backend... ($count/${timeout}s)"
    done
    
    print_error "Backend failed to start within ${timeout} seconds"
    print_error "Check logs: $BACKEND_LOG"
    return 1
}

# Function to start frontend service
start_frontend() {
    print_status "Starting frontend service..."
    cd "$FRONTEND_DIR"
    
    # Start frontend in background
    nohup npm start > "$FRONTEND_LOG" 2>&1 &
    local frontend_pid=$!
    echo $frontend_pid > "$LOG_DIR/frontend.pid"
    
    print_status "Frontend starting with PID: $frontend_pid"
    
    # Wait for frontend to be ready
    local timeout=60  # Frontend takes longer to build
    local count=0
    while [ $count -lt $timeout ]; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            print_success "Frontend service is ready (http://localhost:3000)"
            return 0
        fi
        sleep 3
        count=$((count + 3))
        print_status "Waiting for frontend... ($count/${timeout}s)"
    done
    
    print_error "Frontend failed to start within ${timeout} seconds"
    print_error "Check logs: $FRONTEND_LOG"
    return 1
}

# Function to run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Backend health
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Frontend health
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
        return 1
    fi
    
    return 0
}

# Function to display deployment summary
show_summary() {
    echo ""
    echo "=================================================="
    echo -e "${GREEN}🚀 Local Deployment Complete!${NC}"
    echo "=================================================="
    echo ""
    echo -e "${BLUE}📱 Application URLs:${NC}"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:3001"
    echo "   API Docs: http://localhost:3001/"
    echo ""
    echo -e "${BLUE}📋 Management Commands:${NC}"
    echo "   Stop services:  ./scripts/stop-local.sh"
    echo "   View logs:      tail -f logs/backend.log"
    echo "                   tail -f logs/frontend.log"
    echo "   Check status:   ./scripts/status-local.sh"
    echo ""
    echo -e "${BLUE}📁 Log Files:${NC}"
    echo "   Backend:    $BACKEND_LOG"
    echo "   Frontend:   $FRONTEND_LOG"
    echo "   Deployment: $DEPLOY_LOG"
    echo ""
    echo -e "${YELLOW}⚠️  Note: Services are running in the background.${NC}"
    echo -e "${YELLOW}   Use 'jobs' to see running processes or check PID files in logs/${NC}"
    echo ""
}

# Function to handle cleanup on exit
cleanup() {
    if [ $? -ne 0 ]; then
        print_error "Deployment failed. Cleaning up..."
        
        # Kill any processes we started
        if [ -f "$LOG_DIR/backend.pid" ]; then
            local backend_pid=$(cat "$LOG_DIR/backend.pid")
            kill $backend_pid 2>/dev/null || true
            rm -f "$LOG_DIR/backend.pid"
        fi
        
        if [ -f "$LOG_DIR/frontend.pid" ]; then
            local frontend_pid=$(cat "$LOG_DIR/frontend.pid")
            kill $frontend_pid 2>/dev/null || true
            rm -f "$LOG_DIR/frontend.pid"
        fi
        
        print_error "Check logs for details:"
        print_error "  Backend:    $BACKEND_LOG"
        print_error "  Frontend:   $FRONTEND_LOG"
        print_error "  Deployment: $DEPLOY_LOG"
    fi
}

# Main execution
main() {
    echo ""
    echo "=================================================="
    echo -e "${BLUE}🚀 Say Goodbye - Local Deployment${NC}"
    echo "=================================================="
    echo ""
    
    # Set up error handling
    trap cleanup EXIT
    
    # Execute deployment steps
    setup_logging
    kill_node_processes
    check_prerequisites
    check_environment
    install_dependencies
    
    # Start services in parallel
    start_backend &
    local backend_start_pid=$!
    
    # Wait a bit before starting frontend to ensure backend starts first
    sleep 5
    start_frontend &
    local frontend_start_pid=$!
    
    # Wait for both to complete
    wait $backend_start_pid
    local backend_result=$?
    
    wait $frontend_start_pid
    local frontend_result=$?
    
    # Check if both started successfully
    if [ $backend_result -eq 0 ] && [ $frontend_result -eq 0 ]; then
        run_health_checks
        if [ $? -eq 0 ]; then
            show_summary
            
            # Remove the error trap since we succeeded
            trap - EXIT
            
            print_success "Local deployment completed successfully!"
            echo ""
            echo -e "${GREEN}Ready to go! 🎉${NC}"
            echo ""
            exit 0
        else
            print_error "Health checks failed"
            exit 1
        fi
    else
        print_error "Failed to start services"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --force, -f    Force restart (kill all Node processes)"
        echo "  --clean, -c    Clean install (remove node_modules)"
        echo ""
        echo "This script will:"
        echo "  1. Kill existing Node.js/npm processes"
        echo "  2. Install dependencies for frontend and backend"
        echo "  3. Start both services in development mode"
        echo "  4. Run health checks"
        echo ""
        exit 0
        ;;
    --force|-f)
        print_warning "Force mode: killing ALL Node.js processes..."
        killall node 2>/dev/null || true
        killall npm 2>/dev/null || true
        sleep 3
        ;;
    --clean|-c)
        print_warning "Clean mode: removing node_modules..."
        rm -rf "$BACKEND_DIR/node_modules" "$FRONTEND_DIR/node_modules"
        rm -f "$BACKEND_DIR/package-lock.json" "$FRONTEND_DIR/package-lock.json"
        ;;
esac

# Run main function
main "$@"
