#!/bin/bash

# ==================================================
# Say Goodbye - Project Management Script
# ==================================================
# Unified script for all project management tasks
# ==================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

print_header() {
    echo ""
    echo "=================================================="
    echo -e "${BLUE}🚀 Say Goodbye - Project Management${NC}"
    echo "=================================================="
    echo ""
}

show_help() {
    print_header
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo ""
    echo "  ${BLUE}Development:${NC}"
    echo "    setup         Setup development environment (install deps, create env files)"
    echo "    start         Start all services (full deployment)"
    echo "    stop          Stop all running services"
    echo "    restart       Restart all services"
    echo "    status        Check service status"
    echo "    logs          Show service logs"
    echo ""
    echo "  ${BLUE}Maintenance:${NC}"
    echo "    clean         Clean install (remove node_modules)"
    echo "    update        Update all dependencies"
    echo "    test          Run all tests"
    echo "    build         Build for production"
    echo ""
    echo "  ${BLUE}Monitoring:${NC}"
    echo "    watch         Watch service status (auto-refresh)"
    echo "    health        Check application health"
    echo "    ports         Check port usage"
    echo ""
    echo "Options:"
    echo "    --force, -f   Force operation (where applicable)"
    echo "    --help, -h    Show this help message"
    echo ""
    echo "Examples:"
    echo "    $0 setup              # Setup development environment"
    echo "    $0 start              # Start all services"
    echo "    $0 restart --force    # Force restart all services"
    echo "    $0 logs backend       # Show backend logs"
    echo ""
}

case "${1:-help}" in
    setup)
        echo "Setting up development environment..."
        "$PROJECT_ROOT/scripts/setup-dev.sh"
        ;;
    
    start)
        echo "Starting all services..."
        if [ "${2:-}" = "--force" ] || [ "${2:-}" = "-f" ]; then
            "$PROJECT_ROOT/deploy-local.sh" --force
        else
            "$PROJECT_ROOT/deploy-local.sh"
        fi
        ;;
    
    stop)
        echo "Stopping all services..."
        "$PROJECT_ROOT/scripts/stop-local.sh"
        ;;
    
    restart)
        echo "Restarting all services..."
        "$PROJECT_ROOT/scripts/stop-local.sh"
        sleep 2
        if [ "${2:-}" = "--force" ] || [ "${2:-}" = "-f" ]; then
            "$PROJECT_ROOT/deploy-local.sh" --force
        else
            "$PROJECT_ROOT/deploy-local.sh"
        fi
        ;;
    
    status)
        "$PROJECT_ROOT/scripts/status-local.sh"
        ;;
    
    watch)
        "$PROJECT_ROOT/scripts/status-local.sh" --watch
        ;;
    
    logs)
        case "${2:-}" in
            backend)
                if [ -f "$PROJECT_ROOT/logs/backend.log" ]; then
                    tail -f "$PROJECT_ROOT/logs/backend.log"
                else
                    echo "Backend log file not found"
                fi
                ;;
            frontend)
                if [ -f "$PROJECT_ROOT/logs/frontend.log" ]; then
                    tail -f "$PROJECT_ROOT/logs/frontend.log"
                else
                    echo "Frontend log file not found"
                fi
                ;;
            deploy)
                if [ -f "$PROJECT_ROOT/logs/deploy.log" ]; then
                    tail -f "$PROJECT_ROOT/logs/deploy.log"
                else
                    echo "Deploy log file not found"
                fi
                ;;
            *)
                echo "Available logs: backend, frontend, deploy"
                echo "Usage: $0 logs <backend|frontend|deploy>"
                ;;
        esac
        ;;
    
    clean)
        echo "Cleaning project..."
        "$PROJECT_ROOT/deploy-local.sh" --clean
        ;;
    
    update)
        echo "Updating dependencies..."
        cd "$PROJECT_ROOT/backend" && npm update
        cd "$PROJECT_ROOT/frontend" && npm update
        echo "Dependencies updated"
        ;;
    
    test)
        echo "Running tests..."
        echo "Backend tests:"
        cd "$PROJECT_ROOT/backend" && npm test
        echo ""
        echo "Frontend tests:"
        cd "$PROJECT_ROOT/frontend" && npm test -- --watchAll=false
        ;;
    
    build)
        echo "Building for production..."
        cd "$PROJECT_ROOT/frontend" && npm run build
        echo "Production build completed"
        ;;
    
    health)
        echo "Checking application health..."
        echo ""
        echo "Backend Health:"
        if curl -s http://localhost:3001/health > /dev/null 2>&1; then
            curl -s http://localhost:3001/health | echo "$(cat) ✓"
        else
            echo "Backend not responding ✗"
        fi
        echo ""
        echo "Frontend Health:"
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "Frontend responding ✓"
        else
            echo "Frontend not responding ✗"
        fi
        ;;
    
    ports)
        echo "Checking port usage..."
        echo ""
        echo "Port 3000 (Frontend):"
        lsof -ti:3000 2>/dev/null | head -5 || echo "  No processes found"
        echo ""
        echo "Port 3001 (Backend):"
        lsof -ti:3001 2>/dev/null | head -5 || echo "  No processes found"
        ;;
    
    help|--help|-h)
        show_help
        ;;
    
    *)
        echo "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
