#!/bin/bash

# Comprehensive Health Monitor for Say Goodbye POA App
# Usage: ./health-monitor.sh [--json] [--verbose] [--alert]

set -e

# Load configuration
source "$(dirname "$0")/deploy.config.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
OUTPUT_JSON=false
VERBOSE=false
SEND_ALERTS=false
HEALTH_SCORE=0
MAX_SCORE=10

# Helper functions for health results
set_health_result() {
    echo "$2" > "$HEALTH_RESULTS_DIR/$1"
}

get_health_result() {
    cat "$HEALTH_RESULTS_DIR/$1" 2>/dev/null || echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            OUTPUT_JSON=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --alert)
            SEND_ALERTS=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--json] [--verbose] [--alert]"
            exit 1
            ;;
    esac
done

log() {
    if [ "$OUTPUT_JSON" = false ]; then
        echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    fi
}

success() {
    if [ "$OUTPUT_JSON" = false ]; then
        echo -e "${GREEN}✅ $1${NC}"
    fi
}

warning() {
    if [ "$OUTPUT_JSON" = false ]; then
        echo -e "${YELLOW}⚠️ $1${NC}"
    fi
}

error() {
    if [ "$OUTPUT_JSON" = false ]; then
        echo -e "${RED}❌ $1${NC}"
    fi
}

# Health check results storage
declare -A HEALTH_RESULTS

# Check frontend availability and performance
check_frontend() {
    log "Checking frontend health..."
    
    local start_time=$(date +%s%N)
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_HOST/" --max-time 10)
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    if [ "$status_code" = "200" ]; then
        set_health_result "frontend_status" "healthy"
        set_health_result "frontend_status_code" "$status_code"
        set_health_result "frontend_response_time" "$response_time"
        HEALTH_SCORE=$((HEALTH_SCORE + 2))
        success "Frontend is accessible (${response_time}ms)"
        
        # Check if it's actually the React app
        local content=$(curl -s "http://$SERVER_HOST/" --max-time 5)
        if echo "$content" | grep -q "Say Goodbye"; then
            set_health_result "frontend_content" "valid"
            HEALTH_SCORE=$((HEALTH_SCORE + 1))
            success "Frontend content is valid"
        else
            set_health_result "frontend_content" "invalid"
            warning "Frontend content may be corrupted"
        fi
    else
        set_health_result "frontend_status" "unhealthy"
        set_health_result "frontend_status_code" "$status_code"
        set_health_result "frontend_response_time" "timeout"
        error "Frontend is not accessible (HTTP $status_code)"
    fi
}

# Check backend API health and endpoints
check_backend() {
    log "Checking backend API health..."
    
    # Check health endpoint
    local health_response=$(curl -s "http://$SERVER_HOST/api/health" --max-time 10)
    if echo "$health_response" | grep -q "healthy"; then
        HEALTH_RESULTS[api_health]="healthy"
        HEALTH_RESULTS[api_health_response]="$health_response"
        HEALTH_SCORE=$((HEALTH_SCORE + 2))
        success "Backend API health endpoint is responding"
        
        # Extract timestamp and environment from health response
        local api_env=$(echo "$health_response" | grep -o '"environment":"[^"]*"' | cut -d'"' -f4)
        local api_timestamp=$(echo "$health_response" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4)
        HEALTH_RESULTS[api_environment]="$api_env"
        HEALTH_RESULTS[api_timestamp]="$api_timestamp"
        
        if [ "$VERBOSE" = true ]; then
            log "API Environment: $api_env"
            log "API Timestamp: $api_timestamp"
        fi
    else
        HEALTH_RESULTS[api_health]="unhealthy"
        error "Backend API health endpoint is not responding"
    fi
    
    # Check authentication endpoints
    local auth_test=$(curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_HOST/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"test"}' \
        --max-time 10)
    
    if [ "$auth_test" = "400" ] || [ "$auth_test" = "401" ]; then
        HEALTH_RESULTS[api_auth]="responding"
        HEALTH_SCORE=$((HEALTH_SCORE + 1))
        success "Authentication endpoints are responding"
    else
        HEALTH_RESULTS[api_auth]="not_responding"
        warning "Authentication endpoints may have issues (HTTP $auth_test)"
    fi
}

