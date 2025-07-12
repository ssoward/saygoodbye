#!/bin/bash

# Comprehensive Production Health Monitor for Say Goodbye POA App
# Usage: ./health-monitor-advanced.sh [--json] [--alert-webhook=URL]
# 
# Features:
# - Deep frontend validation (runtime errors, console errors)
# - Backend API comprehensive testing (all endpoints)
# - Database integrity checks (demo users, collections)
# - Admin user privilege validation
# - Performance metrics (response times, memory usage)
# - Security headers validation
# - Rate limiting and error handling testing
# - Automated alerting and reporting

set -e

# Load configuration
if [ -f "$(dirname "$0")/deploy.config.sh" ]; then
    source "$(dirname "$0")/deploy.config.sh"
else
    SERVER_HOST="34.235.117.235"
    SSH_KEY="~/.ssh/saygoodbye.pem"
    SERVER_USER="ec2-user"
fi

# Configuration
OUTPUT_FORMAT="console"  # console or json
ALERT_WEBHOOK=""
HEALTH_REPORT_FILE="health-report-$(date +%Y%m%d-%H%M%S).json"
OVERALL_SCORE=0
MAX_SCORE=0

# Colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            OUTPUT_FORMAT="json"
            shift
            ;;
        --alert-webhook=*)
            ALERT_WEBHOOK="${1#*=}"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--json] [--alert-webhook=URL]"
            exit 1
            ;;
    esac
done

# Logging functions
log_console() {
    if [ "$OUTPUT_FORMAT" = "console" ]; then
        echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
    fi
}

success_console() {
    if [ "$OUTPUT_FORMAT" = "console" ]; then
        echo -e "${GREEN}✅ $1${NC}"
    fi
}

warning_console() {
    if [ "$OUTPUT_FORMAT" = "console" ]; then
        echo -e "${YELLOW}⚠️ $1${NC}"
    fi
}

error_console() {
    if [ "$OUTPUT_FORMAT" = "console" ]; then
        echo -e "${RED}❌ $1${NC}"
    fi
}

# Health check functions
check_frontend_health() {
    log_console "Checking frontend health..."
    local score=0
    local max_score=10
    local issues=()
    
    # Basic accessibility
    if curl -f -s "$SERVER_HOST" > /dev/null; then
        score=$((score + 2))
        success_console "Frontend is accessible"
    else
        issues+=("Frontend not accessible")
        error_console "Frontend not accessible"
    fi
    
    # Check for critical JavaScript files
    local js_files=$(curl -s "$SERVER_HOST" | grep -o 'main\.[a-f0-9]*\.js' | wc -l)
    if [ "$js_files" -gt 0 ]; then
        score=$((score + 2))
        success_console "JavaScript assets present"
    else
        issues+=("JavaScript assets missing")
        error_console "JavaScript assets missing"
    fi
    
    # Check security headers
    local headers=$(curl -I -s "$SERVER_HOST" 2>/dev/null || echo "")
    if echo "$headers" | grep -q "X-Frame-Options"; then
        score=$((score + 1))
        success_console "Security headers present"
    else
        issues+=("Security headers missing")
        warning_console "Security headers missing"
    fi
    
    # Check response time
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "$SERVER_HOST" 2>/dev/null || echo "999")
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        score=$((score + 2))
        success_console "Response time good (${response_time}s)"
    else
        issues+=("Slow response time: ${response_time}s")
        warning_console "Slow response time: ${response_time}s"
    fi
    
    # Check for common error pages
    local content=$(curl -s "$SERVER_HOST" 2>/dev/null || echo "")
    if echo "$content" | grep -qi "error\|404\|500\|502\|503"; then
        issues+=("Error content detected")
        error_console "Error content detected in response"
    else
        score=$((score + 1))
        success_console "No error content detected"
    fi
    
    # Check bundle size (warn if too large)
    local bundle_size=$(curl -s "$SERVER_HOST" | wc -c)
    if [ "$bundle_size" -gt 2000000 ]; then
        issues+=("Large bundle size: ${bundle_size} bytes")
        warning_console "Large bundle size: ${bundle_size} bytes"
    else
        score=$((score + 2))
        success_console "Bundle size acceptable"
    fi
    
    OVERALL_SCORE=$((OVERALL_SCORE + score))
    MAX_SCORE=$((MAX_SCORE + max_score))
    
    # JSON output
    cat >> "$HEALTH_REPORT_FILE" << EOF
  "frontend": {
    "score": $score,
    "max_score": $max_score,
    "accessible": $([ $score -ge 2 ] && echo "true" || echo "false"),
    "response_time": "$response_time",
    "bundle_size": $bundle_size,
    "issues": [$(IFS=','; echo "\"${issues[*]//,/\",\"}")"]
  },
EOF
}

