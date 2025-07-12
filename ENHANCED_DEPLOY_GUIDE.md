# Enhanced Production Deployment Guide

## 🚀 Quick Deploy

```bash
# Full deployment with testing
./deploy-enhanced.sh all

# Deploy only frontend
./deploy-enhanced.sh frontend

# Deploy only backend  
./deploy-enhanced.sh backend

# Deploy without tests (faster)
./deploy-enhanced.sh all --skip-tests

# Rollback to previous version
./deploy-enhanced.sh rollback
```

## 📋 Pre-Deployment Checklist

### ✅ Required Tools
- [x] Node.js 18+ installed locally
- [x] npm installed
- [x] SSH key configured (`~/.ssh/saygoodbye.pem`)
- [x] Playwright installed (`npm install -D @playwright/test`)

### ✅ Environment Setup
- [x] `deploy.config.sh` configured with correct server details
- [x] Frontend `.env.production` file configured
- [x] Backend `.env.production` file configured
- [x] SSH key has correct permissions (600)

### ✅ Pre-Flight Tests
```bash
# Test SSH connection
ssh -i ~/.ssh/saygoodbye.pem ec2-user@44.200.209.160 "echo 'Connection test'"

# Test current production (if exists)
npm run test:e2e:critical

# Build frontend locally
cd frontend && npm run build && cd ..

# Test backend locally
cd backend && npm test && cd ..
```

## 🎯 Deployment Features

### 🧪 **Automated Testing**
- **Pre-deployment tests**: Validates current production before changes
- **Local build verification**: Ensures builds complete successfully
- **Post-deployment tests**: Validates deployment with Playwright E2E tests
- **Health checks**: Comprehensive service validation

### 🔒 **Safety Features**
- **Automatic backups**: Creates timestamped backups before deployment
- **Rollback capability**: Quick rollback to previous version
- **Error handling**: Stops deployment on any error
- **Service validation**: Ensures all services start correctly

### 📊 **Monitoring & Logging**
- **Real-time status**: Shows deployment progress
- **Service monitoring**: PM2 status checks
- **Health endpoints**: API and frontend validation
- **Comprehensive logs**: Detailed deployment and error logs

## 🔧 Enhanced Deployment Process

### 1. **Pre-Deployment Phase**
```bash
✓ Check prerequisites (Node.js, npm, Playwright)
✓ Run pre-deployment tests against current production
✓ Build and test locally
✓ Validate SSH connection
```

### 2. **Backup Phase**
```bash
✓ Create timestamped backup of current deployment
✓ Store in /home/ec2-user/backups/
```

### 3. **Deployment Phase**
```bash
✓ Install/update system dependencies
✓ Deploy backend with PM2 management
✓ Deploy frontend with nginx configuration
✓ Setup SSL certificates (if domain configured)
```

### 4. **Validation Phase**
```bash
✓ Comprehensive health checks
✓ Service status validation
✓ Run Playwright E2E tests
✓ Display deployment summary
```

## 📱 Testing Integration

### **Critical Test Suite**
The deployment automatically runs our critical production tests:

```javascript
// Tests included in post-deployment validation:
- ✅ Site loads and redirects to login
- ✅ Login functionality works
- ✅ API health endpoint responds
- ✅ User registration API works
- ✅ Authentication API returns tokens
- ✅ Mobile responsive design
- ✅ Dashboard access after login
```

### **Test Commands**
```bash
# Run critical tests manually
npm run test:e2e:critical

# Run all comprehensive tests
npm run test:e2e

# View test reports
npm run test:e2e:report

# Run tests with browser visible
npm run test:e2e:headed
```

## 🛠 Configuration Options

### **Deploy Command Options**
```bash
./deploy-enhanced.sh [target] [options]

Targets:
  all       - Deploy both frontend and backend (default)
  frontend  - Deploy only frontend
  backend   - Deploy only backend
  rollback  - Rollback to previous version

Options:
  --skip-tests      - Skip all testing phases
  --no-pre-tests    - Skip pre-deployment tests only
  --no-post-tests   - Skip post-deployment tests only
```

