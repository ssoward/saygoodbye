#!/bin/bash
yum update -y

# Install Node.js 18 (LTS) via NodeSource repository for AL2023
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install development tools
yum groupinstall -y "Development Tools"
yum install -y git nginx redis6

# Install PM2 globally
npm install -g pm2

# Install MongoDB 7.0 (compatible with modern Node.js)
cat > /etc/yum.repos.d/mongodb-org-7.0.repo << 'MONGOEOF'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2023/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
MONGOEOF

yum install -y mongodb-org

# Start services
systemctl start mongod redis6-server nginx
systemctl enable mongod redis6-server nginx

# Create application directories
mkdir -p /var/www/html
mkdir -p /home/ec2-user/saygoodbye
chown ec2-user:ec2-user /home/ec2-user/saygoodbye

# Configure firewall
systemctl start firewalld
systemctl enable firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=3001/tcp
firewall-cmd --reload

echo "Amazon Linux 2023 setup completed with Node.js $(node --version)"
