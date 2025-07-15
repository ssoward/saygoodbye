#!/bin/bash

# POA Test Document Runner
# Comprehensive testing script for Say Goodbye POA App

set -e

echo "=========================================="
echo "Say Goodbye POA App - Document Test Suite"
echo "=========================================="

# Configuration
PROJECT_DIR="/Users/ssoward/saygoodbye"
TEST_DOCS_DIR="$PROJECT_DIR/test-docs"
RESULTS_DIR="$PROJECT_DIR/test-results/poa-documents"
BASE_URL="${TEST_BASE_URL:-http://localhost:3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}Test Configuration:${NC}"
echo "Project Directory: $PROJECT_DIR"
echo "Test Documents: $TEST_DOCS_DIR"
echo "Results Directory: $RESULTS_DIR"
echo "Target URL: $BASE_URL"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking Prerequisites...${NC}"

# Check if test documents exist
if [ ! -d "$TEST_DOCS_DIR" ]; then
    echo -e "${RED}❌ Test documents directory not found${NC}"
    echo "Run: node generate-test-pdfs.js"
    exit 1
fi

# Count test documents
VALID_COUNT=$(ls -1 "$TEST_DOCS_DIR"/V*.pdf 2>/dev/null | wc -l || echo 0)
INVALID_COUNT=$(ls -1 "$TEST_DOCS_DIR"/I*.pdf 2>/dev/null | wc -l || echo 0)
TOTAL_COUNT=$((VALID_COUNT + INVALID_COUNT))

echo -e "${GREEN}✅ Found $TOTAL_COUNT test documents ($VALID_COUNT valid, $INVALID_COUNT invalid)${NC}"

# Check if production is healthy
echo -e "${BLUE}Checking Production Health...${NC}"
if curl -s "$BASE_URL" > /dev/null; then
    echo -e "${GREEN}✅ Production server is responding${NC}"
else
    echo -e "${RED}❌ Production server is not responding${NC}"
    echo "Please ensure the production server is running at $BASE_URL"
    exit 1
fi

# Check Playwright installation
if ! npm list @playwright/test > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Installing Playwright...${NC}"
    npm install @playwright/test --save-dev
    npx playwright install
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# Test execution options
echo -e "${BLUE}Available Test Modes:${NC}"
echo "1. Quick Test (5 documents)"
echo "2. Full Test Suite (all 25 documents)"
echo "3. Valid Documents Only (13 documents)"
echo "4. Invalid Documents Only (12 documents)"
echo "5. Performance Tests"
echo "6. Security Tests"
echo "7. Batch Processing Tests"
echo "8. Custom Selection"

# Default to full test if no argument provided
MODE=${1:-2}

case $MODE in
    1)
        echo -e "${YELLOW}Running Quick Test (login and basic upload)...${NC}"
        TEST_FILTER="--grep 'should login as admin and access dashboard'"
        ;;
    2)
        echo -e "${YELLOW}Running Full Test Suite (all tests)...${NC}"
        TEST_FILTER=""
        ;;
    3)
        echo -e "${YELLOW}Running Valid Documents Only...${NC}"
        TEST_FILTER="--grep 'Admin User'"
        ;;
    4)
        echo -e "${YELLOW}Running Invalid Documents Only...${NC}"
        TEST_FILTER="--grep 'Error Handling'"
        ;;
    5)
        echo -e "${YELLOW}Running Performance Tests...${NC}"
        TEST_FILTER="--grep 'Performance and Reliability'"
        ;;
    6)
        echo -e "${YELLOW}Running Security Tests...${NC}"
        TEST_FILTER="--grep 'Demo User'"
        ;;
    7)
        echo -e "${YELLOW}Running Batch Processing Tests...${NC}"
        TEST_FILTER="--grep 'multiple document uploads'"
        ;;
    8)
        echo "Enter custom grep pattern:"
        read -r CUSTOM_PATTERN
        TEST_FILTER="--grep '$CUSTOM_PATTERN'"
        ;;
    *)
        echo -e "${RED}Invalid mode. Using full test suite.${NC}"
        TEST_FILTER=""
        ;;
esac

# Generate timestamp for this test run
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
REPORT_FILE="$RESULTS_DIR/html-report/index.html"

echo ""
echo -e "${BLUE}Starting Test Execution...${NC}"
echo "Timestamp: $TIMESTAMP"
echo "Report will be saved to: $REPORT_FILE"
echo ""

# Run Playwright tests
cd "$PROJECT_DIR"

# Create a temporary Playwright config for POA tests
cat > playwright.poa.config.js << EOF
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/poa-documents.spec.js',
  timeout: 60000,
  expect: {
    timeout: 15000
  },
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for POA tests
  reporter: [
    ['html', { outputFolder: '$RESULTS_DIR/html-report' }],
    ['json', { outputFile: '$RESULTS_DIR/poa-results-$TIMESTAMP.json' }],
    ['line']
  ],
  use: {
    baseURL: '$BASE_URL',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true
  },
  projects: [
    {
      name: 'POA Document Tests',
      use: { 
        ...require('@playwright/test').devices['Desktop Chrome']
      },
    },
  ],
  outputDir: '$RESULTS_DIR/playwright-output'
});
EOF

# Execute the tests
echo -e "${BLUE}Executing Playwright tests...${NC}"
START_TIME=$(date +%s)