# Check PM2 processes
check_pm2() {
    log "Checking PM2 processes..."
    
    local pm2_status=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "pm2 jlist 2>/dev/null" || echo "[]")
    
    if echo "$pm2_status" | grep -q '"status":"online"'; then
        local online_count=$(echo "$pm2_status" | grep -o '"status":"online"' | wc -l)
        HEALTH_RESULTS[pm2_status]="healthy"
        HEALTH_RESULTS[pm2_online_processes]="$online_count"
        HEALTH_SCORE=$((HEALTH_SCORE + 1))
        success "PM2 processes are running ($online_count online)"
        
        if [ "$VERBOSE" = true ]; then
            # Get memory and CPU usage
            local pm2_info=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "pm2 status 2>/dev/null" || echo "PM2 info unavailable")
            HEALTH_RESULTS[pm2_details]="$pm2_info"
        fi
    else
        HEALTH_RESULTS[pm2_status]="unhealthy"
        HEALTH_RESULTS[pm2_online_processes]="0"
        error "PM2 processes are not running properly"
    fi
}

# Check MongoDB
check_mongodb() {
    log "Checking MongoDB..."
    
    if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "systemctl is-active --quiet mongod"; then
        HEALTH_RESULTS[mongodb_status]="running"
        HEALTH_SCORE=$((HEALTH_SCORE + 1))
        success "MongoDB is running"
        
        # Test MongoDB connection
        local mongo_test=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
            cd $DEPLOY_PATH/backend
            timeout 5 node -e \"
                const mongoose = require('mongoose');
                require('dotenv').config();
                mongoose.connect(process.env.MONGODB_URI)
                  .then(() => { console.log('connected'); process.exit(0); })
                  .catch(() => { console.log('failed'); process.exit(1); });
            \" 2>/dev/null
        " || echo "failed")
        
        if [ "$mongo_test" = "connected" ]; then
            HEALTH_RESULTS[mongodb_connection]="connected"
            HEALTH_SCORE=$((HEALTH_SCORE + 1))
            success "MongoDB connection test passed"
        else
            HEALTH_RESULTS[mongodb_connection]="failed"
            warning "MongoDB connection test failed"
        fi
    else
        HEALTH_RESULTS[mongodb_status]="stopped"
        HEALTH_RESULTS[mongodb_connection]="failed"
        error "MongoDB is not running"
    fi
}

# Check nginx
check_nginx() {
    log "Checking nginx..."
    
    if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "systemctl is-active --quiet nginx"; then
        HEALTH_RESULTS[nginx_status]="running"
        HEALTH_SCORE=$((HEALTH_SCORE + 1))
        success "Nginx is running"
        
        # Test nginx configuration
        if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "sudo nginx -t >/dev/null 2>&1"; then
            HEALTH_RESULTS[nginx_config]="valid"
            success "Nginx configuration is valid"
        else
            HEALTH_RESULTS[nginx_config]="invalid"
            warning "Nginx configuration has issues"
        fi
    else
        HEALTH_RESULTS[nginx_status]="stopped"
        HEALTH_RESULTS[nginx_config]="unknown"
        error "Nginx is not running"
    fi
}

# Check system resources
check_system_resources() {
    log "Checking system resources..."
    
    # Get disk usage
    local disk_info=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "df -h / | tail -1")
    local disk_usage=$(echo "$disk_info" | awk '{print $5}' | sed 's/%//')
    local disk_available=$(echo "$disk_info" | awk '{print $4}')
    
    HEALTH_RESULTS[disk_usage_percent]="$disk_usage"
    HEALTH_RESULTS[disk_available]="$disk_available"
    
    if [ "$disk_usage" -lt 80 ]; then
        HEALTH_SCORE=$((HEALTH_SCORE + 1))
        success "Disk usage is healthy ($disk_usage%, $disk_available available)"
    else
        warning "Disk usage is high ($disk_usage%, $disk_available available)"
    fi
    
    # Get memory usage
    local memory_info=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "free -m | grep '^Mem:'")
    local memory_total=$(echo "$memory_info" | awk '{print $2}')
    local memory_used=$(echo "$memory_info" | awk '{print $3}')
    local memory_percent=$(( memory_used * 100 / memory_total ))
    
    HEALTH_RESULTS[memory_usage_percent]="$memory_percent"
    HEALTH_RESULTS[memory_total_mb]="$memory_total"
    HEALTH_RESULTS[memory_used_mb]="$memory_used"
    
    if [ "$memory_percent" -lt 80 ]; then
        success "Memory usage is healthy ($memory_percent%)"
    else
        warning "Memory usage is high ($memory_percent%)"
    fi
    
    if [ "$VERBOSE" = true ]; then
        log "Memory: ${memory_used}MB / ${memory_total}MB (${memory_percent}%)"
        log "Disk: $disk_usage% used, $disk_available available"
    fi
}

