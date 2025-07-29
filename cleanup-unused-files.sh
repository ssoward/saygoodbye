#!/bin/bash

# Clean up unused scripts and files
# This script removes redundant deployment and documentation files

echo "🧹 Cleaning up unused scripts and files..."

# Remove redundant deployment scripts (keeping only the essential ones)
UNUSED_DEPLOY_SCRIPTS=(
    "deploy-enhanced.sh"
    "deploy.sh" 
    "deploy-production.sh"
    "deployment_complete.sh"
    "deploy.config.sh"
    "deploy.config.js"
    "emergency-fix.sh"
    "start-backend.sh"
)

# Remove redundant documentation files (keeping README.md and essential docs)
UNUSED_DOCS=(
    "CLEANUP_ANALYSIS.md"
    "CLEANUP_COMPLETE.md"
    "DEMO_USERS_ADDED.md"
    "DEPLOYMENT.md"
    "DEPLOYMENT_COMPLETE.md"
    "DEPLOYMENT_GUIDE.md"
    "DEPLOYMENT_LESSONS.md"
    "DEPLOYMENT_SUCCESS.md"
    "DEPLOYMENT_SUMMARY.md"
    "DEVELOPMENT.md"
    "ENHANCED_DEPLOY_GUIDE.md"
    "IMPLEMENTATION_COMPLETE.md"
    "POA_TEST_IMPLEMENTATION_COMPLETE.md"
    "PRODUCTION_BUG_FIXES_COMPLETE.md"
    "PRODUCTION_COMPLETION_SUMMARY.md"
    "PRODUCTION_README.md"
    "PRODUCTION_STATUS.md"
    "PRODUCTION_VALIDATION_COMPLETE.md"
    "READY_FOR_PRODUCTION.md"
    "SCALABILITY_IMPLEMENTATION.md"
    "SCALABILITY_PLAN.md"
    "SCANNED_DOCUMENTS_IMPLEMENTATION.md"
    "TEST_RESULTS_SUMMARY.md"
)

# Remove old EC2 and debugging scripts
UNUSED_SCRIPTS=(
    "create-ec2-al2023.sh"
    "create-ec2-instance.sh"
    "create-new-instance.sh"
    "debug-authenticated.js"
    "debug-document-details.js"
    "debug-login.js"
    "debug-production.sh"
    "test-admin-privileges.sh"
    "test-scanned-api.js"
    "update-demo-passwords.js"
    "user-data-al2023.sh"
    "create-demo-users.js"
    "generate-test-pdfs.js"
)

# Remove redundant health and monitoring scripts (keeping essential ones)
UNUSED_MONITORING=(
    "health-check-simple.sh"
    "health-monitor-advanced.sh"
    "health-monitor-comprehensive.sh"
    "health-monitor.sh"
    "setup-monitoring-advanced.sh"
    "setup-monitoring.sh"
    "health-check-quick.sh"
)

# Remove redundant config files
UNUSED_CONFIGS=(
    "ecosystem.config.json"
    "package-node12.json"
    "nginx-saygoodbye.conf"
)

# Function to remove files
remove_files() {
    local files=("$@")
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            echo "  Removing: $file"
            rm "$file"
        fi
    done
}

# Remove unused deployment scripts
echo "📦 Removing unused deployment scripts..."
remove_files "${UNUSED_DEPLOY_SCRIPTS[@]}"

# Remove unused documentation
echo "📄 Removing redundant documentation..."
remove_files "${UNUSED_DOCS[@]}"

# Remove unused scripts
echo "🔧 Removing old scripts..."
remove_files "${UNUSED_SCRIPTS[@]}"

# Remove unused monitoring scripts
echo "📊 Removing redundant monitoring scripts..."
remove_files "${UNUSED_MONITORING[@]}"

# Remove unused config files
echo "⚙️ Removing redundant config files..."
remove_files "${UNUSED_CONFIGS[@]}"

# Remove empty directories in scripts folder if they exist
echo "📁 Cleaning up empty directories..."
if [ -d "scripts" ]; then
    find scripts -type d -empty -delete 2>/dev/null || true
fi

# Remove deploy_package directory if it exists
if [ -d "deploy_package" ]; then
    echo "  Removing: deploy_package/"
    rm -rf "deploy_package"
fi

# Remove test-docs directory if it exists
if [ -d "test-docs" ]; then
    echo "  Removing: test-docs/"
    rm -rf "test-docs"
fi

# Remove test-results directory if it exists  
if [ -d "test-results" ]; then
    echo "  Removing: test-results/"
    rm -rf "test-results"
fi

# Clean up any .DS_Store files
find . -name ".DS_Store" -delete 2>/dev/null || true

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 Essential files kept:"
echo "  - README.md (updated with deployment info)"
echo "  - deploy-local.sh (local development)"
echo "  - quick-deploy-production.sh (production deployment)"
echo "  - manage.sh (project management)"
echo "  - run-poa-tests.sh (testing)"
echo "  - test-scalability.sh (performance testing)"
echo "  - PRD.md (Product Requirements)"
echo "  - POA_Test_Document_Specifications.md (specifications)"
echo "  - PRODUCTION_DEPLOYMENT_SUCCESS.md (latest deployment status)"
echo ""
echo "🗂️ Directory structure cleaned and organized!"