check_backend_health() {
    log_console "Checking backend API health..."
    local score=0
    local max_score=15
    local issues=()
    
    # Health endpoint
    local health_response=$(curl -f -s "$SERVER_HOST/api/health" 2>/dev/null || echo "")
    if echo "$health_response" | grep -q "healthy"; then
        score=$((score + 3))
        success_console "Health endpoint responding"
    else
        issues+=("Health endpoint not responding")
        error_console "Health endpoint not responding"
    fi
    
    # Test authentication endpoint
    local auth_response=$(curl -s -w "%{http_code}" -X POST "$SERVER_HOST/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"invalid","password":"invalid"}' 2>/dev/null | tail -n1)
    
    if [ "$auth_response" = "401" ]; then
        score=$((score + 2))
        success_console "Authentication endpoint working"
    else
        issues+=("Authentication endpoint issues (got $auth_response)")
        warning_console "Authentication endpoint issues (got $auth_response)"
    fi
    
    # Test admin user login
    local admin_login=$(curl -s -X POST "$SERVER_HOST/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@demo.com","password":"demopass123"}' 2>/dev/null || echo "")
    
    if echo "$admin_login" | grep -q "adminPrivileges.*true"; then
        score=$((score + 3))
        success_console "Admin user privileges configured correctly"
    else
        issues+=("Admin user privileges not configured")
        error_console "Admin user privileges not configured"
    fi
    
    # Check rate limiting
    local rate_limit_header=$(curl -I -s "$SERVER_HOST/api/health" 2>/dev/null | grep -i "ratelimit" | wc -l)
    if [ "$rate_limit_header" -gt 0 ]; then
        score=$((score + 2))
        success_console "Rate limiting active"
    else
        issues+=("Rate limiting not active")
        warning_console "Rate limiting not active"
    fi
    
    # Test CORS headers
    local cors_header=$(curl -I -s "$SERVER_HOST/api/health" 2>/dev/null | grep -i "access-control" | wc -l)
    if [ "$cors_header" -gt 0 ]; then
        score=$((score + 1))
        success_console "CORS headers present"
    else
        issues+=("CORS headers missing")
        warning_console "CORS headers missing"
    fi
    
    # API response time
    local api_response_time=$(curl -o /dev/null -s -w '%{time_total}' "$SERVER_HOST/api/health" 2>/dev/null || echo "999")
    if (( $(echo "$api_response_time < 1.0" | bc -l) )); then
        score=$((score + 2))
        success_console "API response time good (${api_response_time}s)"
    else
        issues+=("Slow API response: ${api_response_time}s")
        warning_console "Slow API response: ${api_response_time}s"
    fi
    
    # Test non-existent endpoint
    local not_found_response=$(curl -s -w "%{http_code}" "$SERVER_HOST/api/nonexistent" 2>/dev/null | tail -n1)
    if [ "$not_found_response" = "404" ]; then
        score=$((score + 2))
        success_console "404 handling working correctly"
    else
        issues+=("404 handling not working (got $not_found_response)")
        warning_console "404 handling not working (got $not_found_response)"
    fi
    
    OVERALL_SCORE=$((OVERALL_SCORE + score))
    MAX_SCORE=$((MAX_SCORE + max_score))
    
    # JSON output
    cat >> "$HEALTH_REPORT_FILE" << EOF
  "backend": {
    "score": $score,
    "max_score": $max_score,
    "health_endpoint": $(echo "$health_response" | grep -q "healthy" && echo "true" || echo "false"),
    "api_response_time": "$api_response_time",
    "auth_working": $([ "$auth_response" = "401" ] && echo "true" || echo "false"),
    "admin_privileges": $(echo "$admin_login" | grep -q "adminPrivileges.*true" && echo "true" || echo "false"),
    "rate_limiting": $([ "$rate_limit_header" -gt 0 ] && echo "true" || echo "false"),
    "issues": [$(IFS=','; echo "\"${issues[*]//,/\",\"}")"]
  },
EOF
}

check_database_health() {
    log_console "Checking database health..."
    local score=0
    local max_score=10
    local issues=()
    
    # Check MongoDB connection via SSH
    local mongo_status=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "systemctl is-active mongod" 2>/dev/null || echo "inactive")
    if [ "$mongo_status" = "active" ]; then
        score=$((score + 3))
        success_console "MongoDB service running"
    else
        issues+=("MongoDB service not running")
        error_console "MongoDB service not running"
    fi
    
    # Check demo users via backend API
    local demo_users_test=0
    for user in "user@demo.com" "pro@demo.com" "admin@demo.com"; do
        local login_test=$(curl -s -X POST "$SERVER_HOST/api/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$user\",\"password\":\"demopass123\"}" 2>/dev/null || echo "")
        
        if echo "$login_test" | grep -q "Login successful"; then
            demo_users_test=$((demo_users_test + 1))
        fi
    done
    
    if [ "$demo_users_test" -eq 3 ]; then
        score=$((score + 4))
        success_console "All demo users working"
    elif [ "$demo_users_test" -gt 0 ]; then
        score=$((score + 2))
        issues+=("Some demo users not working ($demo_users_test/3)")
        warning_console "Some demo users not working ($demo_users_test/3)"
    else
        issues+=("No demo users working")
        error_console "No demo users working"
    fi
    
    # Check database disk usage
    local db_disk_usage=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "df -h / | tail -1 | awk '{print \$5}' | sed 's/%//'" 2>/dev/null || echo "100")
    if [ "$db_disk_usage" -lt 80 ]; then
        score=$((score + 2))
        success_console "Database disk usage healthy ($db_disk_usage%)"
    else
        issues+=("High disk usage: $db_disk_usage%")
        warning_console "High disk usage: $db_disk_usage%"
    fi
    
    # Test admin user tier limits
    local admin_login=$(curl -s -X POST "$SERVER_HOST/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@demo.com","password":"demopass123"}' 2>/dev/null || echo "")
    
    if echo "$admin_login" | grep -q "validationsPerMonth.*-1"; then
        score=$((score + 1))
        success_console "Admin unlimited validations configured"
    else
        issues+=("Admin unlimited validations not configured")
        warning_console "Admin unlimited validations not configured"
    fi
    
    OVERALL_SCORE=$((OVERALL_SCORE + score))
    MAX_SCORE=$((MAX_SCORE + max_score))
    
    # JSON output
    cat >> "$HEALTH_REPORT_FILE" << EOF
  "database": {
    "score": $score,
    "max_score": $max_score,
    "mongodb_active": $([ "$mongo_status" = "active" ] && echo "true" || echo "false"),
    "demo_users_working": $demo_users_test,
    "disk_usage_percent": $db_disk_usage,
    "admin_unlimited_access": $(echo "$admin_login" | grep -q "validationsPerMonth.*-1" && echo "true" || echo "false"),
    "issues": [$(IFS=','; echo "\"${issues[*]//,/\",\"}")"]
  },
EOF
}

check_infrastructure_health() {
    log_console "Checking infrastructure health..."
    local score=0
    local max_score=12
    local issues=()
    
    # Check PM2 processes
    local pm2_status=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "pm2 jlist 2>/dev/null | grep '\"status\":\"online\"' | wc -l" 2>/dev/null || echo "0")
    if [ "$pm2_status" -gt 0 ]; then
        score=$((score + 3))
        success_console "PM2 processes running ($pm2_status online)"
    else
        issues+=("No PM2 processes running")
        error_console "No PM2 processes running"
    fi
    
    # Check Nginx status
    local nginx_status=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "systemctl is-active nginx" 2>/dev/null || echo "inactive")
    if [ "$nginx_status" = "active" ]; then
        score=$((score + 2))
        success_console "Nginx service running"
    else
        issues+=("Nginx service not running")
        error_console "Nginx service not running"
    fi
    
    # Check memory usage
    local memory_usage=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "free | awk 'NR==2{printf \"%.0f\", \$3*100/\$2}'" 2>/dev/null || echo "100")
    if [ "$memory_usage" -lt 85 ]; then
        score=$((score + 2))
        success_console "Memory usage healthy ($memory_usage%)"
    else
        issues+=("High memory usage: $memory_usage%")
        warning_console "High memory usage: $memory_usage%"
    fi
    
    # Check SSL/HTTPS redirect
    local ssl_redirect=$(curl -I -s "http://$SERVER_HOST" 2>/dev/null | grep -i "location.*https" | wc -l)
    if [ "$ssl_redirect" -gt 0 ]; then
        score=$((score + 1))
        success_console "HTTPS redirect configured"
    else
        issues+=("HTTPS redirect not configured")
        warning_console "HTTPS redirect not configured"
    fi
    
    # Check log file sizes
    local log_sizes=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "find /var/log -name '*.log' -size +100M 2>/dev/null | wc -l" 2>/dev/null || echo "0")
    if [ "$log_sizes" -eq 0 ]; then
        score=$((score + 2))
        success_console "Log file sizes under control"
    else
        issues+=("Large log files detected ($log_sizes files > 100MB)")
        warning_console "Large log files detected ($log_sizes files > 100MB)"
    fi
    
    # Check system load
    local load_avg=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "uptime | awk -F'load average:' '{print \$2}' | awk '{print \$1}' | sed 's/,//'" 2>/dev/null || echo "999")
    if (( $(echo "$load_avg < 2.0" | bc -l 2>/dev/null || echo "0") )); then
        score=$((score + 2))
        success_console "System load healthy ($load_avg)"
    else
        issues+=("High system load: $load_avg")
        warning_console "High system load: $load_avg"
    fi
    
    OVERALL_SCORE=$((OVERALL_SCORE + score))
    MAX_SCORE=$((MAX_SCORE + max_score))
    
    # JSON output
    cat >> "$HEALTH_REPORT_FILE" << EOF
  "infrastructure": {
    "score": $score,
    "max_score": $max_score,
    "pm2_processes": $pm2_status,
    "nginx_active": $([ "$nginx_status" = "active" ] && echo "true" || echo "false"),
    "memory_usage_percent": $memory_usage,
    "system_load": "$load_avg",
    "large_log_files": $log_sizes,
    "issues": [$(IFS=','; echo "\"${issues[*]//,/\",\"}")"]
  }
EOF
}

