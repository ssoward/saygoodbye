#!/bin/bash

# Direct SSH Recovery Deployment
set -e

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

print_header "Direct SSH Recovery Deployment"

# Upload the existing recovery package
PACKAGE_NAME="saygoodbye_recovery_20250716_215530"

print_status "Uploading recovery package via SSH..."

# Upload recovery package
scp -i "$SSH_KEY" "${PACKAGE_NAME}.tar.gz" ec2-user@$SERVER_HOST:/tmp/

print_status "Executing recovery on server..."

# Execute recovery on server
ssh -i "$SSH_KEY" ec2-user@$SERVER_HOST << 'REMOTE_SCRIPT'
set -e

echo "=== Remote Recovery Execution ==="

cd /tmp

if [ ! -f saygoodbye_recovery_20250716_215530.tar.gz ]; then
    echo "ERROR: Recovery package not found"
    exit 1
fi

echo "Extracting recovery package..."
tar -xzf saygoodbye_recovery_20250716_215530.tar.gz

cd saygoodbye_recovery_20250716_215530

echo "Starting recovery setup..."
chmod +x recovery_setup.sh
sudo ./recovery_setup.sh

echo "Cleaning up..."
cd /tmp
rm -rf saygoodbye_recovery_20250716_215530*

echo "=== Remote Recovery Completed ==="
REMOTE_SCRIPT

print_status "Recovery deployment completed! Testing services..."

# Test the deployment
sleep 15

for test_attempt in 1 2 3; do
    print_status "Test attempt $test_attempt/3..."
    
    # Test frontend
    frontend_status=$(curl -s -w "%{http_code}" "http://$SERVER_HOST" -o /dev/null 2>/dev/null || echo "000")
    print_status "Frontend status: $frontend_status"
    
    # Test API health
    api_status=$(curl -s -w "%{http_code}" "http://$SERVER_HOST/api/health" -o /dev/null 2>/dev/null || echo "000")
    print_status "API health status: $api_status"
    
    # Test login endpoint
    login_status=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "http://$SERVER_HOST/api/auth/login" -o /dev/null 2>/dev/null || echo "000")
    print_status "Login endpoint status: $login_status"
    
    if [ "$frontend_status" = "200" ] && [ "$api_status" = "200" ] && ([ "$login_status" = "400" ] || [ "$login_status" = "422" ]); then
        print_status "✅ SUCCESS! All services are working correctly"
        print_header "🎉 Recovery Deployment Completed Successfully!"
        echo "✅ Frontend: http://$SERVER_HOST"
        echo "✅ API: http://$SERVER_HOST/api"
        echo "✅ Login functionality restored"
        echo ""
        echo "🔧 Server management:"
        echo "   SSH: ssh -i $SSH_KEY ec2-user@$SERVER_HOST"
        echo "   PM2 status: pm2 status"
        echo "   PM2 logs: pm2 logs saygoodbye-api"
        echo "   Restart API: pm2 restart saygoodbye-api"
        echo "   Restart Nginx: sudo systemctl restart nginx"
        exit 0
    elif [ $test_attempt -eq 3 ]; then
        print_error "❌ Services still not responding correctly"
        echo "Frontend: $frontend_status (should be 200)"
        echo "API: $api_status (should be 200)"
        echo "Login: $login_status (should be 400 or 422)"
        echo ""
        print_status "Checking server status..."
        ssh -i "$SSH_KEY" ec2-user@$SERVER_HOST << 'DEBUG_SCRIPT'
echo "=== Debug Information ==="
echo "PM2 Status:"
pm2 status || true
echo ""
echo "PM2 Logs (last 10 lines):"
pm2 logs saygoodbye-api --lines 10 --nostream || true
echo ""
echo "Nginx Status:"
sudo systemctl status nginx || true
echo ""
echo "MongoDB Status:"
sudo systemctl status mongod || true
echo ""
echo "Port 3001 (API):"
netstat -tlnp | grep 3001 || true
echo ""
echo "Port 80 (Nginx):"
netstat -tlnp | grep :80 || true
DEBUG_SCRIPT
        exit 1
    else
        print_warning "⚠️  Services still starting up, waiting..."
        sleep 20
    fi
done
