# Say Goodbye POA Validation System

A production-ready web application for validating Power of Attorney (POA) documents for cremation processes in California, ensuring compliance with California Probate Code.

## 🎉 Production Status: LIVE & OPERATIONAL

✅ **Full Production Deployment**: Successfully deployed and actively running  
✅ **Frontend**: React application with complete UI and defensive error handling  
✅ **Backend**: Complete API server with robust validation and admin privileges  
✅ **Authentication**: Secure JWT-based system with role-based access control  
✅ **Document Processing**: PDF upload, validation, and compliance reporting  
✅ **Admin System**: Unlimited privileges with proper UI indicators  
✅ **Testing**: Comprehensive test suite with 25 POA test documents  
✅ **Monitoring**: Advanced health checks with automated alerts and dashboards  
✅ **Bug Fixes**: All critical production issues resolved (document details, admin limits, 500 errors)

## 🎯 Recent Achievements & Fixes

### Critical Production Issues Resolved ✅
- **Document Details Bug**: Fixed "invalid document id" error when viewing document details
- **Admin Validation Limits**: Eliminated incorrect validation limit warnings for admin users  
- **Frontend 500 Errors**: Enhanced error boundaries and defensive coding throughout
- **Backend Field Mapping**: Corrected _id vs id field inconsistencies between frontend/backend
- **MongoDB ObjectId Validation**: Strengthened parameter validation for all document routes

### System Enhancements ✅
- **Enhanced Deployment**: Automated deployment with comprehensive lessons learned integration
- **Health Monitoring**: Advanced monitoring dashboard with real-time alerts
- **Test Coverage**: Complete POA test suite with 25 documents (13 valid, 12 invalid)
- **Error Handling**: React ErrorBoundary components and defensive null checks
- **Admin Experience**: Proper admin status indicators and unlimited privilege handling

### Deployment Pipeline ✅
- **Zero-Downtime Deployments**: Enhanced scripts with pre/post health checks
- **Automated Rollback**: Built-in rollback capabilities for failed deployments
- **Infrastructure Monitoring**: Disk space, memory, and service health automation
- **Demo User Management**: Automatic creation and validation of all user tiers

**📊 Current Production Metrics:**
- Health Score: 75-100% (varies by component restart cycles)
- Server: AWS EC2 (34.235.117.235) - Amazon Linux 2023
- Backend: PM2 cluster mode with 2 instances
- Database: Local MongoDB 7.0 with automatic fallback
- Frontend: nginx-served React build with security headers

## 🚀 Production Access

### Live Application
**URL**: http://34.235.117.235

### Demo User Credentials
| Role | Email | Password | Tier | Features |
|------|-------|----------|------|----------|
| **Admin** | `admin@demo.com` | `demopass123` | Enterprise | Unlimited access + admin panel |
| **Pro User** | `pro@demo.com` | `demopass123` | Professional | Unlimited validations |
| **Free User** | `user@demo.com` | `demopass123` | Free | 5 validations/month |

### System Health
- **Quick Health Check**: `./health-check-quick.sh`
- **Comprehensive Monitoring**: `./health-monitor-comprehensive.sh`
- **Continuous Monitoring**: `./health-monitor-comprehensive.sh --continuous --alert`

## Project Structure

```
saygoodbye/
├── frontend/                         # ReactJS frontend application
│   ├── src/                         # Source code
│   │   ├── components/              # React components with admin UI enhancements
│   │   ├── contexts/                # React contexts (Auth, Notification)
│   │   ├── pages/                   # Application pages
│   │   ├── utils/                   # Utility functions and API client
│   │   └── __tests__/               # Comprehensive test suite
│   ├── public/                      # Static assets
│   └── package.json                 # Frontend dependencies
├── backend/                          # Node.js backend application
│   ├── src/                         # Source code
│   │   ├── controllers/             # API route controllers
│   │   ├── middleware/              # Express middleware with admin checks
│   │   ├── models/                  # Database models with admin privileges
│   │   ├── routes/                  # API routes
│   │   └── utils/                   # Backend utilities
│   ├── tests/                       # Backend test suite
│   └── package.json                 # Backend dependencies
├── deploy-enhanced.sh                # 🔧 Enhanced deployment script (v3.0)
├── health-check-quick.sh             # 🏥 Quick health validation
├── health-monitor-comprehensive.sh   # 🏥 Comprehensive health monitoring
├── setup-monitoring-advanced.sh      # 📊 Production monitoring setup
├── create-ec2-al2023.sh             # ☁️ EC2 instance creation
├── deploy.config.sh                 # ⚙️ Deployment configuration
├── nginx-saygoodbye.conf            # 🌐 nginx configuration
├── ecosystem.config.json            # 🔄 PM2 configuration
├── playwright.config.js             # 🎭 E2E test configuration
├── playwright.critical.config.js    # 🎯 Critical test configuration
├── PRD.md                           # 📋 Product Requirements Document
├── README.md                        # 📖 Project documentation
└── DEVELOPMENT.md                   # 🛠️ Development setup guide
```