# Run tests based on mode
case $MODE in
    1)
        # Quick test - just login test
        if npx playwright test --config=playwright.poa.config.js --grep "should login as admin and access dashboard" --project="POA Document Tests"; then
            TEST_STATUS="PASSED"
        else
            TEST_STATUS="FAILED"
        fi
        ;;
    2)
        # Full test suite
        if npx playwright test --config=playwright.poa.config.js; then
            TEST_STATUS="PASSED"
        else
            TEST_STATUS="FAILED"
        fi
        ;;
    3)
        # Admin user tests
        if npx playwright test --config=playwright.poa.config.js --grep "Admin User" --project="POA Document Tests"; then
            TEST_STATUS="PASSED"
        else
            TEST_STATUS="FAILED"
        fi
        ;;
    4)
        # Error handling tests
        if npx playwright test --config=playwright.poa.config.js --grep "Error Handling" --project="POA Document Tests"; then
            TEST_STATUS="PASSED"
        else
            TEST_STATUS="FAILED"
        fi
        ;;
    5)
        # Performance tests
        if npx playwright test --config=playwright.poa.config.js --grep "Performance and Reliability" --project="POA Document Tests"; then
            TEST_STATUS="PASSED"
        else
            TEST_STATUS="FAILED"
        fi
        ;;
    6)
        # Security tests
        if npx playwright test --config=playwright.poa.config.js --grep "Demo User" --project="POA Document Tests"; then
            TEST_STATUS="PASSED"
        else
            TEST_STATUS="FAILED"
        fi
        ;;
    7)
        # Batch processing tests
        if npx playwright test --config=playwright.poa.config.js --grep "multiple document uploads" --project="POA Document Tests"; then
            TEST_STATUS="PASSED"
        else
            TEST_STATUS="FAILED"
        fi
        ;;
    *)
        # Default - full test
        if npx playwright test --config=playwright.poa.config.js; then
            TEST_STATUS="PASSED"
        else
            TEST_STATUS="FAILED"
        fi
        ;;
esac

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
if [ "$TEST_STATUS" = "PASSED" ]; then
    echo -e "${GREEN}✅ Tests completed successfully in ${DURATION}s${NC}"
else
    echo -e "${RED}❌ Some tests failed (duration: ${DURATION}s)${NC}"
fi

# Generate summary report
echo ""
echo -e "${BLUE}Generating Summary Report...${NC}"

# Parse test results if JSON report exists
JSON_REPORT="$RESULTS_DIR/poa-results-$TIMESTAMP.json"
if [ -f "$JSON_REPORT" ]; then
    # Extract key metrics from JSON (requires jq, fallback to basic parsing)
    if command -v jq > /dev/null; then
        TOTAL_TESTS=$(jq '.stats.tests' "$JSON_REPORT")
        PASSED_TESTS=$(jq '.stats.expected' "$JSON_REPORT")
        FAILED_TESTS=$(jq '.stats.unexpected' "$JSON_REPORT")
        SKIPPED_TESTS=$(jq '.stats.skipped' "$JSON_REPORT")
    else
        # Basic fallback parsing
        TOTAL_TESTS=$(grep -o '"tests":[0-9]*' "$JSON_REPORT" | cut -d: -f2 || echo "N/A")
        PASSED_TESTS=$(grep -o '"expected":[0-9]*' "$JSON_REPORT" | cut -d: -f2 || echo "N/A")
        FAILED_TESTS=$(grep -o '"unexpected":[0-9]*' "$JSON_REPORT" | cut -d: -f2 || echo "N/A")
        SKIPPED_TESTS=$(grep -o '"skipped":[0-9]*' "$JSON_REPORT" | cut -d: -f2 || echo "N/A")
    fi
else
    TOTAL_TESTS="N/A"
    PASSED_TESTS="N/A"
    FAILED_TESTS="N/A"
    SKIPPED_TESTS="N/A"
fi

# Create summary report
cat > "$RESULTS_DIR/summary-$TIMESTAMP.txt" << EOF
========================================
Say Goodbye POA App - Test Summary
========================================

Test Run: $TIMESTAMP
Duration: ${DURATION}s
Status: $TEST_STATUS
Mode: $MODE

Test Documents:
- Total Available: $TOTAL_COUNT
- Valid Documents: $VALID_COUNT
- Invalid Documents: $INVALID_COUNT

Test Results:
- Total Tests: $TOTAL_TESTS
- Passed: $PASSED_TESTS
- Failed: $FAILED_TESTS
- Skipped: $SKIPPED_TESTS

Reports Generated:
- HTML Report: $REPORT_FILE
- JSON Report: $JSON_REPORT
- Summary: $RESULTS_DIR/summary-$TIMESTAMP.txt

Production Environment:
- URL: $BASE_URL
- Health: $(curl -s "$BASE_URL" > /dev/null && echo "OK" || echo "ERROR")

Test Documents Coverage:
$(ls -la "$TEST_DOCS_DIR" | grep "\.pdf$" | wc -l) PDF files generated
EOF

echo ""
echo -e "${GREEN}📊 Test Summary:${NC}"
cat "$RESULTS_DIR/summary-$TIMESTAMP.txt"

echo ""
echo -e "${BLUE}📁 Files Generated:${NC}"
echo "HTML Report: $REPORT_FILE"
echo "JSON Results: $JSON_REPORT"  
echo "Summary: $RESULTS_DIR/summary-$TIMESTAMP.txt"

# Cleanup temporary config
rm -f playwright.poa.config.js

echo ""
if [ "$TEST_STATUS" = "PASSED" ]; then
    echo -e "${GREEN}🎉 All POA document tests completed successfully!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Check the reports for details.${NC}"
    exit 1
fi
