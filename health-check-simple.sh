#!/bin/bash

# Simple Health Monitor for Say Goodbye POA App
# Usage: ./health-check-simple.sh

# Load configuration
source "$(dirname "$0")/deploy.config.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

HEALTH_SCORE=0
MAX_SCORE=10

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

echo "🏥 Health Check for Say Goodbye POA App"
echo "Server: $SERVER_HOST"
echo "================================================"

# Check Frontend
log "Checking frontend..."
if curl -f -s "http://$SERVER_HOST/" > /dev/null; then
    HEALTH_SCORE=$((HEALTH_SCORE + 2))
    success "Frontend is accessible"
else
    error "Frontend is not accessible"
fi

# Check Backend API
log "Checking backend API..."
API_HEALTH=$(curl -s "http://$SERVER_HOST/api/health" --max-time 10)
if echo "$API_HEALTH" | grep -q "healthy"; then
    HEALTH_SCORE=$((HEALTH_SCORE + 2))
    success "Backend API is responding"
    echo "  Response: $API_HEALTH"
else
    error "Backend API is not responding"
fi

# Check PM2
log "Checking PM2 processes..."
PM2_STATUS=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "pm2 status 2>/dev/null || echo 'PM2 not available'")
if echo "$PM2_STATUS" | grep -q "online"; then
    HEALTH_SCORE=$((HEALTH_SCORE + 2))
    success "PM2 processes are running"
else
    error "PM2 processes are not running properly"
fi

# Check MongoDB
log "Checking MongoDB..."
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "systemctl is-active --quiet mongod"; then
    HEALTH_SCORE=$((HEALTH_SCORE + 2))
    success "MongoDB is running"
else
    error "MongoDB is not running"
fi

# Check Nginx
log "Checking nginx..."
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "systemctl is-active --quiet nginx"; then
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
    success "Nginx is running"
else
    error "Nginx is not running"
fi

# Check Disk Space
log "Checking disk space..."
DISK_INFO=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "df -h / | tail -1")
DISK_USAGE=$(echo "$DISK_INFO" | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
    success "Disk usage is healthy ($DISK_USAGE%)"
else
    warning "Disk usage is high ($DISK_USAGE%)"
fi

# Summary
echo "================================================"
HEALTH_PERCENTAGE=$(( HEALTH_SCORE * 100 / MAX_SCORE ))
echo "Overall Health Score: $HEALTH_SCORE/$MAX_SCORE ($HEALTH_PERCENTAGE%)"

if [ "$HEALTH_PERCENTAGE" -ge 80 ]; then
    echo -e "${GREEN}🎉 System Status: HEALTHY${NC}"
    exit 0
elif [ "$HEALTH_PERCENTAGE" -ge 60 ]; then
    echo -e "${YELLOW}⚠️ System Status: WARNING${NC}"
    exit 1
else
    echo -e "${RED}🚨 System Status: CRITICAL${NC}"
    exit 2
fi
