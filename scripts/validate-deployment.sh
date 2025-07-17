#!/bin/bash

# Production Deployment Validation Script
# Run this after deployment to verify everything is working correctly

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PRODUCTION_SERVER="34.235.117.235"
SSH_USER="ec2-user"
SSH_KEY_PATH="$HOME/.ssh/saygoodbye.pem"

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

test_connection() {
    print_info "Testing SSH connection..."
    if ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=5 -o BatchMode=yes "$SSH_USER@$PRODUCTION_SERVER" exit 2>/dev/null; then
        print_status "SSH connection successful"
        return 0
    else
        print_error "SSH connection failed"
        return 1
    fi
}

test_frontend() {
    print_info "Testing frontend accessibility..."
    if curl -f -s --connect-timeout 10 "http://$PRODUCTION_SERVER" > /dev/null; then
        print_status "Frontend is accessible"
        return 0
    else
        print_error "Frontend is not accessible"
        return 1
    fi
}

test_api_health() {
    print_info "Testing API health endpoint..."
    local response=$(curl -s --connect-timeout 10 "http://$PRODUCTION_SERVER/api/health" 2>/dev/null || echo "")
    if [[ "$response" == *"healthy"* ]]; then
        print_status "API health check passed"
        return 0
    else
        print_error "API health check failed"
        print_warning "Response: $response"
        return 1
    fi
}

test_authentication() {
    print_info "Testing authentication with test users..."
    
    local test_users=(
        "user@demo.com:demopass123:Regular User"
        "pro@demo.com:demo1234:Professional User"
        "admin@demo.com:demopass123:Admin User"
    )
    
    local auth_success=0
    local auth_total=0
    
    for user_info in "${test_users[@]}"; do
        IFS=':' read -r email password name <<< "$user_info"
        auth_total=$((auth_total + 1))
        
        print_info "Testing login for $name ($email)..."
        
        local response=$(curl -s -X POST "http://$PRODUCTION_SERVER/api/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
            --connect-timeout 10 2>/dev/null || echo "")
        
        if [[ "$response" == *"Login successful"* ]]; then
            print_status "$name login successful"
            auth_success=$((auth_success + 1))
        else
            print_error "$name login failed"
            print_warning "Response: $response"
        fi
    done
    
    if [ $auth_success -eq $auth_total ]; then
        print_status "All authentication tests passed ($auth_success/$auth_total)"
        return 0
    else
        print_error "Some authentication tests failed ($auth_success/$auth_total)"
        return 1
    fi
}

check_server_services() {
    print_info "Checking server services status..."
    
    ssh -i "$SSH_KEY_PATH" "$SSH_USER@$PRODUCTION_SERVER" << 'REMOTE_EOF'
echo "=== PM2 Status ==="
if command -v pm2 &> /dev/null; then
    pm2 status
    if pm2 show saygoodbye-api > /dev/null 2>&1; then
        echo "✅ PM2 application is running"
    else
        echo "❌ PM2 application is not running"
    fi
else
    echo "❌ PM2 is not installed"
fi

echo ""
echo "=== MongoDB Status ==="
if sudo systemctl is-active --quiet mongod; then
    echo "✅ MongoDB is running"
else
    echo "❌ MongoDB is not running"
fi

echo ""
echo "=== Nginx Status ==="
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
    sudo nginx -t && echo "✅ Nginx configuration is valid" || echo "❌ Nginx configuration is invalid"
else
    echo "❌ Nginx is not running"
fi

echo ""
echo "=== Port Status ==="
echo "Checking required ports..."
sudo netstat -tlnp | grep -E ':(80|3001|27017)' || echo "Some ports may not be listening"

echo ""
echo "=== Environment File ==="
if [ -f "/home/ec2-user/saygoodbye/backend/.env" ]; then
    echo "✅ Environment file exists"
    echo "Environment variables set:"
    grep -E "^[A-Z_]+" /home/ec2-user/saygoodbye/backend/.env | head -5
else
    echo "❌ Environment file is missing"
fi

echo ""
echo "=== Database Test ==="
if mongosh saygoodbye_production --eval "db.runCommand({ping: 1})" --quiet > /dev/null 2>&1; then
    echo "✅ Database connection successful"
    echo "Test users in database:"
    mongosh saygoodbye_production --eval "db.users.find({email: {\$in: ['user@demo.com', 'pro@demo.com', 'admin@demo.com']}}, {email: 1, role: 1, tier: 1}).forEach(function(doc) { print('  ' + doc.email + ' (' + doc.role + '/' + doc.tier + ')'); })" --quiet 2>/dev/null || echo "  Could not list test users"
else
    echo "❌ Database connection failed"
fi

echo ""
echo "=== Recent Logs ==="
echo "Last 5 lines of PM2 logs:"
pm2 logs saygoodbye-api --lines 5 --nostream 2>/dev/null || echo "Could not retrieve PM2 logs"
REMOTE_EOF
}

