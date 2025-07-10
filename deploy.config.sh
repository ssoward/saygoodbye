#!/bin/bash

# Deployment Configuration
# Server Details
SERVER_HOST="44.200.209.160"
SERVER_HOSTNAME="ec2-44-200-209-160.compute-1.amazonaws.com"
SERVER_USER="ec2-user"

# SSH Configuration
SSH_KEY="/Users/ssoward/.ssh/saygoodbye.pem"

# AWS Configuration
AWS_CREDENTIALS="/Users/ssoward/.aws/credentials"
AWS_REGION="us-east-1"

# Deployment Paths
DEPLOY_PATH="/home/ec2-user/saygoodbye"
BACKUP_PATH="/home/ec2-user/backups"

# Application Configuration
PM2_APP_NAME="saygoodbye-api"
BACKEND_PORT="3001"
FRONTEND_PORT="80"

# Repository
REPO_URL="https://github.com/ssoward/saygoodbye.git"

export SERVER_HOST SERVER_HOSTNAME SERVER_USER SSH_KEY AWS_CREDENTIALS AWS_REGION
export DEPLOY_PATH BACKUP_PATH PM2_APP_NAME BACKEND_PORT FRONTEND_PORT REPO_URL
