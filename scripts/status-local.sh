#!/bin/bash

# ==================================================
# Say Goodbye - Local Services Status Check
# ==================================================
# This script checks the status of local development services
# ==================================================

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
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

check_service_status() {
    echo ""
    echo "=================================================="
    echo -e "${BLUE}📊 Say Goodbye - Service Status${NC}"
    echo "=================================================="
    echo ""
    
    # Check backend
    echo -e "${BLUE}Backend Service (Port 3001):${NC}"
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Running and responding"
        local backend_response=$(curl -s http://localhost:3001/health)
        echo "  Health check response: $backend_response"
    else
        print_error "Not responding"
    fi
    
    # Check if backend PID file exists
    if [ -f "$LOG_DIR/backend.pid" ]; then
        local backend_pid=$(cat "$LOG_DIR/backend.pid")
        if kill -0 $backend_pid 2>/dev/null; then
            echo "  Process PID: $backend_pid (running)"
        else
            echo "  Process PID: $backend_pid (not running)"
            rm -f "$LOG_DIR/backend.pid"
        fi
    else
        echo "  No PID file found"
    fi
    
    echo ""
    
    # Check frontend
    echo -e "${BLUE}Frontend Service (Port 3000):${NC}"
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "Running and responding"
    else
        print_error "Not responding"
    fi
    
    # Check if frontend PID file exists
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        local frontend_pid=$(cat "$LOG_DIR/frontend.pid")
        if kill -0 $frontend_pid 2>/dev/null; then
            echo "  Process PID: $frontend_pid (running)"
        else
            echo "  Process PID: $frontend_pid (not running)"
            rm -f "$LOG_DIR/frontend.pid"
        fi
    else
        echo "  No PID file found"
    fi
    
    echo ""
    
    # Check ports
    echo -e "${BLUE}Port Usage:${NC}"
    local port_3000=$(lsof -ti:3000 2>/dev/null || echo "none")
    local port_3001=$(lsof -ti:3001 2>/dev/null || echo "none")
    
    echo "  Port 3000: $port_3000"
    echo "  Port 3001: $port_3001"
    
    echo ""
    
    # Check log files
    echo -e "${BLUE}Log Files:${NC}"
    if [ -f "$LOG_DIR/backend.log" ]; then
        local backend_log_size=$(du -h "$LOG_DIR/backend.log" | cut -f1)
        echo "  Backend log: $backend_log_size"
        echo "    Last 3 lines:"
        tail -n 3 "$LOG_DIR/backend.log" | sed 's/^/    /'
    else
        echo "  Backend log: Not found"
    fi
    
    echo ""
    
    if [ -f "$LOG_DIR/frontend.log" ]; then
        local frontend_log_size=$(du -h "$LOG_DIR/frontend.log" | cut -f1)
        echo "  Frontend log: $frontend_log_size"
        echo "    Last 3 lines:"
        tail -n 3 "$LOG_DIR/frontend.log" | sed 's/^/    /'
    else
        echo "  Frontend log: Not found"
    fi
    
    echo ""
    
    # Overall status
    if curl -s http://localhost:3000 > /dev/null 2>&1 && curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}🎉 All services are running successfully!${NC}"
        echo ""
        echo -e "${BLUE}📱 Application URLs:${NC}"
        echo "   Frontend: http://localhost:3000"
        echo "   Backend:  http://localhost:3001"
        echo "   API Docs: http://localhost:3001/"
    else
        echo -e "${RED}⚠️  Some services are not running properly${NC}"
        echo ""
        echo "To restart services: ./deploy-local.sh"
        echo "To stop services:    ./scripts/stop-local.sh"
    fi
    
    echo ""
}

# Handle arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --watch, -w    Watch mode (refresh every 5 seconds)"
        echo ""
        exit 0
        ;;
    --watch|-w)
        echo "Watching service status (Ctrl+C to exit)..."
        while true; do
            clear
            check_service_status
            sleep 5
        done
        ;;
    *)
        check_service_status
        ;;
esac