### **Environment Variables**
```bash
# In deploy.config.sh
SERVER_HOST="44.200.209.160"
SERVER_USER="ec2-user"
SSH_KEY="/Users/ssoward/.ssh/saygoodbye.pem"
DEPLOY_PATH="/home/ec2-user/saygoodbye"
BACKUP_PATH="/home/ec2-user/backups"
```

## 🚨 Troubleshooting

### **Common Issues & Solutions**

#### SSH Connection Failed
```bash
# Check SSH key permissions
chmod 600 ~/.ssh/saygoodbye.pem

# Test connection manually
ssh -i ~/.ssh/saygoodbye.pem ec2-user@44.200.209.160
```

#### Tests Failing
```bash
# Rate limiting issues
# Wait 30 seconds between test runs

# WebKit timeout issues
# Use --skip-tests for urgent deployments

# Element not found
# Update test selectors in critical.spec.js
```

#### Service Start Issues
```bash
# Check PM2 logs
ssh -i ~/.ssh/saygoodbye.pem ec2-user@44.200.209.160 'pm2 logs'

# Check nginx status
ssh -i ~/.ssh/saygoodbye.pem ec2-user@44.200.209.160 'sudo systemctl status nginx'

# Check system logs
ssh -i ~/.ssh/saygoodbye.pem ec2-user@44.200.209.160 'sudo journalctl -xe'
```

#### Rollback Needed
```bash
# Automatic rollback
./deploy-enhanced.sh rollback

# Manual rollback
ssh -i ~/.ssh/saygoodbye.pem ec2-user@44.200.209.160
cd /home/ec2-user/backups
ls -la  # Find backup file
sudo tar -xzf saygoodbye-backup-YYYYMMDD-HHMMSS.tar.gz -C /home/ec2-user/
pm2 restart saygoodbye-backend
sudo systemctl restart nginx
```

## 📈 Monitoring After Deployment

### **Service Health**
```bash
# Check all services
ssh -i ~/.ssh/saygoodbye.pem ec2-user@44.200.209.160 'pm2 status'

# Monitor logs in real-time
ssh -i ~/.ssh/saygoodbye.pem ec2-user@44.200.209.160 'pm2 logs --lines 50'

# Check nginx access logs
ssh -i ~/.ssh/saygoodbye.pem ec2-user@44.200.209.160 'sudo tail -f /var/log/nginx/access.log'
```

### **Application Health**
```bash
# Test endpoints
curl http://44.200.209.160/api/health
curl http://44.200.209.160

# Run periodic tests
npm run test:e2e:critical
```

### **System Resources**
```bash
# Check system resources
ssh -i ~/.ssh/saygoodbye.pem ec2-user@44.200.209.160 'top'
ssh -i ~/.ssh/saygoodbye.pem ec2-user@44.200.209.160 'df -h'
ssh -i ~/.ssh/saygoodbye.pem ec2-user@44.200.209.160 'free -m'
```

## 🎉 Success Indicators

After successful deployment, you should see:

1. **✅ All services running**
   ```bash
   pm2 status shows saygoodbye-backend as 'online'
   nginx status shows 'active (running)'
   ```

2. **✅ Application accessible**
   ```bash
   http://44.200.209.160 loads the login page
   http://44.200.209.160/api/health returns {"status":"healthy"}
   ```

3. **✅ Tests passing**
   ```bash
   35/35 critical tests passed
   Login, API, and mobile tests successful
   ```

4. **✅ No errors in logs**
   ```bash
   PM2 logs show no critical errors
   Nginx logs show successful requests
   ```

---

## 🔄 Quick Reference

```bash
# Standard deployment
./deploy-enhanced.sh all

# Emergency deployment (skip tests)
./deploy-enhanced.sh all --skip-tests

# Rollback
./deploy-enhanced.sh rollback

# Test after deployment
npm run test:e2e:critical

# Monitor services
ssh -i ~/.ssh/saygoodbye.pem ec2-user@44.200.209.160 'pm2 monit'
```
