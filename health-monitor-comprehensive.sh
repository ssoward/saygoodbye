#!/bin/bash

# Comprehensive Health Monitoring System for Say Goodbye POA App
# Monitors frontend, backend, database, infrastructure, and user flows
# Usage: ./health-monitor-comprehensive.sh [--continuous] [--alert] [--report]

set -e

# Load configuration
if [ -f "deploy.config.sh" ]; then
    source deploy.config.sh
else
    echo "Warning: deploy.config.sh not found, using defaults"
    SERVER_HOST="${SERVER_HOST:-localhost}"
    SERVER_USER="${SERVER_USER:-ec2-user}"
    SSH_KEY="${SSH_KEY:-~/.ssh/saygoodbye.pem}"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Health monitoring configuration
CONTINUOUS_MODE=false
ALERT_MODE=false
REPORT_MODE=false
MONITORING_INTERVAL=300  # 5 minutes
HEALTH_THRESHOLD_WARNING=70
HEALTH_THRESHOLD_CRITICAL=50
LOG_FILE="/tmp/saygoodbye-health-comprehensive.log"
REPORT_DIR="./health-reports"
ALERT_EMAIL=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --continuous)
            CONTINUOUS_MODE=true
            shift
            ;;
        --alert)
            ALERT_MODE=true
            shift
            ;;
        --report)
            REPORT_MODE=true
            shift
            ;;
        --interval)
            MONITORING_INTERVAL="$2"
            shift 2
            ;;
        --email)
            ALERT_EMAIL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--continuous] [--alert] [--report] [--interval <seconds>] [--email <address>]"
            exit 1
            ;;
    esac
done

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[$timestamp] $1${NC}"
    echo "[$timestamp] $1" >> "$LOG_FILE"
}

success() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$timestamp] ✅ $1${NC}"
    echo "[$timestamp] SUCCESS: $1" >> "$LOG_FILE"
}

warning() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[$timestamp] ⚠️ $1${NC}"
    echo "[$timestamp] WARNING: $1" >> "$LOG_FILE"
}

error() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[$timestamp] ❌ $1${NC}"
    echo "[$timestamp] ERROR: $1" >> "$LOG_FILE"
}

health_metric() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${CYAN}[$timestamp] 📊 $1${NC}"
    echo "[$timestamp] METRIC: $1" >> "$LOG_FILE"
}

# Frontend health check with detailed validation
check_frontend_health() {
    local score=0
    local max_score=30
    local details=""
    
    log "🌐 Checking frontend health..."
    
    # Basic accessibility test (10 points)
    local start_time=$(date +%s%N)
    if response=$(curl -s -w "%{http_code}" "http://$SERVER_HOST" 2>/dev/null); then
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        local http_code="${response: -3}"
        local body="${response%???}"
        
        if [ "$http_code" = "200" ]; then
            score=$((score + 10))
            details+="✅ Frontend accessible (HTTP 200) in ${response_time}ms\n"
            health_metric "Frontend response time: ${response_time}ms"
        else
            details+="❌ Frontend HTTP error: $http_code\n"
        fi
    else
        details+="❌ Frontend not accessible\n"
    fi
    
    # Content validation test (10 points)
    if echo "$body" | grep -q "Say Goodbye\|<!DOCTYPE html>\|<div id=\"root\""; then
        score=$((score + 10))
        details+="✅ Frontend content structure valid\n"
    else
        details+="❌ Frontend content structure invalid\n"
    fi
    
    # React app mounting test (10 points)
    if echo "$body" | grep -q "root\|React\|static/js"; then
        score=$((score + 10))
        details+="✅ React app structure detected\n"
    else
        details+="❌ React app structure not detected\n"
    fi
    
    local percentage=$((score * 100 / max_score))
    echo -e "$details"
    echo "Frontend Health: $score/$max_score ($percentage%)"
    return $score
}

# Backend health check with API validation
check_backend_health() {
    local score=0
    local max_score=40
    local details=""
    
    log "🔧 Checking backend health..."
    
    # Health endpoint test (15 points)
    local start_time=$(date +%s%N)
    if response=$(curl -s -w "%{http_code}" "http://$SERVER_HOST/api/health" 2>/dev/null); then
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        local http_code="${response: -3}"
        local body="${response%???}"
        
        if [ "$http_code" = "200" ] && echo "$body" | grep -q "ok\|healthy"; then
            score=$((score + 15))
            details+="✅ Backend health endpoint OK in ${response_time}ms\n"
            health_metric "Backend health response time: ${response_time}ms"
        else
            details+="❌ Backend health endpoint failed: HTTP $http_code\n"
        fi
    else
        details+="❌ Backend health endpoint not accessible\n"
    fi
    
    # Authentication test (15 points)
    local auth_start=$(date +%s%N)
    if auth_response=$(curl -s -X POST "http://$SERVER_HOST/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@demo.com","password":"demopass123"}' 2>/dev/null); then
        local auth_end=$(date +%s%N)
        local auth_time=$(( (auth_end - auth_start) / 1000000 ))
        
        if echo "$auth_response" | grep -q "token"; then
            score=$((score + 15))
            details+="✅ Authentication working in ${auth_time}ms\n"
            health_metric "Authentication response time: ${auth_time}ms"
        else
            details+="❌ Authentication failed: $auth_response\n"
        fi
    else
        details+="❌ Authentication endpoint not accessible\n"
    fi
    
    # PM2 process check (10 points)
    if pm2_status=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "pm2 jlist" 2>/dev/null); then
        if echo "$pm2_status" | grep -q '"status":"online"'; then
            score=$((score + 10))
            details+="✅ PM2 backend process online\n"
        else
            details+="❌ PM2 backend process not online\n"
        fi
    else
        details+="❌ Cannot check PM2 status\n"
    fi
    
    local percentage=$((score * 100 / max_score))
    echo -e "$details"
    echo "Backend Health: $score/$max_score ($percentage%)"
    return $score
}