## Features

### Core Functionality
- **Document Validation**: Analyze POA documents for notary acknowledgments, witness signatures, and required verbiage
- **Compliance Checking**: Ensure documents meet California Probate Code requirements for cremation authorization
- **PDF Processing**: Upload, preview, and analyze PDF documents with drag-and-drop interface
- **Real-time Validation**: Immediate feedback on document compliance status

### User Management
- **Tiered Access**: Free, Professional, and Enterprise tiers with different capabilities
- **Secure Authentication**: JWT-based login system with persistent sessions
- **User Dashboard**: Personal dashboard showing validation history and account status
- **Demo Accounts**: Pre-configured users for testing all functionality
- **Profile Management**: Update user information and account settings

### Business Features
- **Case Management**: Integration capabilities for funeral home platforms
- **Batch Processing**: Process multiple documents simultaneously (Professional/Enterprise)
- **Compliance Reports**: Generate detailed PDF reports with validation results
- **Usage Analytics**: Track validation counts and tier-based limits

### Technical Features
- **Responsive Design**: Mobile-friendly interface built with Material-UI
- **File Upload**: Drag-and-drop file upload with validation
- **Error Handling**: Comprehensive error handling and user feedback
- **Testing**: Complete test coverage with 29 passing tests

## Tech Stack

### Frontend
- **React 18.x** - Modern React with hooks and functional components
- **React Router v6** - Client-side routing and navigation
- **Material-UI (MUI)** - Component library for consistent UI design
- **Axios** - HTTP client for API communication
- **React Dropzone** - File upload with drag-and-drop functionality
- **React Testing Library** - Comprehensive testing framework
- **Jest** - JavaScript testing framework

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database for user and document data
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **Multer** - File upload handling
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

### Development Tools
- **VS Code** - Development environment with configured tasks
- **ESLint** - Code linting and style enforcement
- **Prettier** - Code formatting
- **Git** - Version control

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- Redis
- Google Cloud account (for OCR)
- Stripe account (for payments)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd saygoodbye
```

2. Install dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables
```bash
# Copy example environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

4. Start the development servers
```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm start
```

## 🚀 Deployment

### Automated Production Deployment

Deploy to AWS EC2 with our enhanced deployment script:

```bash
# Deploy everything (recommended)
./deploy-enhanced.sh all

# Deploy only backend
./deploy-enhanced.sh backend

# Deploy only frontend
./deploy-enhanced.sh frontend
```

**The enhanced deployment script includes:**
- ✅ Automatic disk space management and EBS volume resizing
- ✅ Local MongoDB setup with fallback from Atlas
- ✅ Frontend file permissions and nginx configuration fixes
- ✅ Demo user creation with proper password validation
- ✅ Comprehensive health checks and rollback capabilities

### Create New EC2 Instance

```bash
# Create new Amazon Linux 2023 instance with automatic configuration
./create-ec2-al2023.sh
```

### Health Monitoring

```bash
# Check system health
./health-check-simple.sh

# Setup automated monitoring (runs every 5 minutes)
./setup-monitoring.sh

# View continuous health logs
tail -f /tmp/saygoodbye-health.log
```

**Health Check Coverage:**
- ✅ Frontend accessibility and content validation
- ✅ Backend API health and authentication endpoints
- ✅ PM2 process management
- ✅ MongoDB connection and status
- ✅ Nginx configuration and status
- ✅ System resources (disk and memory usage)

### Production Configuration

The enhanced production deployment (v3.0) automatically handles all lessons learned:

#### 🔧 Infrastructure Management
1. **Disk Space**: Monitors and auto-resizes EBS volumes (minimum 3GB free)
2. **Dependencies**: Installs Node.js 18+, PM2, nginx, MongoDB 7.0
3. **Services**: Configures nginx proxy, PM2 process management with restart policies
4. **Security**: Sets up proper nginx security headers and CORS configuration

#### 👥 User Management
1. **Demo Users**: Creates test accounts for all tiers with proper validation
2. **Admin Privileges**: Ensures admin users have unlimited access (-1 validations/month)
3. **Authentication**: Validates JWT tokens and auth middleware functionality
4. **Password Security**: Uses bcrypt with 12-round salt for password hashing

#### 🛡️ Application Safety
1. **Frontend Defensive Coding**: Prevents runtime errors with null/undefined checks
2. **Backend Error Handling**: Comprehensive error handling and logging
3. **Database Reliability**: Local MongoDB preferred over Atlas for stability
4. **File Permissions**: Proper permissions (755 for dirs, 644 for files)

