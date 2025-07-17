#!/bin/bash

# Quick Fix Script for 502 Bad Gateway
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

print_header "Quick Fix for 502 Bad Gateway"

# Test current status
print_status "Testing current API status..."
api_response=$(curl -s -w "%{http_code}" "http://$SERVER_HOST/api/health" -o /dev/null)

if [ "$api_response" = "200" ]; then
    print_status "✅ API is working! No fix needed."
    exit 0
elif [ "$api_response" = "502" ]; then
    print_error "❌ Confirmed 502 Bad Gateway - Backend is down"
elif [ "$api_response" = "000" ]; then
    print_error "❌ Connection refused - Server/Nginx might be down"
else
    print_error "❌ API returned HTTP $api_response"
fi

# Try to get instance ID
instance_id=$(aws ec2 describe-instances \
    --region "$AWS_REGION" \
    --filters "Name=ip-address,Values=$SERVER_HOST" \
    --query 'Reservations[*].Instances[*].InstanceId' \
    --output text 2>/dev/null)

if [ -z "$instance_id" ]; then
    print_error "Could not find EC2 instance with IP $SERVER_HOST"
    exit 1
fi

print_status "Found instance: $instance_id"

# Try SSH first
print_status "Attempting SSH connection..."
if timeout 10 ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" exit 2>/dev/null; then
    print_status "SSH working - executing fix via SSH..."
    
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" << 'EOF'
echo "=== Fixing Say Goodbye POA Backend ==="

# Check current status
echo "Current PM2 status:"
pm2 status || echo "PM2 not running"

echo "Current service status:"
sudo systemctl is-active nginx || echo "Nginx inactive"
sudo systemctl is-active mongod || echo "MongoDB inactive"

# Restart everything
echo "Restarting services..."
pm2 kill
sudo systemctl restart mongod
sudo systemctl restart nginx

# Wait for services to start
sleep 5

# Navigate to app directory and start
if [ -d "/home/ec2-user/saygoodbye" ]; then
    cd /home/ec2-user/saygoodbye
    echo "Starting PM2 application..."
    pm2 start ecosystem.config.js
    pm2 save
    
    # Wait for app to start
    sleep 10
    
    echo "Final status check:"
    pm2 status
    echo ""
    
    # Test locally
    echo "Testing API locally:"
    curl -s http://localhost/api/health || echo "Local API test failed"
    
    echo "Testing frontend locally:"
    curl -s -I http://localhost | head -1 || echo "Local frontend test failed"
    
else
    echo "ERROR: Application directory not found at /home/ec2-user/saygoodbye"
    echo "Available directories:"
    ls -la /home/ec2-user/
fi
EOF

else
    print_warning "SSH failed - trying AWS Systems Manager..."
    
    # Create command via SSM
    command_id=$(aws ssm send-command \
        --region "$AWS_REGION" \
        --instance-ids "$instance_id" \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=["#!/bin/bash","echo \"Fixing Say Goodbye POA Backend\"","pm2 kill || echo \"PM2 kill failed\"","sudo systemctl restart mongod nginx","sleep 5","cd /home/ec2-user/saygoodbye || cd /home/ec2-user","if [ -d \"saygoodbye\" ]; then cd saygoodbye && pm2 start ecosystem.config.js; fi","pm2 save","sleep 10","pm2 status","curl -s http://localhost/api/health || echo \"API test failed\""]' \
        --comment "Quick fix for Say Goodbye POA 502 error" \
        --query 'Command.CommandId' \
        --output text 2>/dev/null)
    
    if [ -n "$command_id" ]; then
        print_status "Command sent via SSM: $command_id"
        print_status "Waiting for command to complete..."
        
        # Wait for command completion
        aws ssm wait command-executed \
            --region "$AWS_REGION" \
            --command-id "$command_id" \
            --instance-id "$instance_id" \
            --cli-read-timeout 300 2>/dev/null || print_warning "Command may still be running"
        
        # Get output
        output=$(aws ssm get-command-invocation \
            --region "$AWS_REGION" \
            --command-id "$command_id" \
            --instance-id "$instance_id" \
            --query 'StandardOutputContent' \
            --output text 2>/dev/null)
        
        if [ -n "$output" ]; then
            echo "=== Command Output ==="
            echo "$output"
        fi
    else
        print_error "Failed to send SSM command"
    fi
fi

# Test again after fix attempt
print_status "Testing API status after fix attempt..."
sleep 15

for attempt in 1 2 3; do
    api_response=$(curl -s -w "%{http_code}" "http://$SERVER_HOST/api/health" -o /dev/null)
    
    if [ "$api_response" = "200" ]; then
        print_status "✅ SUCCESS! API is now responding (HTTP $api_response)"
        print_status "🌐 Application should be working at: http://$SERVER_HOST"
        exit 0
    elif [ "$api_response" = "502" ]; then
        print_warning "⚠️  Still getting 502 Bad Gateway (attempt $attempt/3)"
    else
        print_warning "⚠️  API returned HTTP $api_response (attempt $attempt/3)"
    fi
    
    if [ $attempt -lt 3 ]; then
        print_status "Waiting 10 seconds before retry..."
        sleep 10
    fi
done

print_error "❌ Fix attempt failed - API still not responding correctly"
print_warning "Manual intervention may be required"
echo ""
echo "🔧 Next steps:"
echo "1. SSH to server: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST"
echo "2. Check PM2 logs: pm2 logs saygoodbye-api"
echo "3. Check nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "4. Restart manually: pm2 restart saygoodbye-api"
echo "5. Re-deploy: ./scripts/deploy-enhanced.sh"

exit 1