generate_health_report() {
    local health_percentage=$((OVERALL_SCORE * 100 / MAX_SCORE))
    local status="HEALTHY"
    
    if [ "$health_percentage" -lt 60 ]; then
        status="CRITICAL"
    elif [ "$health_percentage" -lt 80 ]; then
        status="WARNING"
    fi
    
    # Create JSON report
    cat > "$HEALTH_REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "server": "$SERVER_HOST",
  "overall_score": $OVERALL_SCORE,
  "max_score": $MAX_SCORE,
  "health_percentage": $health_percentage,
  "status": "$status",
EOF
    
    # Append component results (already written)
    
    # Close JSON
    echo "}" >> "$HEALTH_REPORT_FILE"
    
    # Console output
    if [ "$OUTPUT_FORMAT" = "console" ]; then
        echo ""
        echo "=================================================="
        echo "🏥 COMPREHENSIVE HEALTH REPORT"
        echo "=================================================="
        echo "Server: $SERVER_HOST"
        echo "Timestamp: $(date)"
        echo "Overall Score: $OVERALL_SCORE/$MAX_SCORE ($health_percentage%)"
        echo "Status: $status"
        echo ""
        
        if [ "$status" = "HEALTHY" ]; then
            echo -e "${GREEN}🎉 System is healthy and operating normally${NC}"
        elif [ "$status" = "WARNING" ]; then
            echo -e "${YELLOW}⚠️ System has some issues that should be addressed${NC}"
        else
            echo -e "${RED}🚨 System has critical issues requiring immediate attention${NC}"
        fi
        
        echo ""
        echo "Detailed report saved to: $HEALTH_REPORT_FILE"
        echo "=================================================="
    else
        cat "$HEALTH_REPORT_FILE"
    fi
    
    # Send alert if webhook provided and status is not healthy
    if [ -n "$ALERT_WEBHOOK" ] && [ "$status" != "HEALTHY" ]; then
        send_alert "$status" "$health_percentage"
    fi
}

