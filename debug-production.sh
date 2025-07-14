#!/bin/bash

# Production Debug Test Runner
# Comprehensive testing to identify and fix production issues

set -e

echo "=============================================="
echo "Say Goodbye POA App - Production Debug Suite"
echo "=============================================="

# Configuration
PROJECT_DIR="/Users/ssoward/saygoodbye"
RESULTS_DIR="$PROJECT_DIR/test-results/production-debug"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BASE_URL="http://34.235.117.235"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}Production Debug Configuration:${NC}"
echo "Project Directory: $PROJECT_DIR"
echo "Results Directory: $RESULTS_DIR"
echo "Target URL: $BASE_URL"
echo "Timestamp: $TIMESTAMP"
echo ""

# Check production health first
echo -e "${BLUE}Checking Production Health...${NC}"
if curl -s "$BASE_URL" > /dev/null; then
    echo -e "${GREEN}✅ Production server is responding${NC}"
    
    # Check API health
    API_HEALTH=$(curl -s "$BASE_URL/api/health" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "ERROR")
    if [ "$API_HEALTH" = "healthy" ]; then
        echo -e "${GREEN}✅ API is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  API health check returned: $API_HEALTH${NC}"
    fi
else
    echo -e "${RED}❌ Production server is not responding${NC}"
    echo "Please ensure the production server is running at $BASE_URL"
    exit 1
fi

echo ""

# Create a temporary Playwright config for production debugging
cat > playwright.debug.config.js << EOF
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/production-debug.spec.js',
  timeout: 120000, // 2 minutes for debugging
  expect: {
    timeout: 30000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [
    ['html', { outputFolder: '$RESULTS_DIR/html-report', open: 'never' }],
    ['json', { outputFile: '$RESULTS_DIR/debug-results-$TIMESTAMP.json' }],
    ['line'],
    ['junit', { outputFile: '$RESULTS_DIR/debug-junit-$TIMESTAMP.xml' }]
  ],
  use: {
    baseURL: '$BASE_URL',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: true,
    viewport: { width: 1280, height: 720 }
  },
  projects: [
    {
      name: 'Production Debug Chrome',
      use: { 
        ...require('@playwright/test').devices['Desktop Chrome'],
        contextOptions: {
          recordHar: { path: '$RESULTS_DIR/network-$TIMESTAMP.har' }
        }
      },
    },
  ],
  outputDir: '$RESULTS_DIR/test-artifacts'
});
EOF

echo -e "${BLUE}Available Debug Test Modes:${NC}"
echo "1. 🔍 Debug Specific Error (documents/undefined issue)"
echo "2. 🚨 Critical Error Detection (500 errors, console errors)"
echo "3. 🔄 User Flow Validation (login, navigation, state)"
echo "4. 🌐 API Endpoint Testing (all endpoints)"
echo "5. ⚡ Performance Analysis (slow requests, memory)"
echo "6. 🛡️  Security & Error Handling (invalid routes)"
echo "7. 📊 Full Production Audit (all tests)"

# Get test mode
MODE=${1:-1}

echo ""
case $MODE in
    1)
        echo -e "${PURPLE}🔍 Running Specific Error Debug...${NC}"
        TEST_FILTER="--grep 'debug the /documents/undefined error specifically'"
        ;;
    2)
        echo -e "${PURPLE}🚨 Running Critical Error Detection...${NC}"
        TEST_FILTER="--grep 'API Error Detection'"
        ;;
    3)
        echo -e "${PURPLE}🔄 Running User Flow Validation...${NC}"
        TEST_FILTER="--grep 'Critical User Flow Validation'"
        ;;
    4)
        echo -e "${PURPLE}🌐 Running API Endpoint Testing...${NC}"
        TEST_FILTER="--grep 'should check all API endpoints'"
        ;;
    5)
        echo -e "${PURPLE}⚡ Running Performance Analysis...${NC}"
        TEST_FILTER="--grep 'Performance and Resource Monitoring'"
        ;;
    6)
        echo -e "${PURPLE}🛡️  Running Security & Error Handling...${NC}"
        TEST_FILTER="--grep 'Security and Error Handling'"
        ;;
    7)
        echo -e "${PURPLE}📊 Running Full Production Audit...${NC}"
        TEST_FILTER=""
        ;;
    *)
        echo -e "${YELLOW}Invalid mode. Running specific error debug.${NC}"
        TEST_FILTER="--grep 'debug the /documents/undefined error specifically'"
        ;;
esac

echo ""
echo -e "${BLUE}Starting Production Debug Tests...${NC}"
echo "Timestamp: $TIMESTAMP"
echo "Mode: $MODE"
echo ""

# Execute the tests
START_TIME=$(date +%s)

cd "$PROJECT_DIR"

if npx playwright test --config=playwright.debug.config.js $TEST_FILTER; then
    TEST_STATUS="PASSED"
    echo -e "${GREEN}✅ Debug tests completed successfully${NC}"
else
    TEST_STATUS="FAILED"
    echo -e "${RED}❌ Issues detected in production${NC}"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Analyzing Results...${NC}"

# Extract key findings from test results
JSON_REPORT="$RESULTS_DIR/debug-results-$TIMESTAMP.json"
SUMMARY_FILE="$RESULTS_DIR/production-summary-$TIMESTAMP.md"

