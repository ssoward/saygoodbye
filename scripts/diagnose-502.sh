#!/bin/bash

# Quick Diagnostic Script for 502 Bad Gateway Issues
# Uses deploy.config.sh for configuration

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

print_header "Diagnosing 502 Bad Gateway Issue"

# Check if we can reach the server at all
print_status "Testing basic connectivity to $SERVER_HOST..."
if curl -s -I "http://$SERVER_HOST" | head -1; then
    print_status "Server is responding to HTTP requests"
else
    print_error "Server is not responding to HTTP requests"
fi

# Check if the backend port is accessible
print_status "Testing backend port $BACKEND_PORT..."
if nc -zv "$SERVER_HOST" "$BACKEND_PORT" 2>/dev/null; then
    print_status "Backend port $BACKEND_PORT is open"
else
    print_warning "Backend port $BACKEND_PORT is not accessible externally"
fi

# Test API endpoints
print_status "Testing API endpoints..."

# Test health endpoint
health_response=$(curl -s -w "%{http_code}" "http://$SERVER_HOST/api/health" -o /dev/null)
if [ "$health_response" = "200" ]; then
    print_status "✅ API health endpoint is working"
elif [ "$health_response" = "502" ]; then
    print_error "❌ API health endpoint returns 502 - Backend is down"
elif [ "$health_response" = "404" ]; then
    print_error "❌ API health endpoint returns 404 - Nginx routing issue"
else
    print_warning "⚠️  API health endpoint returns $health_response"
fi

# Test if we can SSH to diagnose on server
print_status "Testing SSH connectivity..."
if timeout 10 ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" exit 2>/dev/null; then
    print_status "SSH is working - running server diagnostics..."
    
    # Get server diagnostics via SSH
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" << 'EOF'
echo "=== Server Diagnostics ==="

echo "PM2 Status:"
pm2 status 2>/dev/null || echo "PM2 not running or not installed"

echo ""
echo "Node.js processes:"
ps aux | grep node | grep -v grep || echo "No Node.js processes found"

echo ""
echo "Port 3001 usage:"
sudo netstat -tulpn | grep :3001 || echo "Nothing listening on port 3001"

echo ""
echo "Nginx status:"
sudo systemctl status nginx --no-pager -l || echo "Nginx status check failed"

echo ""
echo "Nginx error log (last 10 lines):"
sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "No nginx error log found"

echo ""
echo "PM2 logs (last 20 lines):"
pm2 logs saygoodbye-api --lines 20 --nostream 2>/dev/null || echo "No PM2 logs found"

echo ""
echo "MongoDB status:"
sudo systemctl status mongod --no-pager -l || echo "MongoDB status check failed"

echo ""
echo "Disk space:"
df -h / || echo "Disk space check failed"

echo ""
echo "Memory usage:"
free -h || echo "Memory check failed"

echo ""
echo "System load:"
uptime || echo "Load check failed"
EOF

else
    print_warning "SSH is not working - using alternative diagnostics..."
    
    # Try AWS Systems Manager if SSH fails
    if command -v aws &> /dev/null; then
        print_status "Attempting diagnostics via AWS Systems Manager..."
        
        instance_id=$(aws ec2 describe-instances \
            --region "$AWS_REGION" \
            --filters "Name=ip-address,Values=$SERVER_HOST" \
            --query 'Reservations[*].Instances[*].InstanceId' \
            --output text)
        
        if [ -n "$instance_id" ]; then
            command_id=$(aws ssm send-command \
                --region "$AWS_REGION" \
                --instance-ids "$instance_id" \
                --document-name "AWS-RunShellScript" \
                --parameters 'commands=["pm2 status; sudo systemctl status nginx mongod; sudo netstat -tulpn | grep :3001"]' \
                --query 'Command.CommandId' \
                --output text 2>/dev/null)
            
            if [ -n "$command_id" ]; then
                print_status "Command sent via SSM, command ID: $command_id"
                print_status "Check AWS Console -> Systems Manager -> Run Command for results"
            fi
        fi
    fi
fi

print_header "Common 502 Solutions"
echo "1. Backend not running: pm2 start saygoodbye-api"
echo "2. Wrong port in nginx: Check /etc/nginx/conf.d/saygoodbye.conf"
echo "3. Nginx not reloaded: sudo systemctl reload nginx"
echo "4. Backend crashed: pm2 restart saygoodbye-api"
echo "5. MongoDB down: sudo systemctl start mongod"
echo "6. Out of memory: Check 'free -h' and restart services"

print_header "Quick Fix Commands"
echo "# SSH to server:"
echo "ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST"
echo ""
echo "# Restart everything:"
echo "pm2 restart saygoodbye-api"
echo "sudo systemctl restart nginx"
echo "sudo systemctl restart mongod"
echo ""
echo "# Check logs:"
echo "pm2 logs saygoodbye-api"
echo "sudo tail -f /var/log/nginx/error.log"