# Database health check with connection and data validation
check_database_health() {
    local score=0
    local max_score=20
    local details=""
    
    log "🗄️ Checking database health..."
    
    # MongoDB service check (10 points)
    if db_status=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "systemctl is-active mongod" 2>/dev/null); then
        if [ "$db_status" = "active" ]; then
            score=$((score + 5))
            details+="✅ MongoDB service active\n"
            
            # MongoDB connectivity test (5 more points)
            if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "mongosh --eval 'db.runCommand({ping: 1})' >/dev/null 2>&1"; then
                score=$((score + 5))
                details+="✅ MongoDB connection test passed\n"
            else
                details+="❌ MongoDB connection test failed\n"
            fi
        else
            details+="❌ MongoDB service not active: $db_status\n"
        fi
    else
        details+="❌ Cannot check MongoDB service status\n"
    fi
    
    # Demo users validation (10 points)
    if user_count=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        mongosh saygoodbye --eval 'db.users.countDocuments({email: {\$in: [\"user@demo.com\", \"pro@demo.com\", \"admin@demo.com\"]}})' --quiet 2>/dev/null
    "); then
        if [ "$user_count" -ge 3 ]; then
            score=$((score + 10))
            details+="✅ Demo users present ($user_count users)\n"
        else
            details+="❌ Demo users incomplete ($user_count users)\n"
        fi
    else
        details+="❌ Cannot check demo users\n"
    fi
    
    local percentage=$((score * 100 / max_score))
    echo -e "$details"
    echo "Database Health: $score/$max_score ($percentage%)"
    return $score
}

# Infrastructure health check
check_infrastructure_health() {
    local score=0
    local max_score=10
    local details=""
    
    log "🏗️ Checking infrastructure health..."
    
    # Nginx service check (5 points)
    if nginx_status=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "systemctl is-active nginx" 2>/dev/null); then
        if [ "$nginx_status" = "active" ]; then
            score=$((score + 5))
            details+="✅ Nginx service active\n"
        else
            details+="❌ Nginx service not active: $nginx_status\n"
        fi
    else
        details+="❌ Cannot check Nginx service status\n"
    fi
    
    # System resources check (5 points)
    if resource_info=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        disk_usage=\$(df / | awk 'NR==2{print \$5}' | sed 's/%//')
        memory_usage=\$(free | awk 'NR==2{printf \"%.1f\", \$3/\$2 * 100.0}')
        echo \"disk:\$disk_usage,memory:\$memory_usage\"
    " 2>/dev/null); then
        disk_usage=$(echo "$resource_info" | cut -d',' -f1 | cut -d':' -f2)
        memory_usage=$(echo "$resource_info" | cut -d',' -f2 | cut -d':' -f2)
        
        if [ "$disk_usage" -lt 85 ] && [ "${memory_usage%.*}" -lt 90 ]; then
            score=$((score + 5))
            details+="✅ System resources healthy (Disk: ${disk_usage}%, Memory: ${memory_usage}%)\n"
            health_metric "Disk usage: ${disk_usage}%"
            health_metric "Memory usage: ${memory_usage}%"
        else
            details+="❌ System resources strained (Disk: ${disk_usage}%, Memory: ${memory_usage}%)\n"
        fi
    else
        details+="❌ Cannot check system resources\n"
    fi
    
    local percentage=$((score * 100 / max_score))
    echo -e "$details"
    echo "Infrastructure Health: $score/$max_score ($percentage%)"
    return $score
}

# User flow validation
check_user_flows() {
    local score=0
    local max_score=0  # Not counted in overall score but reported
    local details=""
    
    log "👤 Checking critical user flows..."
    
    # Test user registration flow (if enabled)
    # Test document upload flow
    # Test validation flow
    
    details+="ℹ️ User flow testing not implemented yet\n"
    
    echo -e "$details"
    echo "User Flows: $score/$max_score (Not counted in overall score)"
    return 0
}