#### 📊 Monitoring & Validation
1. **Pre-Deployment Tests**: Validates current production before changes
2. **Post-Deployment Tests**: Confirms successful deployment
3. **Health Monitoring**: Comprehensive system health scoring (0-100%)
4. **Performance Tracking**: Response time and resource utilization metrics

**Current Production Server:** `34.235.117.235`

### Deployment Commands

```bash
# Full production deployment with all validations
./deploy-enhanced.sh all

# Backend-only deployment
./deploy-enhanced.sh backend

# Frontend-only deployment  
./deploy-enhanced.sh frontend

# Skip tests (not recommended for production)
./deploy-enhanced.sh all --skip-tests
```

### Post-Deployment Validation

The deployment script automatically validates:
- ✅ All services running (nginx, PM2, MongoDB)
- ✅ API endpoints accessible and responding correctly
- ✅ Frontend serving and React app mounting
- ✅ Demo users created with proper privileges
- ✅ Admin user unlimited access configured
- ✅ Database connectivity and data integrity
- ✅ System resources and disk space adequate
- ✅ Security headers and CORS configuration

## 🏥 Health Monitoring

### Comprehensive Monitoring System

The health monitoring system provides two main levels of monitoring:

#### 1. Quick Health Check
```bash
./health-check-quick.sh
```
- 30-second system validation
- Basic service availability check
- Simple pass/fail reporting with health percentage

#### 2. Comprehensive Health Monitor
```bash
./health-monitor-comprehensive.sh
```
- Complete system analysis with detailed scoring
- JSON report generation with historical data
- User flow validation and performance benchmarking
- Automated alerting capabilities

#### 3. Continuous Monitoring
```bash
# Start continuous monitoring with alerts
./health-monitor-comprehensive.sh --continuous --alert --email your-email@domain.com

# Custom monitoring interval (default: 5 minutes)
./health-monitor-comprehensive.sh --continuous --interval 300
```

### Health Scoring System

The comprehensive monitoring system uses a 100-point scoring system:

| Component | Max Score | Weight | Checks |
|-----------|-----------|--------|--------|
| **Frontend** | 30 points | 30% | HTTP response, content validation, React structure |
| **Backend** | 40 points | 40% | API health, authentication, PM2 status |
| **Database** | 20 points | 20% | MongoDB service, connectivity, demo users |
| **Infrastructure** | 10 points | 10% | nginx status, system resources |

#### Health Status Levels
- **🎉 HEALTHY (80-100%)**: All systems operational
- **⚠️ WARNING (60-79%)**: Some issues detected, monitoring required
- **🚨 CRITICAL (0-59%)**: Immediate attention needed

### Automated Monitoring Setup

```bash
# Setup comprehensive monitoring with automated alerts
./setup-monitoring-advanced.sh

# View live monitoring dashboard
ssh -i ~/.ssh/saygoodbye.pem ec2-user@34.235.117.235 "~/monitoring/scripts/dashboard.sh"

# Check monitoring logs
tail -f /tmp/saygoodbye-health-comprehensive.log
```

**Health Check Coverage:**
- ✅ Frontend accessibility and content validation with response time metrics
- ✅ Backend API health and authentication endpoints with performance tracking
- ✅ PM2 process management and backend service status
- ✅ MongoDB connection, service status, and data validation
- ✅ nginx configuration and proxy functionality
- ✅ System resources (disk, memory, CPU usage) with thresholds
- ✅ Demo user functionality and admin privilege validation
- ✅ User flow testing and performance benchmarking

## 🧪 POA Test Documents

### Comprehensive Testing Suite
We provide a complete set of 25 test documents designed to validate all aspects of POA document processing:

- **13 Valid Documents**: Cover various scenarios including different notary types, witness configurations, and legal verbiage
- **12 Invalid Documents**: Test error handling for expired notaries, missing elements, conflicts of interest, and corrupt files

### Quick Testing
```bash
# Generate all 25 test PDFs
node generate-test-pdfs.js

# Run comprehensive test suite
./run-poa-tests.sh 2

# Run quick validation (5 documents)
./run-poa-tests.sh 1

# Test specific scenarios
./run-poa-tests.sh 3  # Valid documents only
./run-poa-tests.sh 4  # Invalid documents only
./run-poa-tests.sh 5  # Performance tests
./run-poa-tests.sh 6  # Security tests
```

### Test Document Coverage
| Category | Count | Purpose |
|----------|-------|---------|
| Valid POAs | 13 | Test successful validation scenarios |
| Invalid POAs | 12 | Test error detection and handling |
| Edge Cases | 5 | Corrupt files, illegible signatures, etc. |
| Performance | 3 | Large files, batch processing |
| Security | 4 | Access controls, tier restrictions |

**📁 Test Documents Location**: [`test-docs/`](test-docs/) - Complete documentation and test files  
**📋 Test Specifications**: [`POA_Test_Document_Specifications.md`](POA_Test_Document_Specifications.md) - Detailed test case matrix
