#!/bin/bash

# Script to create a new EC2 instance for Say Goodbye POA app
# This script creates a production-ready EC2 instance in us-east-1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Configuration
INSTANCE_NAME="saygoodbye-prod-$(date +%Y%m%d)"
KEY_NAME="saygoodbye"
SECURITY_GROUP_NAME="saygoodbye-sg"
REGION="us-east-1"
INSTANCE_TYPE="t3.medium"  # Better performance than t2.micro
AMI_ID="ami-0c02fb55956c7d316"  # Amazon Linux 2023 AMI in us-east-1

log "Creating new EC2 instance for Say Goodbye POA application..."
log "Instance name: $INSTANCE_NAME"
log "Region: $REGION"
log "Instance type: $INSTANCE_TYPE"

# Check if security group exists, create if not
log "Checking security group..."
if ! aws ec2 describe-security-groups --group-names "$SECURITY_GROUP_NAME" --region "$REGION" >/dev/null 2>&1; then
    log "Creating security group: $SECURITY_GROUP_NAME"
    
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name "$SECURITY_GROUP_NAME" \
        --description "Security group for Say Goodbye POA application" \
        --region "$REGION" \
        --query 'GroupId' --output text)
    
    # Add rules for HTTP, HTTPS, and SSH
    aws ec2 authorize-security-group-ingress \
        --group-id "$SECURITY_GROUP_ID" \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0 \
        --region "$REGION"
    
    aws ec2 authorize-security-group-ingress \
        --group-id "$SECURITY_GROUP_ID" \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --region "$REGION"
    
    aws ec2 authorize-security-group-ingress \
        --group-id "$SECURITY_GROUP_ID" \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0 \
        --region "$REGION"
    
    success "Security group created: $SECURITY_GROUP_ID"
else
    SECURITY_GROUP_ID=$(aws ec2 describe-security-groups \
        --group-names "$SECURITY_GROUP_NAME" \
        --region "$REGION" \
        --query 'SecurityGroups[0].GroupId' --output text)
    success "Using existing security group: $SECURITY_GROUP_ID"
fi

# Create user data script for initial setup
USER_DATA=$(cat << 'EOF'
#!/bin/bash
dnf update -y

# Install Node.js 18
dnf install -y nodejs npm

# Install PM2 globally
npm install -g pm2

# Install nginx
dnf install -y nginx
systemctl enable nginx

# Install MongoDB
cat > /etc/yum.repos.d/mongodb-org-6.0.repo << 'EOL'
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2023/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOL

dnf install -y mongodb-org
systemctl enable mongod

# Create application directories
mkdir -p /home/ec2-user/saygoodbye
mkdir -p /home/ec2-user/backups
mkdir -p /home/ec2-user/logs
mkdir -p /var/www/saygoodbye

# Set permissions
chown -R ec2-user:ec2-user /home/ec2-user/saygoodbye
chown -R ec2-user:ec2-user /home/ec2-user/backups
chown -R ec2-user:ec2-user /home/ec2-user/logs
chown -R ec2-user:ec2-user /var/www/saygoodbye

# Install git for easier deployments
dnf install -y git

# Configure PM2 to start on boot
sudo -u ec2-user pm2 startup
EOF
)

# Launch the instance
log "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --count 1 \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SECURITY_GROUP_ID" \
    --user-data "$USER_DATA" \
    --region "$REGION" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --query 'Instances[0].InstanceId' --output text)

success "Instance launched: $INSTANCE_ID"

# Wait for instance to be running
log "Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

# Get the public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

success "Instance is running!"
success "Instance ID: $INSTANCE_ID"
success "Public IP: $PUBLIC_IP"

# Wait for SSH to be available
log "Waiting for SSH to be available..."
for i in {1..30}; do
    if ssh -i ~/.ssh/saygoodbye.pem -o ConnectTimeout=5 -o BatchMode=yes ec2-user@"$PUBLIC_IP" "echo 'SSH ready'" >/dev/null 2>&1; then
        success "SSH is available"
        break
    fi
    if [ $i -eq 30 ]; then
        error "SSH not available after 5 minutes"
    fi
    sleep 10
done

# Update deployment configuration
log "Updating deployment configuration..."
sed -i '' "s/SERVER_HOST=\".*\"/SERVER_HOST=\"$PUBLIC_IP\"/" deploy.config.sh
sed -i '' "s/baseURL: 'http:\/\/.*'/baseURL: 'http:\/\/$PUBLIC_IP'/" playwright.config.js
sed -i '' "s/baseURL: 'http:\/\/.*'/baseURL: 'http:\/\/$PUBLIC_IP'/g" playwright.critical.config.js

success "Configuration updated with new IP: $PUBLIC_IP"

echo ""
echo "=========================================="
echo "         NEW EC2 INSTANCE READY"
echo "=========================================="
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "SSH Command: ssh -i ~/.ssh/saygoodbye.pem ec2-user@$PUBLIC_IP"
echo ""
echo "Next steps:"
echo "1. Run: ./deploy-enhanced.sh all"
echo "2. Test: npm run test:e2e:critical"
echo "=========================================="