# Generate comprehensive health report
generate_health_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="$REPORT_DIR/health-report-$(date +%Y%m%d-%H%M%S).json"
    
    # Create report directory
    mkdir -p "$REPORT_DIR"
    
    log "📊 Generating comprehensive health report..."
    
    # Run all health checks
    local frontend_score=$(check_frontend_health)
    local backend_score=$(check_backend_health)
    local database_score=$(check_database_health)
    local infrastructure_score=$(check_infrastructure_health)
    local user_flow_score=$(check_user_flows)
    
    # Calculate overall health
    local total_score=$((frontend_score + backend_score + database_score + infrastructure_score))
    local max_total_score=100
    local overall_percentage=$((total_score * 100 / max_total_score))
    
    # Create JSON report
    cat > "$report_file" << EOF
{
    "timestamp": "$timestamp",
    "overall_health": {
        "score": $total_score,
        "max_score": $max_total_score,
        "percentage": $overall_percentage,
        "status": "$(
            if [ $overall_percentage -ge 80 ]; then echo "HEALTHY"
            elif [ $overall_percentage -ge 60 ]; then echo "WARNING"
            else echo "CRITICAL"
            fi
        )"
    },
    "components": {
        "frontend": {
            "score": $frontend_score,
            "max_score": 30,
            "percentage": $((frontend_score * 100 / 30))
        },
        "backend": {
            "score": $backend_score,
            "max_score": 40,
            "percentage": $((backend_score * 100 / 40))
        },
        "database": {
            "score": $database_score,
            "max_score": 20,
            "percentage": $((database_score * 100 / 20))
        },
        "infrastructure": {
            "score": $infrastructure_score,
            "max_score": 10,
            "percentage": $((infrastructure_score * 100 / 10))
        }
    },
    "server_info": {
        "host": "$SERVER_HOST",
        "monitoring_script": "health-monitor-comprehensive.sh"
    }
}
EOF
    
    # Display summary
    echo -e "\n🏥 COMPREHENSIVE HEALTH SUMMARY"
    echo -e "================================"
    echo -e "Timestamp: $timestamp"
    echo -e "Overall Health: $total_score/$max_total_score ($overall_percentage%)"
    echo -e ""
    echo -e "Component Breakdown:"
    echo -e "  🌐 Frontend: $frontend_score/30 ($((frontend_score * 100 / 30))%)"
    echo -e "  🔧 Backend: $backend_score/40 ($((backend_score * 100 / 40))%)"
    echo -e "  🗄️ Database: $database_score/20 ($((database_score * 100 / 20))%)"
    echo -e "  🏗️ Infrastructure: $infrastructure_score/10 ($((infrastructure_score * 100 / 10))%)"
    echo -e ""
    
    # Health status with emoji
    if [ $overall_percentage -ge 80 ]; then
        success "🎉 SYSTEM STATUS: HEALTHY ($overall_percentage%)"
    elif [ $overall_percentage -ge 60 ]; then
        warning "⚠️ SYSTEM STATUS: WARNING ($overall_percentage%)"
    else
        error "🚨 SYSTEM STATUS: CRITICAL ($overall_percentage%)"
    fi
    
    echo -e "\nReport saved to: $report_file"
    
    # Send alert if needed
    if [ "$ALERT_MODE" = true ] && [ $overall_percentage -lt $HEALTH_THRESHOLD_WARNING ]; then
        send_alert "$overall_percentage" "$report_file"
    fi
    
    return $overall_percentage
}

# Send health alerts
send_alert() {
    local health_percentage=$1
    local report_file=$2
    
    log "🚨 Sending health alert..."
    
    local subject="Say Goodbye Health Alert - $health_percentage% Health"
    local body="System health has dropped to $health_percentage%. Please check the system immediately."
    
    if [ -n "$ALERT_EMAIL" ]; then
        # Send email if configured
        if command -v mail >/dev/null 2>&1; then
            echo "$body" | mail -s "$subject" "$ALERT_EMAIL"
            success "Alert email sent to $ALERT_EMAIL"
        else
            warning "Mail command not available for email alerts"
        fi
    fi
    
    # Log the alert
    echo "ALERT: $subject - $body" >> "$LOG_FILE"
}

# Continuous monitoring mode
run_continuous_monitoring() {
    log "🔄 Starting continuous health monitoring (interval: ${MONITORING_INTERVAL}s)"
    
    while true; do
        health_percentage=$(generate_health_report)
        
        if [ "$REPORT_MODE" = true ]; then
            log "Sleeping for $MONITORING_INTERVAL seconds..."
        fi
        
        sleep $MONITORING_INTERVAL
    done
}

# Main execution
main() {
    echo -e "${BLUE}Say Goodbye POA App - Comprehensive Health Monitor${NC}"
    echo -e "${BLUE}=================================================${NC}"
    
    # Initialize log file
    echo "Health monitoring started at $(date)" > "$LOG_FILE"
    
    if [ "$CONTINUOUS_MODE" = true ]; then
        run_continuous_monitoring
    else
        generate_health_report
    fi
}

# Run main function
main "$@"
