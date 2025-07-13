# File Cleanup Analysis

## 🗂️ CURRENT FILES CATEGORIZATION

### ✅ KEEP - Core Production Files
- `deploy-enhanced.sh` - Main deployment script (v3.0)
- `deploy.config.sh` - Deployment configuration
- `health-check-quick.sh` - Quick health validation  
- `health-monitor-comprehensive.sh` - Comprehensive health monitoring
- `nginx-saygoodbye.conf` - nginx configuration
- `ecosystem.config.json` - PM2 configuration
- `README.md` - Main documentation
- `PRD.md` - Product Requirements Document
- `playwright.config.js` - E2E test configuration
- `playwright.critical.config.js` - Critical test configuration

### ✅ KEEP - Infrastructure Scripts
- `create-ec2-al2023.sh` - EC2 instance creation
- `user-data-al2023.sh` - EC2 user data script
- `setup-monitoring-advanced.sh` - Monitoring setup

### 🧹 REMOVE - Duplicate/Obsolete Files
- `deploy.sh` - Old deployment script (replaced by deploy-enhanced.sh)
- `deploy.config.js` - JavaScript version (we use .sh version)
- `deploy.config.sh.bak` - Backup file
- `health-check-simple.sh` - Superseded by health-check-quick.sh
- `health-monitor-advanced.sh` - Superseded by comprehensive version
- `health-monitor.sh` - Old version
- `setup-monitoring.sh` - Superseded by advanced version

### 🧹 REMOVE - Development/Debug Files
- `debug-login.js`
- `debug-dashboard.js`
- `debug-test.js`
- `debug-test2.js`
- `debug-screenshot.png`
- `create-demo-users.js` - Functionality moved to deploy script
- `update-demo-passwords.js` - One-time use script

### 🧹 REMOVE - Obsolete EC2 Scripts
- `create-ec2-instance.sh` - Old version
- `create-new-instance.sh` - Duplicate

### 🧹 REMOVE - Backup Files
- `playwright.config.js.bak`
- `playwright.critical.config.js.bak`
- `package-node12.json` - Old Node.js version config

### 🧹 REMOVE - Obsolete Documentation
- `DEMO_USERS_ADDED.md` - Info now in PRD.md
- `DEPLOYMENT.md` - Replaced by PRD.md
- `ENHANCED_DEPLOY_GUIDE.md` - Info now in PRD.md
- `PRODUCTION_DEPLOYMENT_SUCCESS.md` - One-time status file
- `PRODUCTION_STATUS.md` - Superseded by health monitoring
- `PRODUCTION_VALIDATION_COMPLETE.md` - One-time status file
- `TEST_RESULTS_SUMMARY.md` - Old test results

### 🧹 REMOVE - Test Files
- `test-document.txt`
- `test-download.pdf` 
- `test-report.pdf`
- `test.pdf`

### 📋 KEEP - Generated/Runtime Files (Don't delete)
- `health-report-*.txt` - Historical health reports
- `health-reports/` - Health report directory
- `test-results/` - Test result archives
- `playwright-report/` - Test report HTML
- `node_modules/` - Dependencies
- `package-lock.json` - Dependency lock file
