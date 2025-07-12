#!/bin/bash

# Production Monitoring Setup for Say Goodbye POA App
# Sets up automated health monitoring, log rotation, and alerting

set -e

# Load configuration
if [ -f "$(dirname "$0")/deploy.config.sh" ]; then
    source "$(dirname "$0")/deploy.config.sh"
else
    SERVER_HOST="34.235.117.235"
    SSH_KEY="~/.ssh/saygoodbye.pem"
    SERVER_USER="ec2-user"
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

setup_monitoring() {
    log "Setting up comprehensive production monitoring..."
    
    # Create monitoring directory
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        mkdir -p ~/monitoring/logs
        mkdir -p ~/monitoring/reports
        mkdir -p ~/monitoring/scripts
    "
    
    # Upload monitoring scripts
    log "Uploading monitoring scripts..."
    scp -i "$SSH_KEY" health-monitor-advanced.sh "$SERVER_USER@$SERVER_HOST:~/monitoring/scripts/"
    scp -i "$SSH_KEY" health-check-simple.sh "$SERVER_USER@$SERVER_HOST:~/monitoring/scripts/"
    
    # Create enhanced monitoring script on server
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        cat > ~/monitoring/scripts/continuous-monitor.sh << 'MONITOR_EOF'
#!/bin/bash

# Continuous monitoring script for Say Goodbye POA App
MONITOR_DIR=\"/home/ec2-user/monitoring\"
HEALTH_SCRIPT=\"\$MONITOR_DIR/scripts/health-monitor-advanced.sh\"
ALERT_LOG=\"\$MONITOR_DIR/logs/alerts.log\"
REPORT_DIR=\"\$MONITOR_DIR/reports\"

# Run health check and capture result
cd \$MONITOR_DIR/scripts
HEALTH_RESULT=\$(./health-monitor-advanced.sh --json 2>&1)
HEALTH_EXIT_CODE=\$?

# Save report with timestamp
TIMESTAMP=\$(date +%Y%m%d-%H%M%S)
echo \"\$HEALTH_RESULT\" > \"\$REPORT_DIR/health-\$TIMESTAMP.json\"

# Log health status
echo \"[\$(date)] Health check completed - Exit code: \$HEALTH_EXIT_CODE\" >> \"\$MONITOR_DIR/logs/monitor.log\"

# Alert on issues
if [ \$HEALTH_EXIT_CODE -ne 0 ]; then
    ALERT_MSG=\"[\$(date)] ALERT: Health check failed with exit code \$HEALTH_EXIT_CODE\"
    echo \"\$ALERT_MSG\" >> \"\$ALERT_LOG\"
    
    # Extract status from JSON
    STATUS=\$(echo \"\$HEALTH_RESULT\" | grep '\"status\"' | cut -d'\"' -f4)
    PERCENTAGE=\$(echo \"\$HEALTH_RESULT\" | grep '\"health_percentage\"' | cut -d':' -f2 | cut -d',' -f1 | tr -d ' ')
    
    # Log to system log
    logger \"SayGoodbye Health Alert: Status=\$STATUS, Health=\$PERCENTAGE%\"
    
    # Email alert if mail is configured
    if command -v mail >/dev/null 2>&1; then
        echo \"Say Goodbye POA Health Alert: Status=\$STATUS, Health=\$PERCENTAGE%\" | mail -s \"Health Alert\" root
    fi
fi

# Cleanup old reports (keep last 100)
find \"\$REPORT_DIR\" -name \"health-*.json\" -type f | sort | head -n -100 | xargs rm -f
MONITOR_EOF

        chmod +x ~/monitoring/scripts/continuous-monitor.sh
        chmod +x ~/monitoring/scripts/health-monitor-advanced.sh
        chmod +x ~/monitoring/scripts/health-check-simple.sh
    "
    
    success "Monitoring scripts installed"
}

setup_cron_jobs() {
    log "Setting up automated monitoring cron jobs..."
    
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        # Create comprehensive cron job configuration
        cat > ~/monitoring/crontab-setup.txt << 'CRON_EOF'
# Say Goodbye POA Production Monitoring
# Health check every 5 minutes
*/5 * * * * /home/ec2-user/monitoring/scripts/continuous-monitor.sh >/dev/null 2>&1

# Detailed health report every hour
0 * * * * /home/ec2-user/monitoring/scripts/health-monitor-advanced.sh > /home/ec2-user/monitoring/logs/hourly-health.log 2>&1

# PM2 health check every 2 minutes
*/2 * * * * /usr/bin/pm2 ping >/dev/null 2>&1 || /usr/bin/pm2 resurrect

# Log rotation daily at 2 AM
0 2 * * * find /home/ec2-user/monitoring/logs -name \"*.log\" -size +10M -exec gzip {} \;

# Cleanup old compressed logs weekly
0 3 * * 0 find /home/ec2-user/monitoring/logs -name \"*.gz\" -mtime +30 -delete

# Disk space check every 30 minutes
*/30 * * * * df -h / | awk 'NR==2 {if(\$5+0 > 85) print \"WARNING: Disk usage high: \" \$5}' | logger

# MongoDB health check every 10 minutes
*/10 * * * * systemctl is-active mongod >/dev/null || (echo \"MongoDB down\" | logger && systemctl restart mongod)

# Nginx health check every 5 minutes
*/5 * * * * systemctl is-active nginx >/dev/null || (echo \"Nginx down\" | logger && systemctl restart nginx)

# Network connectivity check every 15 minutes
*/15 * * * * ping -c 1 8.8.8.8 >/dev/null 2>&1 || echo \"Network connectivity issue\" | logger

CRON_EOF

        # Install cron jobs
        crontab ~/monitoring/crontab-setup.txt
        
        # Enable cron service
        sudo systemctl enable crond
        sudo systemctl start crond
        
        echo 'Cron jobs installed and service started'
    "
    
    success "Automated monitoring cron jobs configured"
}

setup_log_rotation() {
    log "Setting up log rotation for application logs..."
    
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        # Create logrotate configuration for PM2 logs
        sudo tee /etc/logrotate.d/saygoodbye << 'LOGROTATE_EOF'
/home/ec2-user/.pm2/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 ec2-user ec2-user
}

/home/ec2-user/monitoring/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 ec2-user ec2-user
}

/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 nginx nginx
    postrotate
        systemctl reload nginx
    endscript
}
LOGROTATE_EOF

        # Test logrotate configuration
        sudo logrotate -d /etc/logrotate.d/saygoodbye
        
        echo 'Log rotation configured'
    "
    
    success "Log rotation configured"
}

setup_alerting() {
    log "Setting up alerting and notification system..."
    
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        # Create alert management script
        cat > ~/monitoring/scripts/alert-manager.sh << 'ALERT_EOF'
#!/bin/bash

# Alert Manager for Say Goodbye POA App
ALERT_LOG=\"/home/ec2-user/monitoring/logs/alerts.log\"
WEBHOOK_URL=\"\${SLACK_WEBHOOK_URL:-}\"

send_alert() {
    local severity=\"\$1\"
    local message=\"\$2\"
    local timestamp=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Log alert
    echo \"[\$timestamp] \$severity: \$message\" >> \"\$ALERT_LOG\"
    
    # Send to system log
    logger \"SayGoodbye Alert [\$severity]: \$message\"
    
    # Send to webhook if configured
    if [ -n \"\$WEBHOOK_URL\" ]; then
        curl -X POST \"\$WEBHOOK_URL\" \
            -H \"Content-Type: application/json\" \
            -d \"{
                \\\"text\\\": \\\"🚨 Say Goodbye POA Alert\\\",
                \\\"attachments\\\": [{
                    \\\"color\\\": \\\"\$([ \"\$severity\" = \"CRITICAL\" ] && echo \"danger\" || echo \"warning\")\\\",
                    \\\"title\\\": \\\"Alert: \$severity\\\",
                    \\\"text\\\": \\\"\$message\\\",
                    \\\"footer\\\": \\\"Say Goodbye POA Monitoring\\\",
                    \\\"ts\\\": \$(date +%s)
                }]
            }\" 2>/dev/null || echo \"Failed to send webhook alert\" >> \"\$ALERT_LOG\"
    fi
}

