#!/bin/bash

# Simple Health Check for Say Goodbye POA App
# Quick validation of all system components

# Load configuration
if [ -f "deploy.config.sh" ]; then
    source deploy.config.sh
else
    echo "Warning: deploy.config.sh not found, using defaults"
    SERVER_HOST="${SERVER_HOST:-34.235.117.235}"
    SERVER_USER="${SERVER_USER:-ec2-user}"
    SSH_KEY="${SSH_KEY:-~/.ssh/saygoodbye.pem}"
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Say Goodbye Health Check - $(date)${NC}"
echo "============================================"

# Frontend Check
echo -n "🌐 Frontend: "
if curl -f -s "http://$SERVER_HOST" | grep -q "Say Goodbye\|root"; then
    echo -e "${GREEN}✅ OK${NC}"
    FRONTEND_OK=1
else
    echo -e "${RED}❌ FAILED${NC}"
    FRONTEND_OK=0
fi

# Backend Check
echo -n "🔧 Backend API: "
if curl -f -s "http://$SERVER_HOST/api/health" | grep -q "healthy\|ok"; then
    echo -e "${GREEN}✅ OK${NC}"
    BACKEND_OK=1
else
    echo -e "${RED}❌ FAILED${NC}"
    BACKEND_OK=0
fi

# Authentication Check
echo -n "🔐 Authentication: "
auth_response=$(curl -s -X POST "http://$SERVER_HOST/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@demo.com","password":"demopass123"}')

if echo "$auth_response" | grep -q "token"; then
    echo -e "${GREEN}✅ OK${NC}"
    AUTH_OK=1
else
    echo -e "${RED}❌ FAILED${NC}"
    AUTH_OK=0
fi

# Database Check (via SSH)
echo -n "🗄️ Database: "
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "systemctl is-active --quiet mongod" 2>/dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
    DB_OK=1
else
    echo -e "${RED}❌ FAILED${NC}"
    DB_OK=0
fi

# Infrastructure Check
echo -n "🏗️ Infrastructure: "
infra_check=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
    pm2_status=\$(pm2 jlist 2>/dev/null | jq -r '.[0].pm2_env.status' 2>/dev/null || echo 'unknown')
    nginx_status=\$(systemctl is-active nginx 2>/dev/null || echo 'inactive')
    if [ \"\$pm2_status\" = \"online\" ] && [ \"\$nginx_status\" = \"active\" ]; then
        echo 'ok'
    else
        echo \"failed: PM2=\$pm2_status, Nginx=\$nginx_status\"
    fi
" 2>/dev/null)

if [ "$infra_check" = "ok" ]; then
    echo -e "${GREEN}✅ OK${NC}"
    INFRA_OK=1
else
    echo -e "${RED}❌ FAILED${NC} ($infra_check)"
    INFRA_OK=0
fi

# Calculate overall health
TOTAL_CHECKS=5
PASSED_CHECKS=$((FRONTEND_OK + BACKEND_OK + AUTH_OK + DB_OK + INFRA_OK))
HEALTH_PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo "============================================"
echo -n "📊 Overall Health: $PASSED_CHECKS/$TOTAL_CHECKS ($HEALTH_PERCENTAGE%) "

if [ $HEALTH_PERCENTAGE -ge 80 ]; then
    echo -e "${GREEN}🎉 HEALTHY${NC}"
elif [ $HEALTH_PERCENTAGE -ge 60 ]; then
    echo -e "${YELLOW}⚠️ WARNING${NC}"
else
    echo -e "${RED}🚨 CRITICAL${NC}"
fi

echo -e "\nProduction URL: http://$SERVER_HOST"
echo -e "Demo Users: user@demo.com, pro@demo.com, admin@demo.com (password: demopass123)"
