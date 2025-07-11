# Production Deployment Guide

## 🎉 DEPLOYMENT SUCCESSFUL!

**Application URL**: http://44.200.209.160/  
**API Health Check**: http://44.200.209.160/api/health  
**Deployment Date**: July 10, 2025  

### ✅ Deployment Status
- **Frontend**: ✅ Running (React app served via Nginx)
- **Backend API**: ✅ Running (Node.js with PM2 cluster mode - 2 instances)  
- **Database**: ✅ MongoDB 7.0 running
- **Cache**: ✅ Redis 6 running
- **Reverse Proxy**: ✅ Nginx configured and running
- **SSL**: ⏳ Ready for domain setup (optional)

## Quick Start

### 1. Server Configuration
Your deployment is configured with:
- **Server IP**: 44.200.209.160
- **SSH Key**: /Users/ssoward/.ssh/saygoodbye.pem
- **AWS Credentials**: /Users/ssoward/.aws/credentials

### 2. Access Your Application
- **Frontend**: http://44.200.209.160/
- **Backend API**: http://44.200.209.160/api/health
- **SSH Access**: `ssh -i "/Users/ssoward/.ssh/saygoodbye.pem" ec2-user@44.200.209.160`

### 3. Application Management

#### PM2 Commands (Backend)
```bash
ssh -i "/Users/ssoward/.ssh/saygoodbye.pem" ec2-user@44.200.209.160
pm2 status           # Check application status
pm2 logs             # View logs  
pm2 restart all      # Restart application
pm2 reload all       # Zero-downtime reload
pm2 monit           # Real-time monitoring
```

#### System Services
```bash
sudo systemctl status mongod    # MongoDB status
sudo systemctl status redis6    # Redis status  
sudo systemctl status nginx     # Nginx status
```

## Configuration Files Created

1. **deploy.config.js** - Main deployment configuration
2. **deploy.config.sh** - Shell environment variables
3. **deploy.sh** - Main deployment script
4. **ecosystem.config.json** - PM2 process configuration
5. **backend/.env.production** - Production environment template

## Post-Deployment Steps

### 1. Verify Application is Running
- Frontend: http://44.200.209.160
- Backend API: http://44.200.209.160:3001/api/health
- PM2 Status: `pm2 status`

### 2. Configure Environment Variables
Edit the `.env` file on the server with your actual production values:
```bash
ssh -i "/Users/ssoward/.ssh/saygoodbye.pem" ec2-user@44.200.209.160
cd /home/ec2-user/saygoodbye/backend
sudo nano .env
```

### 3. Set Up SSL (Optional)
If you have a domain name:
```bash
sudo certbot --nginx -d yourdomain.com
```

### 4. Configure Firewall
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## Monitoring and Maintenance

### PM2 Commands
```bash
pm2 status           # Check application status
pm2 logs             # View logs
pm2 restart all      # Restart application
pm2 reload all       # Zero-downtime reload
pm2 monit           # Real-time monitoring
```

### Logs Location
- PM2 Logs: `/home/ec2-user/logs/`
- Nginx Logs: `/var/log/nginx/`
- System Logs: `/var/log/`

### Update Deployment
```bash
cd /home/ec2-user/saygoodbye
git pull origin main
cd backend && npm install --production
pm2 reload all
```

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Check SSH key permissions: `chmod 600 /Users/ssoward/.ssh/saygoodbye.pem`
   - Verify server IP and key path

2. **Application Not Starting**
   - Check PM2 logs: `pm2 logs`
   - Verify environment variables in `.env`
   - Check MongoDB and Redis are running

3. **Frontend Not Loading**
   - Check Nginx configuration: `sudo nginx -t`
   - Verify frontend build was successful
   - Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

4. **Database Connection Issues**
   - Ensure MongoDB is running: `sudo systemctl status mongod`
   - Check connection string in `.env`

### Health Checks
```bash
# Test backend API
curl http://44.200.209.160:3001/api/health

# Test frontend
curl http://44.200.209.160

# Check services
sudo systemctl status mongod
sudo systemctl status redis
sudo systemctl status nginx
```

## Security Recommendations

1. **Change Default Secrets**
   - Generate new JWT_SECRET
   - Update database passwords
   - Configure Stripe keys

2. **Enable Firewall**
   - Only allow necessary ports
   - Consider changing SSH port

3. **Regular Updates**
   - Keep system packages updated
   - Update Node.js and npm
   - Monitor security advisories

4. **Backup Strategy**
   - Automated database backups
   - Code repository backups
   - Log rotation

## Support

For deployment issues, check:
1. Deployment logs in the terminal
2. PM2 application logs
3. System service logs
4. Network connectivity

Contact information or issue tracking can be added here.
