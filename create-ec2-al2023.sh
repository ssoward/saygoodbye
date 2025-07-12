#!/bin/bash

# Create EC2 instance with Amazon Linux 2023 for Node.js compatibility
echo "Creating new EC2 instance with Amazon Linux 2023..."

INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0ab806066660e1937 \
    --count 1 \
    --instance-type t3.micro \
    --key-name saygoodbye \
    --security-group-ids sg-0880aa6378eb4493c \
    --subnet-id subnet-031d2bc08027a44e9 \
    --associate-public-ip-address \
    --user-data file://user-data-al2023.sh \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=saygoodbye-al2023}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Instance ID: $INSTANCE_ID"

# Wait for instance to be running
echo "Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "Instance is running!"
echo "Public IP: $PUBLIC_IP"

# Update deployment config
sed -i.bak "s/SERVER_HOST=.*/SERVER_HOST=\"$PUBLIC_IP\"/" deploy.config.sh
sed -i.bak "s/SERVER_HOSTNAME=.*/SERVER_HOSTNAME=\"ec2-$(echo $PUBLIC_IP | tr '.' '-').compute-1.amazonaws.com\"/" deploy.config.sh

# Update Playwright configs
sed -i.bak "s|baseURL: 'http://.*'|baseURL: 'http://$PUBLIC_IP'|" playwright.config.js
sed -i.bak "s|baseURL: 'http://.*'|baseURL: 'http://$PUBLIC_IP'|" playwright.critical.config.js

echo "Updated configuration files with new IP: $PUBLIC_IP"
echo "Instance ready for deployment!"