# Create comprehensive summary report
cat > "$SUMMARY_FILE" << EOF
# Production Debug Report

**Generated:** $(date)  
**Duration:** ${DURATION}s  
**Status:** $TEST_STATUS  
**Mode:** $MODE  

## Executive Summary

This report analyzes the production environment of the Say Goodbye POA App to identify and resolve critical issues.

### 🎯 Primary Issue Investigation

**Error Detected:** \`/documents/undefined\` - 500 Internal Server Error

**Impact:** Frontend attempting to fetch document with undefined ID
**Root Cause:** Likely React state management or routing issue
**Severity:** HIGH - Breaks user experience

### 📊 Test Results

EOF

# Parse test results if available
if [ -f "$JSON_REPORT" ]; then
    # Extract test metrics (requires jq if available)
    if command -v jq > /dev/null; then
        TOTAL_TESTS=$(jq '.stats.tests // 0' "$JSON_REPORT")
        PASSED_TESTS=$(jq '.stats.expected // 0' "$JSON_REPORT")
        FAILED_TESTS=$(jq '.stats.unexpected // 0' "$JSON_REPORT")
        
        cat >> "$SUMMARY_FILE" << EOF
- **Total Tests:** $TOTAL_TESTS
- **Passed:** $PASSED_TESTS
- **Failed:** $FAILED_TESTS
- **Success Rate:** $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%

EOF
    fi
fi

cat >> "$SUMMARY_FILE" << EOF
### 🔍 Specific Findings

1. **JavaScript Errors:**
   - Monitor console for AxiosError with /documents/undefined
   - Check React component state management
   - Validate URL parameter handling

2. **API Endpoints:**
   - Backend health: $API_HEALTH
   - Check for undefined parameter validation
   - Verify route parameter extraction

3. **Frontend Issues:**
   - Potential React Router issue with document IDs
   - Possible state management problem in document components
   - Check useParams() or useState() implementation

### 🛠️ Recommended Actions

#### Immediate Fixes (Priority 1)
1. **Add null/undefined checks** in document fetching code
2. **Validate route parameters** before API calls
3. **Add error boundaries** around document components

#### Code Review Areas
\`\`\`javascript
// Check these patterns in the codebase:
useEffect(() => {
  if (documentId) {  // Add this check!
    fetchDocument(documentId);
  }
}, [documentId]);

// Instead of:
fetch(\`/api/documents/\${documentId}\`)  // if documentId is undefined

// Use:
if (documentId && documentId !== 'undefined') {
  fetch(\`/api/documents/\${documentId}\`)
}
\`\`\`

#### Backend Validation
\`\`\`javascript
// Add parameter validation:
app.get('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  if (!id || id === 'undefined') {
    return res.status(400).json({ error: 'Invalid document ID' });
  }
  // ... rest of handler
});
\`\`\`

### 📁 Generated Files

- **HTML Report:** $RESULTS_DIR/html-report/index.html
- **JSON Results:** $JSON_REPORT
- **Network HAR:** $RESULTS_DIR/network-$TIMESTAMP.har
- **Test Artifacts:** $RESULTS_DIR/test-artifacts/
- **This Summary:** $SUMMARY_FILE

### 🔄 Next Steps

1. **Review HTML report** for detailed error traces
2. **Examine network HAR file** for request patterns
3. **Implement recommended fixes** in frontend and backend
4. **Re-run tests** to verify fixes

### 📞 Support Information

For immediate assistance with production issues:
- Review the HTML report at: $RESULTS_DIR/html-report/index.html
- Check network traces in: $RESULTS_DIR/network-$TIMESTAMP.har
- Run health check: \`./health-check-quick.sh\`

---
*Report generated by Production Debug Suite v1.0*
EOF

echo -e "${GREEN}📋 Summary Report Generated:${NC} $SUMMARY_FILE"
echo ""

# Display key findings
echo -e "${BLUE}🔍 Key Findings:${NC}"
if [ "$TEST_STATUS" = "FAILED" ]; then
    echo -e "${RED}❌ Issues detected in production environment${NC}"
    echo -e "${YELLOW}📊 Primary Issue: /documents/undefined API error${NC}"
    echo -e "${YELLOW}🔧 Action Required: Fix frontend state management${NC}"
else
    echo -e "${GREEN}✅ No critical issues detected${NC}"
fi

echo ""
echo -e "${BLUE}📁 Generated Files:${NC}"
echo "HTML Report: $RESULTS_DIR/html-report/index.html"
echo "JSON Results: $JSON_REPORT"
echo "Network Trace: $RESULTS_DIR/network-$TIMESTAMP.har"
echo "Summary Report: $SUMMARY_FILE"

# Show how to view the report
echo ""
echo -e "${GREEN}🔍 To view detailed results:${NC}"
echo "npx playwright show-report $RESULTS_DIR/html-report"

# Cleanup temporary config
rm -f playwright.debug.config.js

echo ""
if [ "$TEST_STATUS" = "PASSED" ]; then
    echo -e "${GREEN}🎉 Production debug tests completed successfully!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Production issues detected. Check the reports for details.${NC}"
    exit 1
fi