test_performance() {
    print_info "Testing performance..."
    
    # Test frontend load time
    local start_time=$(date +%s%N)
    if curl -f -s --connect-timeout 10 "http://$PRODUCTION_SERVER" > /dev/null; then
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 ))
        if [ $duration -lt 3000 ]; then
            print_status "Frontend load time: ${duration}ms (good)"
        else
            print_warning "Frontend load time: ${duration}ms (slow)"
        fi
    fi
    
    # Test API response time
    start_time=$(date +%s%N)
    if curl -f -s --connect-timeout 10 "http://$PRODUCTION_SERVER/api/health" > /dev/null; then
        end_time=$(date +%s%N)
        duration=$(( (end_time - start_time) / 1000000 ))
        if [ $duration -lt 1000 ]; then
            print_status "API response time: ${duration}ms (good)"
        else
            print_warning "API response time: ${duration}ms (slow)"
        fi
    fi
}

generate_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="/tmp/deployment_validation_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "Deployment Validation Report"
        echo "Generated: $timestamp"
        echo "Target Server: $PRODUCTION_SERVER"
        echo "================================"
        echo ""
        echo "Test Results:"
        echo "- SSH Connection: $ssh_result"
        echo "- Frontend Access: $frontend_result"
        echo "- API Health: $api_result"
        echo "- Authentication: $auth_result"
        echo ""
        echo "Performance:"
        echo "- Frontend accessible"
        echo "- API responding"
        echo ""
        echo "Next Steps:"
        if [ "$overall_success" = "true" ]; then
            echo "✅ Deployment validation successful!"
            echo "🎉 Production environment is ready for use"
            echo ""
            echo "Test Users Available:"
            echo "- Regular User: user@demo.com / demopass123"
            echo "- Professional User: pro@demo.com / demo1234"
            echo "- Admin User: admin@demo.com / demopass123"
        else
            echo "❌ Deployment validation failed"
            echo "🔧 Review the issues above and check the deployment guide"
            echo "📖 See DEPLOYMENT_GUIDE.md for troubleshooting steps"
        fi
    } > "$report_file"
    
    echo ""
    print_info "Validation report saved to: $report_file"
    cat "$report_file"
}

main() {
    echo ""
    echo "🔍 Production Deployment Validation"
    echo "=================================="
    echo "Target: $PRODUCTION_SERVER"
    echo ""
    
    local overall_success="true"
    
    # Test SSH connection
    if test_connection; then
        ssh_result="✅ Pass"
    else
        ssh_result="❌ Fail"
        overall_success="false"
    fi
    
    # Test frontend
    if test_frontend; then
        frontend_result="✅ Pass"
    else
        frontend_result="❌ Fail"
        overall_success="false"
    fi
    
    # Test API health
    if test_api_health; then
        api_result="✅ Pass"
    else
        api_result="❌ Fail"
        overall_success="false"
    fi
    
    # Test authentication
    if test_authentication; then
        auth_result="✅ Pass"
    else
        auth_result="❌ Fail"
        overall_success="false"
    fi
    
    # Check server services
    echo ""
    print_info "Checking server services..."
    check_server_services
    
    # Test performance
    echo ""
    test_performance
    
    # Generate report
    echo ""
    generate_report
    
    echo ""
    if [ "$overall_success" = "true" ]; then
        print_status "🎉 All validation tests passed!"
        print_status "🚀 Production deployment is successful and ready for use"
        echo ""
        echo "🌐 Application URL: http://$PRODUCTION_SERVER"
        echo "🔗 API Health: http://$PRODUCTION_SERVER/api/health"
        exit 0
    else
        print_error "💥 Some validation tests failed"
        print_warning "🔧 Check the issues above and refer to DEPLOYMENT_GUIDE.md"
        exit 1
    fi
}

# Run validation
main "$@"
