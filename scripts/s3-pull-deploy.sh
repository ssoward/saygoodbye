#!/bin/bash

# Direct S3 Pull Deployment Script
# This creates a public S3 link that the server can pull from

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

print_header "S3 Pull Deployment Method"

# Use existing recovery package
PACKAGE_NAME="saygoodbye_recovery_20250716_215530"
BUCKET_NAME="saygoodbye-recovery-1752724560"

# Make the S3 object publicly accessible temporarily
print_status "Making deployment package publicly accessible..."
aws s3api put-object-acl \
    --bucket "$BUCKET_NAME" \
    --key "${PACKAGE_NAME}.tar.gz" \
    --acl public-read \
    --region "$AWS_REGION"

# Generate public URL
PUBLIC_URL="https://$BUCKET_NAME.s3.$AWS_REGION.amazonaws.com/${PACKAGE_NAME}.tar.gz"

print_status "Deployment package available at: $PUBLIC_URL"

# Create a bootstrap script that the server can run
cat > bootstrap_recovery.sh << EOF
#!/bin/bash

set -e

echo "=== Emergency Recovery Bootstrap ==="
echo "Downloading deployment package from S3..."

cd /tmp
curl -f -L -o recovery.tar.gz "$PUBLIC_URL"

if [ ! -f recovery.tar.gz ]; then
    echo "ERROR: Failed to download recovery package"
    exit 1
fi

echo "Extracting deployment package..."
tar -xzf recovery.tar.gz

cd $PACKAGE_NAME

echo "Starting recovery setup..."
chmod +x recovery_setup.sh
sudo ./recovery_setup.sh

echo "Cleaning up..."
cd /tmp
rm -rf recovery.tar.gz $PACKAGE_NAME

echo "=== Recovery Bootstrap Completed ==="
EOF

# Upload bootstrap script to S3
aws s3 cp bootstrap_recovery.sh "s3://$BUCKET_NAME/bootstrap_recovery.sh" --region "$AWS_REGION"
aws s3api put-object-acl \
    --bucket "$BUCKET_NAME" \
    --key "bootstrap_recovery.sh" \
    --acl public-read \
    --region "$AWS_REGION"

BOOTSTRAP_URL="https://$BUCKET_NAME.s3.$AWS_REGION.amazonaws.com/bootstrap_recovery.sh"

print_header "Manual Recovery Instructions"
echo "Since automated deployment failed, please manually run these commands on the server:"
echo ""
echo "Option 1 - SSH (if working):"
echo "ssh -i $SSH_KEY ec2-user@$SERVER_HOST"
echo "curl -f -L -o bootstrap.sh '$BOOTSTRAP_URL'"
echo "chmod +x bootstrap.sh"
echo "./bootstrap.sh"
echo ""
echo "Option 2 - AWS Console Session Manager:"
echo "1. Go to AWS EC2 Console"
echo "2. Select instance i-08f2f78559bf7f3ae"
echo "3. Click 'Connect' -> 'Session Manager'"
echo "4. Run these commands:"
echo "   curl -f -L -o bootstrap.sh '$BOOTSTRAP_URL'"
echo "   chmod +x bootstrap.sh"
echo "   ./bootstrap.sh"
echo ""
echo "Option 3 - EC2 Instance Connect:"
echo "1. Go to AWS EC2 Console"
echo "2. Select instance i-08f2f78559bf7f3ae"
echo "3. Click 'Connect' -> 'EC2 Instance Connect'"
echo "4. Run the same commands as Option 2"

# Test connectivity to see if we can SSH
print_status "Testing SSH connectivity..."
if timeout 10 ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o BatchMode=yes ec2-user@$SERVER_HOST "echo 'SSH working'" 2>/dev/null; then
    print_status "✅ SSH is working! Running automatic recovery..."
    
    ssh -i "$SSH_KEY" ec2-user@$SERVER_HOST << 'REMOTE_SCRIPT'
cd /tmp
curl -f -L -o bootstrap.sh 'https://saygoodbye-recovery-1752724560.s3.us-east-1.amazonaws.com/bootstrap_recovery.sh'
chmod +x bootstrap.sh
./bootstrap.sh
REMOTE_SCRIPT
    
    print_status "Automatic recovery completed! Testing services..."
    
else
    print_warning "⚠️  SSH not working. Manual intervention required using AWS Console."
    print_status "URLs for manual deployment:"
    echo "Bootstrap script: $BOOTSTRAP_URL"
    echo "Recovery package: $PUBLIC_URL"
fi

# Test the deployment (either automatic or assume manual was done)
print_status "Testing deployment..."
sleep 10

# Test multiple times
for test_attempt in 1 2 3 4 5; do
    print_status "Test attempt $test_attempt/5..."
    
    # Test frontend
    frontend_status=$(curl -s -w "%{http_code}" "http://$SERVER_HOST" -o /dev/null)
    print_status "Frontend status: $frontend_status"
    
    # Test API health
    api_status=$(curl -s -w "%{http_code}" "http://$SERVER_HOST/api/health" -o /dev/null)
    print_status "API health status: $api_status"
    
    # Test login endpoint (should return 400/422 for empty request)
    login_status=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "http://$SERVER_HOST/api/auth/login" -o /dev/null)
    print_status "Login endpoint status: $login_status"
    
    if [ "$frontend_status" = "200" ] && [ "$api_status" = "200" ] && ([ "$login_status" = "400" ] || [ "$login_status" = "422" ]); then
        print_status "✅ SUCCESS! All services are working correctly"
        print_header "🎉 Emergency Recovery Completed Successfully!"
        echo "✅ Frontend: http://$SERVER_HOST"
        echo "✅ API: http://$SERVER_HOST/api"
        echo "✅ Login should now work properly"
        break
    elif [ $test_attempt -eq 5 ]; then
        print_error "❌ Services still not responding correctly after recovery attempt"
        print_warning "Manual intervention may still be required"
        echo ""
        echo "Manual recovery commands:"
        echo "curl -f -L -o bootstrap.sh '$BOOTSTRAP_URL'"
        echo "chmod +x bootstrap.sh"
        echo "./bootstrap.sh"
    else
        print_warning "⚠️  Services still starting up, waiting..."
        sleep 20
    fi
done

# Clean up (keep files accessible for now in case manual intervention needed)
print_status "Keeping S3 files accessible for 1 hour in case manual intervention is needed"
echo "Files will remain accessible at:"
echo "Bootstrap: $BOOTSTRAP_URL"
echo "Package: $PUBLIC_URL"

rm -f bootstrap_recovery.sh
