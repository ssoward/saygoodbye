#!/bin/bash

# Setup Health Monitoring Cron Jobs
# This script sets up automated health monitoring

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEALTH_SCRIPT="$SCRIPT_DIR/health-check-simple.sh"

echo "Setting up automated health monitoring..."

# Create cron job for health checks every 5 minutes
CRON_JOB="*/5 * * * * $HEALTH_SCRIPT >> /tmp/saygoodbye-health.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "health-check-simple.sh"; then
    echo "Health monitoring cron job already exists"
else
    # Add the cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Added health monitoring cron job (every 5 minutes)"
fi

# Create log rotation for health logs
sudo tee /etc/logrotate.d/saygoodbye-health > /dev/null <<EOF
/tmp/saygoodbye-health.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 0644 $(whoami) $(whoami)
}
EOF

echo "✅ Log rotation configured"
echo ""
echo "Health monitoring setup complete!"
echo "- Health checks run every 5 minutes"
echo "- Logs are stored in /tmp/saygoodbye-health.log"
echo "- Logs are rotated daily, kept for 7 days"
echo ""
echo "To check recent health status:"
echo "  tail -f /tmp/saygoodbye-health.log"
echo ""
echo "To manually run health check:"
echo "  $HEALTH_SCRIPT"