# Generate health report
generate_report() {
    local health_percentage=$(( HEALTH_SCORE * 100 / MAX_SCORE ))
    HEALTH_RESULTS[overall_health_score]="$HEALTH_SCORE"
    HEALTH_RESULTS[overall_health_percentage]="$health_percentage"
    HEALTH_RESULTS[timestamp]="$(date -Iseconds)"
    HEALTH_RESULTS[server_host]="$SERVER_HOST"
    
    if [ "$OUTPUT_JSON" = true ]; then
        # Output JSON report
        echo "{"
        local first=true
        for key in "${!HEALTH_RESULTS[@]}"; do
            if [ "$first" = true ]; then
                first=false
            else
                echo ","
            fi
            echo "  \"$key\": \"${HEALTH_RESULTS[$key]}\""
        done
        echo "}"
    else
        # Output human-readable report
        echo ""
        echo "================================================"
        echo "🏥 HEALTH MONITORING REPORT"
        echo "================================================"
        echo "Server: $SERVER_HOST"
        echo "Timestamp: $(date)"
        echo "Overall Health Score: $HEALTH_SCORE/$MAX_SCORE ($health_percentage%)"
        echo ""
        
        if [ "$health_percentage" -ge 80 ]; then
            echo -e "${GREEN}🎉 System Status: HEALTHY${NC}"
        elif [ "$health_percentage" -ge 60 ]; then
            echo -e "${YELLOW}⚠️ System Status: WARNING${NC}"
        else
            echo -e "${RED}🚨 System Status: CRITICAL${NC}"
        fi
        
        echo ""
        echo "Component Status:"
        echo "- Frontend: ${HEALTH_RESULTS[frontend_status]:-unknown}"
        echo "- Backend API: ${HEALTH_RESULTS[api_health]:-unknown}"
        echo "- PM2 Processes: ${HEALTH_RESULTS[pm2_status]:-unknown}"
        echo "- MongoDB: ${HEALTH_RESULTS[mongodb_status]:-unknown}"
        echo "- Nginx: ${HEALTH_RESULTS[nginx_status]:-unknown}"
        echo "- Disk Usage: ${HEALTH_RESULTS[disk_usage_percent]:-unknown}%"
        echo "- Memory Usage: ${HEALTH_RESULTS[memory_usage_percent]:-unknown}%"
        echo "================================================"
    fi
    
    # Send alerts if enabled and health is critical
    if [ "$SEND_ALERTS" = true ] && [ "$health_percentage" -lt 60 ]; then
        send_alert "$health_percentage"
    fi
    
    # Return appropriate exit code
    if [ "$health_percentage" -ge 80 ]; then
        exit 0
    elif [ "$health_percentage" -ge 60 ]; then
        exit 1
    else
        exit 2
    fi
}

# Send alert (placeholder for integration with monitoring services)
send_alert() {
    local health_percentage=$1
    log "🚨 ALERT: System health is critical ($health_percentage%)"
    
    # TODO: Integrate with your monitoring service
    # Examples:
    # - Send to Slack webhook
    # - Send email notification
    # - Send to PagerDuty
    # - Send to Discord webhook
    
    # Example Slack webhook (uncomment and configure):
    # curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"🚨 Say Goodbye POA App Alert: System health is critical ($health_percentage%) on $SERVER_HOST\"}" \
    #   $SLACK_WEBHOOK_URL
}

# Main execution
main() {
    if [ "$OUTPUT_JSON" = false ]; then
        echo "🏥 Starting comprehensive health check for Say Goodbye POA App..."
        echo "Server: $SERVER_HOST"
        echo ""
    fi
    
    check_frontend
    check_backend
    check_pm2
    check_mongodb
    check_nginx
    check_system_resources
    
    generate_report
}

main "$@"