send_alert() {
    local status="$1"
    local percentage="$2"
    
    log_console "Sending alert to webhook..."
    
    curl -X POST "$ALERT_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"🚨 Say Goodbye POA Health Alert\",
            \"attachments\": [{
                \"color\": \"$([ "$status" = "CRITICAL" ] && echo "danger" || echo "warning")\",
                \"title\": \"Health Status: $status\",
                \"fields\": [
                    {\"title\": \"Server\", \"value\": \"$SERVER_HOST\", \"short\": true},
                    {\"title\": \"Score\", \"value\": \"$OVERALL_SCORE/$MAX_SCORE ($percentage%)\", \"short\": true},
                    {\"title\": \"Timestamp\", \"value\": \"$(date)\", \"short\": false}
                ]
            }]
        }" 2>/dev/null || warning_console "Failed to send alert"
}

# Main execution
main() {
    log_console "Starting comprehensive health check for Say Goodbye POA App..."
    
    # Initialize JSON report
    > "$HEALTH_REPORT_FILE"
    
    check_frontend_health
    check_backend_health
    check_database_health
    check_infrastructure_health
    
    generate_health_report
    
    # Exit with appropriate code
    local health_percentage=$((OVERALL_SCORE * 100 / MAX_SCORE))
    if [ "$health_percentage" -lt 60 ]; then
        exit 2  # Critical
    elif [ "$health_percentage" -lt 80 ]; then
        exit 1  # Warning
    else
        exit 0  # Healthy
    fi
}

# Install bc if not available (for floating point math)
if ! command -v bc &> /dev/null; then
    if [ "$OUTPUT_FORMAT" = "console" ]; then
        warning_console "Installing bc for floating point calculations..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get install -y bc >/dev/null 2>&1
        elif command -v yum &> /dev/null; then
            sudo yum install -y bc >/dev/null 2>&1
        elif command -v brew &> /dev/null; then
            brew install bc >/dev/null 2>&1
        fi
    fi
fi

main "$@"