# Check for specific conditions and alert
check_critical_conditions() {
    # Check if backend is down
    if ! curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
        send_alert \"CRITICAL\" \"Backend API is not responding\"
    fi
    
    # Check if frontend is down
    if ! curl -f http://localhost >/dev/null 2>&1; then
        send_alert \"CRITICAL\" \"Frontend is not accessible\"
    fi
    
    # Check disk usage
    DISK_USAGE=\$(df / | tail -1 | awk '{print \$5}' | sed 's/%//')
    if [ \"\$DISK_USAGE\" -gt 90 ]; then
        send_alert \"CRITICAL\" \"Disk usage critical: \${DISK_USAGE}%\"
    elif [ \"\$DISK_USAGE\" -gt 80 ]; then
        send_alert \"WARNING\" \"Disk usage high: \${DISK_USAGE}%\"
    fi
    
    # Check memory usage
    MEMORY_USAGE=\$(free | awk 'NR==2{printf \"%.0f\", \$3*100/\$2}')
    if [ \"\$MEMORY_USAGE\" -gt 95 ]; then
        send_alert \"CRITICAL\" \"Memory usage critical: \${MEMORY_USAGE}%\"
    fi
    
    # Check if PM2 processes are running
    ONLINE_PROCESSES=\$(pm2 jlist | grep '\"status\":\"online\"' | wc -l)
    if [ \"\$ONLINE_PROCESSES\" -eq 0 ]; then
        send_alert \"CRITICAL\" \"No PM2 processes are running\"
    fi
}

# Run checks if called directly
if [ \"\${BASH_SOURCE[0]}\" = \"\${0}\" ]; then
    check_critical_conditions
fi
ALERT_EOF

        chmod +x ~/monitoring/scripts/alert-manager.sh
        
        # Create environment file for webhook URL
        cat > ~/monitoring/.env << 'ENV_EOF'
# Monitoring Configuration
# Add your Slack webhook URL here for alerts
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Email settings (if using mail)
# ADMIN_EMAIL=admin@yourcompany.com
ENV_EOF

        echo 'Alert manager configured'
    "
    
    success "Alerting system configured"
}

create_monitoring_dashboard() {
    log "Creating monitoring dashboard..."
    
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        cat > ~/monitoring/scripts/dashboard.sh << 'DASHBOARD_EOF'
#!/bin/bash

# Simple monitoring dashboard for Say Goodbye POA App

echo \"========================================\"
echo \"  SAY GOODBYE POA - MONITORING DASHBOARD\"
echo \"========================================\"
echo \"Generated: \$(date)\"
echo \"Server: \$(hostname -I | awk '{print \$1}')\"
echo \"\"

# System Overview
echo \"📊 SYSTEM OVERVIEW\"
echo \"├── Uptime: \$(uptime | awk -F'up ' '{print \$2}' | awk -F', load' '{print \$1}')\"
echo \"├── Load: \$(uptime | awk -F'load average: ' '{print \$2}')\"
echo \"├── Disk: \$(df -h / | tail -1 | awk '{print \$5 \" used of \" \$2}')\"
echo \"├── Memory: \$(free -h | awk 'NR==2{printf \"%s used of %s (%.1f%%)\", \$3, \$2, \$3*100/\$2}')\"
echo \"\"

# Service Status
echo \"🔧 SERVICE STATUS\"
PM2_STATUS=\$(pm2 jlist 2>/dev/null | grep '\"status\":\"online\"' | wc -l)
echo \"├── PM2 Processes: \$PM2_STATUS online\"
echo \"├── MongoDB: \$(systemctl is-active mongod)\"
echo \"├── Nginx: \$(systemctl is-active nginx)\"
echo \"\"

# Application Health
echo \"🏥 APPLICATION HEALTH\"
if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
    echo \"├── Backend API: ✅ Healthy\"
else
    echo \"├── Backend API: ❌ Down\"
fi

if curl -f http://localhost >/dev/null 2>&1; then
    echo \"├── Frontend: ✅ Accessible\"
else
    echo \"├── Frontend: ❌ Down\"
fi

# Demo Users Test
DEMO_WORKING=0
for user in user@demo.com pro@demo.com admin@demo.com; do
    if curl -s -X POST http://localhost/api/auth/login -H \"Content-Type: application/json\" -d \"{\\\"email\\\":\\\"\$user\\\",\\\"password\\\":\\\"demopass123\\\"}\" | grep -q \"Login successful\" 2>/dev/null; then
        DEMO_WORKING=\$((DEMO_WORKING + 1))
    fi
done
echo \"├── Demo Users: \$DEMO_WORKING/3 working\"
echo \"\"

# Recent Alerts
echo \"🚨 RECENT ALERTS (Last 10)\"
if [ -f \"/home/ec2-user/monitoring/logs/alerts.log\" ]; then
    tail -10 /home/ec2-user/monitoring/logs/alerts.log | while read line; do
        echo \"├── \$line\"
    done
else
    echo \"├── No alerts logged\"
fi
echo \"\"

# PM2 Details
echo \"🚀 PM2 PROCESS DETAILS\"
pm2 status --no-colors 2>/dev/null || echo \"PM2 not available\"
echo \"\"

echo \"========================================\"
echo \"Dashboard generated successfully\"
echo \"For live monitoring: watch -n 30 ~/monitoring/scripts/dashboard.sh\"
echo \"For detailed health: ~/monitoring/scripts/health-monitor-advanced.sh\"
echo \"========================================\"
DASHBOARD_EOF

        chmod +x ~/monitoring/scripts/dashboard.sh
        
        echo 'Monitoring dashboard created'
    "
    
    success "Monitoring dashboard created"
}

generate_monitoring_readme() {
    log "Creating monitoring documentation..."
    
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        cat > ~/monitoring/README.md << 'README_EOF'
# Say Goodbye POA - Production Monitoring

This directory contains the monitoring infrastructure for the Say Goodbye POA application.

## Scripts

### Health Monitoring
- \`health-monitor-advanced.sh\` - Comprehensive health check with scoring
- \`health-check-simple.sh\` - Quick health verification
- \`continuous-monitor.sh\` - Automated monitoring (runs via cron)

### Management
- \`dashboard.sh\` - Live monitoring dashboard
- \`alert-manager.sh\` - Alert handling and notification
- \`alert-manager.sh\` - Alert handling and notification

## Usage

### Quick Health Check
\`\`\`bash
./scripts/health-check-simple.sh
\`\`\`

### Comprehensive Health Report
\`\`\`bash
./scripts/health-monitor-advanced.sh
\`\`\`

### Live Dashboard
\`\`\`bash
./scripts/dashboard.sh
# Or for continuous monitoring:
watch -n 30 ./scripts/dashboard.sh
\`\`\`

### JSON Health Report
\`\`\`bash
./scripts/health-monitor-advanced.sh --json
\`\`\`

## Automated Monitoring

The system automatically:
- Runs health checks every 5 minutes
- Generates hourly detailed reports
- Monitors PM2 processes every 2 minutes
- Checks disk space every 30 minutes
- Monitors database and web server health
- Rotates logs daily
- Sends alerts on critical issues

## Log Files

- \`logs/monitor.log\` - General monitoring activity
- \`logs/alerts.log\` - Alert history
- \`logs/hourly-health.log\` - Hourly health reports
- \`reports/health-TIMESTAMP.json\` - Detailed health reports

## Alerting

Configure alerting by editing \`.env\`:
\`\`\`bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
\`\`\`

## Maintenance

### View Recent Alerts
\`\`\`bash
tail -20 logs/alerts.log
\`\`\`

### Check Cron Jobs
\`\`\`bash
crontab -l
\`\`\`

### Manual Alert Test
\`\`\`bash
./scripts/alert-manager.sh
\`\`\`

### Clean Old Reports
\`\`\`bash
find reports/ -name \"health-*.json\" -mtime +7 -delete
\`\`\`

## Troubleshooting

### Backend Issues
1. Check PM2 status: \`pm2 status\`
2. View PM2 logs: \`pm2 logs\`
3. Restart backend: \`pm2 restart saygoodbye-api\`

### Frontend Issues
1. Check nginx status: \`systemctl status nginx\`
2. Test nginx config: \`nginx -t\`
3. Restart nginx: \`systemctl restart nginx\`

### Database Issues
1. Check MongoDB: \`systemctl status mongod\`
2. View MongoDB logs: \`journalctl -u mongod\`
3. Restart MongoDB: \`systemctl restart mongod\`

### High Resource Usage
1. Check disk: \`df -h\`
2. Check memory: \`free -h\`
3. Check processes: \`top\`
4. Clean logs: \`find /var/log -name \"*.log\" -size +100M\`

## Health Score Interpretation

- **90-100%**: Excellent - System operating optimally
- **80-89%**: Good - Minor issues, system stable
- **70-79%**: Warning - Some issues need attention
- **60-69%**: Poor - Multiple issues affecting performance
- **Below 60%**: Critical - Immediate attention required

## Emergency Contacts

In case of critical issues:
1. Check this monitoring dashboard first
2. Review alert logs for specific issues
3. Follow troubleshooting steps above
4. Contact system administrator if issues persist

Last Updated: \$(date)
README_EOF

        echo 'Monitoring documentation created'
    "
    
    success "Monitoring documentation created"
}

main() {
    log "Setting up comprehensive production monitoring for Say Goodbye POA App..."
    
    setup_monitoring
    setup_cron_jobs
    setup_log_rotation
    setup_alerting
    create_monitoring_dashboard
    generate_monitoring_readme
    
    success "Production monitoring setup completed!"
    echo ""
    echo "=================================================="
    echo "🎯 MONITORING SETUP SUMMARY"
    echo "=================================================="
    echo "✅ Health monitoring scripts installed"
    echo "✅ Automated cron jobs configured"
    echo "✅ Log rotation setup"
    echo "✅ Alert system configured"
    echo "✅ Monitoring dashboard created"
    echo "✅ Documentation generated"
    echo ""
    echo "📊 To view live dashboard:"
    echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST"
    echo "   ~/monitoring/scripts/dashboard.sh"
    echo ""
    echo "🔍 To run health check:"
    echo "   ./health-monitor-advanced.sh"
    echo ""
    echo "⚡ To configure alerts:"
    echo "   Edit ~/monitoring/.env on server with webhook URL"
    echo "=================================================="
}

main "$@"
