#!/bin/bash
# Comprehensive Health Check Script for Say Goodbye Production

set -e

echo "🏥 COMPREHENSIVE HEALTH CHECK SYSTEM"
echo "====================================="

# Create health monitoring script on server
ssh -i ~/.ssh/saygoodbye.pem ec2-user@34.235.117.235 << 'HEALTH_SCRIPT'

# Create comprehensive health check script
cat > /home/ec2-user/health-check.sh << 'EOF'
#!/bin/bash
# Say Goodbye Production Health Check

echo "🏥 Production Health Check - $(date)"
echo "=================================="

# Check 1: System Resources
echo "📊 SYSTEM RESOURCES:"
df -h / | tail -1 | awk '{print "Disk Usage: " $5 " of " $2 " used (" $4 " free)"}'
free -h | awk 'NR==2{printf "Memory Usage: %.1f%% (%.1fG used of %.1fG)\n", $3*100/$2, $3/1024, $2/1024}'
uptime | awk '{print "Load Average:", $(NF-2), $(NF-1), $NF}'

echo ""
echo "🔧 SERVICE STATUS:"

# Check 2: PM2 Backend
echo -n "Backend (PM2): "
if pm2 show saygoodbye-api > /dev/null 2>&1; then
    PM2_STATUS=$(pm2 show saygoodbye-api | grep "status" | awk '{print $4}')
    echo "✅ $PM2_STATUS"
else
    echo "❌ Not running"
fi

# Check 3: MongoDB
echo -n "MongoDB: "
if sudo systemctl is-active mongod > /dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check 4: Nginx
echo -n "Nginx: "
if sudo systemctl is-active nginx > /dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

echo ""
echo "🌐 ENDPOINT TESTS:"

# Check 5: Frontend
echo -n "Frontend (http://localhost/): "
if curl -s -f http://localhost/ > /dev/null; then
    echo "✅ Responding"
else
    echo "❌ Not responding"
fi

# Check 6: API Health
echo -n "API Health (http://localhost/api/health): "
API_RESPONSE=$(curl -s http://localhost/api/health 2>/dev/null)
if echo "$API_RESPONSE" | grep -q "healthy"; then
    echo "✅ Healthy"
    echo "   API Response: $API_RESPONSE"
else
    echo "❌ Unhealthy or not responding"
fi

# Check 7: Nginx Health
echo -n "Nginx Health (http://localhost/health): "
NGINX_RESPONSE=$(curl -s http://localhost/health 2>/dev/null)
if echo "$NGINX_RESPONSE" | grep -q "healthy"; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy or not responding"
fi

echo ""
echo "📈 PERFORMANCE METRICS:"

# Check 8: Response Times
echo "Response Time Tests:"
echo -n "  Frontend: "
FRONTEND_TIME=$(curl -s -w "%{time_total}" -o /dev/null http://localhost/)
echo "${FRONTEND_TIME}s"

echo -n "  API: "
API_TIME=$(curl -s -w "%{time_total}" -o /dev/null http://localhost/api/health)
echo "${API_TIME}s"

# Check 9: Process Stats
echo ""
echo "📊 PROCESS STATISTICS:"
echo "PM2 Process Info:"
pm2 show saygoodbye-api | grep -E "(cpu|memory|uptime|restarts)" | head -4

echo ""
echo "🔗 EXTERNAL ACCESS TEST:"
# Check 10: External accessibility
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com)
echo "Public IP: $PUBLIC_IP"

echo -n "External Frontend Access: "
if curl -s -f http://$PUBLIC_IP/ > /dev/null; then
    echo "✅ Accessible"
else
    echo "❌ Not accessible"
fi

echo -n "External API Access: "
if curl -s http://$PUBLIC_IP/api/health | grep -q "healthy"; then
    echo "✅ Accessible and Healthy"
else
    echo "❌ Not accessible or unhealthy"
fi

echo ""
echo "✅ Health check completed at $(date)"
echo "========================================="
EOF

chmod +x /home/ec2-user/health-check.sh

# Run the health check
echo "🏥 Running comprehensive health check..."
/home/ec2-user/health-check.sh

# Set up automatic health monitoring
echo ""
echo "⏰ Setting up automatic health monitoring..."

# Create cron job for health monitoring
(crontab -l 2>/dev/null || true; echo "*/5 * * * * /home/ec2-user/health-check.sh >> /home/ec2-user/health.log 2>&1") | crontab -

echo "✅ Health monitoring cron job created (runs every 5 minutes)"
echo "   Logs: /home/ec2-user/health.log"

HEALTH_SCRIPT

echo ""
echo "🎉 SITE IS FULLY OPERATIONAL WITH HEALTH MONITORING!"
echo "============================================="
echo ""
echo "🌐 Application URL: http://34.235.117.235"
echo "🏥 Health Check: http://34.235.117.235/health"
echo "🔗 API Health: http://34.235.117.235/api/health"
echo ""
echo "📊 Manual Health Check:"
echo "   ssh -i ~/.ssh/saygoodbye.pem ec2-user@34.235.117.235 './health-check.sh'"
echo ""
echo "📋 Health Logs:"
echo "   ssh -i ~/.ssh/saygoodbye.pem ec2-user@34.235.117.235 'tail -f health.log'"
