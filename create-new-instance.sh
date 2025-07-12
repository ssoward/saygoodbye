#!/bin/bash

# AWS EC2 Instance Launch Script for Say Goodbye POA App
# This script creates a new EC2 instance with proper configuration

set -e

# Configuration
INSTANCE_TYPE="t3.micro"
AMI_ID="ami-0c02fb55956c7d316"  # Amazon Linux 2023 AMI
KEY_NAME="saygoodbye"
SECURITY_GROUP_NAME="saygoodbye-sg"
INSTANCE_NAME="saygoodbye-production"
REGION="us-east-1"

echo "🚀 Creating new EC2 instance for Say Goodbye POA App..."

# Check if security group exists, create if not
if ! aws ec2 describe-security-groups --group-names "$SECURITY_GROUP_NAME" --region "$REGION" >/dev/null 2>&1; then
    echo "📋 Creating security group: $SECURITY_GROUP_NAME"
    
    # Create security group
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name "$SECURITY_GROUP_NAME" \
        --description "Security group for Say Goodbye POA App" \
        --region "$REGION" \
        --query 'GroupId' \
        --output text)
    
    # Add rules for HTTP (80), HTTPS (443), SSH (22)
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
    
    aws ec2 authorize-security-group-ingress \
        --group-id "$SECURITY_GROUP_ID" \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0 \
        --region "$REGION"
    
    echo "✅ Security group created: $SECURITY_GROUP_ID"
else
    SECURITY_GROUP_ID=$(aws ec2 describe-security-groups \
        --group-names "$SECURITY_GROUP_NAME" \
        --region "$REGION" \
        --query 'SecurityGroups[0].GroupId' \
        --output text)
    echo "✅ Using existing security group: $SECURITY_GROUP_ID"
fi

# Create user data script for instance initialization
cat > user-data.sh << 'EOF'
#!/bin/bash
yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install MongoDB
cat << 'MONGODB_REPO' > /etc/yum.repos.d/mongodb-org-6.0.repo
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
MONGODB_REPO

yum install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Install nginx
yum install -y nginx
systemctl enable nginx

# Install git
yum install -y git

# Create directories
mkdir -p /home/ec2-user/logs
mkdir -p /home/ec2-user/backups
chown -R ec2-user:ec2-user /home/ec2-user/

# Install AWS CLI v2 (if not already installed)
if ! command -v aws &> /dev/null; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    ./aws/install
    rm -rf aws awscliv2.zip
fi

# Install AWS SSM Agent for remote management
yum install -y amazon-ssm-agent
systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

echo "Instance initialization completed" > /tmp/init-complete.log
EOF

# Launch EC2 instance
echo "🖥️ Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --count 1 \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-groups "$SECURITY_GROUP_NAME" \
    --user-data file://user-data.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --region "$REGION" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "✅ Instance launched: $INSTANCE_ID"
echo "⏳ Waiting for instance to be running..."

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo ""
echo "🎉 NEW EC2 INSTANCE READY!"
echo "=================================="
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "Security Group: $SECURITY_GROUP_ID"
echo ""
echo "⏳ Services are still initializing..."
echo "SSH will be available in 2-3 minutes at:"
echo "ssh -i ~/.ssh/$KEY_NAME.pem ec2-user@$PUBLIC_IP"
echo ""
echo "🔧 Next steps:"
echo "1. Wait 3-5 minutes for initialization to complete"
echo "2. Update deploy.config.sh with the new IP: $PUBLIC_IP"
echo "3. Run deployment: ./deploy-enhanced.sh all"
echo "=================================="

# Clean up user data file
rm user-data.sh

exit 0
