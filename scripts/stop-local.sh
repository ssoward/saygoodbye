#!/bin/bash

# ==================================================
# Say Goodbye - Stop Local Services
# ==================================================
# This script stops all local development services
# ==================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"

print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
}

stop_services() {
    print_status "Stopping Say Goodbye local services..."
    
    # Stop services using PID files
    if [ -f "$LOG_DIR/backend.pid" ]; then
        local backend_pid=$(cat "$LOG_DIR/backend.pid")
        if kill -0 $backend_pid 2>/dev/null; then
            print_status "Stopping backend service (PID: $backend_pid)..."
            kill $backend_pid 2>/dev/null || true
            sleep 2
            # Force kill if still running
            if kill -0 $backend_pid 2>/dev/null; then
                kill -9 $backend_pid 2>/dev/null || true
            fi
            print_success "Backend service stopped"
        else
            print_warning "Backend service was not running"
        fi
        rm -f "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        local frontend_pid=$(cat "$LOG_DIR/frontend.pid")
        if kill -0 $frontend_pid 2>/dev/null; then
            print_status "Stopping frontend service (PID: $frontend_pid)..."
            kill $frontend_pid 2>/dev/null || true
            sleep 2
            # Force kill if still running
            if kill -0 $frontend_pid 2>/dev/null; then
                kill -9 $frontend_pid 2>/dev/null || true
            fi
            print_success "Frontend service stopped"
        else
            print_warning "Frontend service was not running"
        fi
        rm -f "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any remaining processes on our ports
    local pids_3000=$(lsof -ti:3000 2>/dev/null || true)
    local pids_3001=$(lsof -ti:3001 2>/dev/null || true)
    
    if [ ! -z "$pids_3000" ]; then
        print_status "Cleaning up remaining processes on port 3000..."
        kill -9 $pids_3000 2>/dev/null || true
    fi
    
    if [ ! -z "$pids_3001" ]; then
        print_status "Cleaning up remaining processes on port 3001..."
        kill -9 $pids_3001 2>/dev/null || true
    fi
    
    print_success "All services stopped successfully"
}

echo ""
echo "=================================================="
echo -e "${BLUE}🛑 Say Goodbye - Stopping Local Services${NC}"
echo "=================================================="
echo ""

stop_services

echo ""
echo -e "${GREEN}✓ Local services stopped successfully!${NC}"
echo ""
